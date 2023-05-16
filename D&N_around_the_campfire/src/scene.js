import {vec3, vec4, mat3, mat4} from "../lib/gl-matrix_3.3.0/esm/index.js"
import {mat4_to_string, vec_to_string, mat4_matmul_many} from "./icg_math.js"

import {icg_mesh_make_uv_sphere, icg_mesh_load_obj_into_regl, mesh_upload_to_buffer} from "./icg_mesh.js"
import {load_image, load_text, load_texture} from "./icg_web.js"


export function init_scene(regl, resources) {

	const ambient_pass_pipeline = regl({
		attributes: {
			position: regl.prop('mesh.vertex_positions'),
			color:    regl.prop('mesh.vertex_color'),
		},
		// Faces, as triplets of vertex indices
		elements: regl.prop('mesh.faces'),

		// Uniforms: global data available to the shader
		uniforms: {
			mat_mvp:     regl.prop('mat_mvp'),
			light_color: regl.prop('ambient_light_color'),
		},	

		vert: resources.shader_ambient_vert,
		frag: resources.shader_ambient_frag,

		cull: {enable: false},
	});
	
	function update_simulation(scene_info) {
		scene_info.actors.forEach(actor => {
			if (actor.animation_tick) {
				actor.animation_tick(actor, scene_info);
			}
		});
	}

	function render_ambient({actors, mat_view, mat_projection, ambient_light_color}) {
		const batch_draw_calls = actors.map((actor) => {
			const mat_model      = actor.mat_model;
			const mat_mvp        = mat4.create();
			const mat_model_view = mat4.create();

			mat4_matmul_many(mat_model_view, mat_view, mat_model);
			mat4_matmul_many(mat_mvp, mat_projection, mat_model_view);

			return {
				mesh:        actor.mesh,
				mat_mvp:     mat_mvp,
				ambient_light_color: ambient_light_color,
			}
		});

		ambient_pass_pipeline(batch_draw_calls);
	};

	const scene_actors = [
		{ // static part of scene
			mesh:      resources.mesh_terrain,
			mat_model: mat4.create(),
		},
		{ // rotating ring of objects
			mesh: resources.mesh_wheel,
			mat_model: mat4.create(),
			animation_tick: (actor, {sim_time}) => {
				actor.mat_model = mat4.fromZRotation(mat4.create(), sim_time * 0.1);
			},
		},
	];

	return {
		actors: scene_actors,
		update_simulation,
		render_ambient,
	}
}


/*
	Construct textures for basic colors.
*/
function textures_construct(regl, resources) {
	
	const make_texture_from_color = (color) => {
		const c = vec3.scale([0, 0, 0], color, 255)

		return regl.texture({
			data: [
				[c, c],
				[c, c],
			],
			colorType: 'uint8',
		})
	}

	resources['tex_red'] = make_texture_from_color([0.7, 0.15, 0.05])
	resources['tex_gold'] = make_texture_from_color([0.7, 0.5, 0.0])
	resources['tex_blue'] = make_texture_from_color([0.1, 0.5, 0.7])
	resources['tex_gray'] = make_texture_from_color([0.4, 0.4, 0.4])
}

function meshes_construct(regl, resources) {
	// The sphere mesh is generated by code rather than loaded from a file
	resources.mesh_sphere = mesh_upload_to_buffer(regl, icg_mesh_make_uv_sphere(16))

	// A simple square mesh for the floor
	resources.mesh_floor = mesh_upload_to_buffer(regl, {
		// Corners of the floor
		vertex_positions: [
			[-1, -1, 0],
			[ 1, -1, 0],
			[ 1,  1, 0],
			[-1,  1, 0],
		],
		// The normals point up
		vertex_normals: [
			[0, 0, 1],
			[0, 0, 1],
			[0, 0, 1],
			[0, 0, 1],
		],
		/*
		#TODO GL3.1.2: Adjust the texture coordinates of the floor mesh
				so that the tiles on the floor are repeated 4 times in each direction.
		*/
		vertex_tex_coords: [
			[0, 0],
			[4, 0],
			[4, 4],
			[0, 4],
		],
		faces: [
			[0, 1, 2],
			[0, 2, 3],
		],
	})
}


export async function load_resources(regl) {
	/*
	The textures fail to load when the site is opened from local file (file://) due to "cross-origin".
	Solutions:
	* run a local webserver
		caddy file-server -browse -listen 0.0.0.0:8000
		# or
		python -m http.server 8000
		# open localhost:8000
	OR
	* run chromium with CLI flag
		"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --allow-file-access-from-files index.html
		
	* edit config in firefox
		security.fileuri.strict_origin_policy = false
	*/

	// Start downloads in parallel
	const resource_promises = {}
	
/*	const textures_to_load = [
		'outdoor_umbrellas_2k.webp',
		'venice_sunrise_2k.webp',
	]
	for(const texture_name of textures_to_load) {
		resource_promises[texture_name] = load_texture(regl, `./textures/${texture_name}`)
	}

	*/
	/* #TODO GL3.1.2: Set the texture options of the tile texture so that it repeats.
		Consider the 'wrap' option described here:
		https://github.com/regl-project/regl/blob/master/API.md#textures
	*/
	/*const tex_load_options = {
		wrap: 'repeat'
	}
	const scene_tex_name = 'Compgraph.mtl'
	resource_promises[scene_tex_name] = load_texture(regl, `./meshes/${scene_tex_name}`, tex_load_options)*/

	// We load cube sides as images because we will put them into the cubemap constructor
	for(let cube_side_idx = 0; cube_side_idx < 6; cube_side_idx++) {
		const texture_name = `cube_side_${cube_side_idx}.png`
		resource_promises[texture_name] = load_image(`./textures/${texture_name}`)
	}

	resource_promises['clouds'] = load_texture(regl, './textures/clouds.jpg', {
		wrap: 'repeat'
	})
	resource_promises['text_scene'] = load_texture(regl, './textures/Merged_document.png')

	const shaders_to_load = [
		'phong_shadow.vert.glsl', 'phong_shadow.frag.glsl',
		'cubemap_visualization.vert.glsl', 'cubemap_visualization.frag.glsl',
		'unshaded.vert.glsl', 'unshaded.frag.glsl',
		'shadowmap_gen.vert.glsl', 'shadowmap_gen.frag.glsl',
		'sky.vert.glsl', 'sky.frag.glsl',
		'fireupdate.vert.glsl', 'fireupdate.frag.glsl',
		'firedraw.vert.glsl', 'firedraw.frag.glsl',
	]
	for(const shader_name of shaders_to_load) {
		resource_promises[shader_name] = load_text(`./src/shaders/${shader_name}`)
	}

	const meshes_to_load = [
		"Compgraph_template.obj",
	]
	for(const mesh_name of meshes_to_load) {
		resource_promises[mesh_name] = icg_mesh_load_obj_into_regl(regl, `./meshes/${mesh_name}`)
	}

	// Wait for all downloads to complete
	const resources = {}
	for (const [key, promise] of Object.entries(resource_promises)) {
		resources[key] = await promise
	}

	// Resources which are not loaded from files but created in code
	textures_construct(regl, resources)
	meshes_construct(regl, resources)

	return resources
}

export function create_scene_content_shadows() {

	const actors = [

		
		{
			translation: [0., 0., 10.],

			light: {
				color: [1., 0.8, 0.7],
				intensity: 100.,
			},
			
		},
		
		{
			translation: [40., 0., 0.],

			light: {
				color: [1., 0.8, 0.7],
				intensity: 1000.,
			},

			orbit: {
				anchor: [0., 0., 0.],
				axis: [0., 1., 0.],
				radius: 50.,
				angular_velocity: 1.,
			},
		},

		{
			translation: [0., 0., 0.],
			scale: [10., 10., 10.],
					
			mesh: 'Compgraph_template.obj',
			material: {
				texture: 'text_scene',
			}
		},

		/*{
			translation: [0., 0., 0.],
			scale: [100., 100., 100.],
					
			mesh: 'mesh_sphere',
			material: {
				texture: 'tex_blue',
				mask: 'tex_blue',
			}
		}*/


	]

	// In each planet, allocate its transformation matrix
	for(const actor of actors) {
		actor.mat_model_to_world = mat4.create()
	}

	// Construct scene info
	return {
		sim_time: 0.,
		actors: actors,
	}
}



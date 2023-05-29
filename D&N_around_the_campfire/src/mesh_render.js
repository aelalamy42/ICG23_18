import { vec2, vec3, mat3, mat4 } from "../lib/gl-matrix_3.3.0/esm/index.js"
import { cross, length, dot, random } from "../lib/gl-matrix_3.3.0/esm/vec3.js";
import { mat4_matmul_many } from "./icg_math.js"
import { EnvironmentCapture } from "./env_capture.js"

/*
	Draw meshes with a simple pipeline
	Subclasses override the name of shader to use
*/
class SysRenderMeshes {
	static shader_name = 'ENTER SHADER NAME'

	constructor(regl, resources) {
		// Keep a reference to textures
		this.resources = resources
		this.regl = regl
	}

	get_resource_checked(shader_name) {
		const shader_text = this.resources[shader_name]
		if (shader_text === undefined) {
			throw new ReferenceError(`No resource ${shader_name}`)
		}
		return shader_text
	}

	init() {
		this.init_pipeline(this.regl)
	}

	pipeline_uniforms(regl) {
		return {
			mat_mvp: regl.prop('mat_mvp'),
			mat_model_view: regl.prop('mat_model_view'),
			mat_normals_to_view: regl.prop('mat_normals_to_view'),

			light_position: regl.prop('light_position'),
			light_color: regl.prop('light_color'),

			tex_color: regl.prop('material.texture'),

			color_factor: 1.,
		}
	}

	init_pipeline(regl) {
		const shader_name = this.constructor.shader_name

		console.log('Compiling shaders: ', shader_name)

		this.pipeline = regl({
			attributes: {
				vertex_position: regl.prop('mesh.vertex_positions'),
				vertex_normal: regl.prop('mesh.vertex_normals'),
				vertex_tex_coords: regl.prop('mesh.vertex_tex_coords'),
			},
			// Faces, as triplets of vertex indices
			elements: regl.prop('mesh.faces'),

			// Uniforms: global data available to the shader
			uniforms: this.pipeline_uniforms(regl),

			//cull: { enable: true }, // don't draw back faces

			vert: this.get_resource_checked(`${shader_name}.vert.glsl`),
			frag: this.get_resource_checked(`${shader_name}.frag.glsl`),
		})
	}

	check_scene(scene_info) {
		// check if all meshes are loaded
		for (const actor of scene_info.actors) {
			if (actor.mesh) {
				this.get_resource_checked(actor.material.texture)
			}
		}
	}

	make_transformation_matrices(frame_info, actor) {
		const { mat_projection, mat_view } = frame_info

		// Construct mat_model_to_world from translation and sclae
		// If we wanted to have a rotation too, we'd use mat4.fromRotationTranslationScale
		mat4.fromScaling(actor.mat_model_to_world, actor.scale)
		mat4.translate(actor.mat_model_to_world, actor.mat_model_to_world, actor.translation)

		const mat_model_view = mat4.create()
		const mat_mvp = mat4.create()
		const mat_normals_to_view = mat3.create()
		mat3.identity(mat_normals_to_view)

		/* #TODO GL3.0 Copy mat_model_view, mat_mvp, mat_normals_to_view from GL2.2.2*/
		// calculate mat_model_view, mat_mvp, mat_normals_to_view 
		mat4_matmul_many(mat_mvp, mat_projection, mat_view, actor.mat_model_to_world);
		mat4_matmul_many(mat_model_view, mat_view, actor.mat_model_to_world)
		mat3.fromMat4(mat_normals_to_view, mat_model_view)
		mat3.transpose(mat_normals_to_view, mat_normals_to_view)
		mat3.invert(mat_normals_to_view, mat_normals_to_view)

		return { mat_model_view, mat_mvp, mat_normals_to_view }
	}

	render(frame_info, scene_info) {
		/* 
		We will collect all objects to draw with this pipeline into an array
		and then run the pipeline on all of them.
		This way the GPU does not need to change the active shader between objects.
		*/
		const entries_to_draw = []

		// Read frame info
		const { mat_projection, mat_view, light_position_cam, light_color } = frame_info

		// For each planet, construct information needed to draw it using the pipeline
		for (const actor of scene_info.actors) {

			// skip objects with reflections
			if (!actor.mesh || actor.material.mirror) {
				continue
			}

			const { mat_model_view, mat_mvp, mat_normals_to_view } = this.make_transformation_matrices(frame_info, actor)

			entries_to_draw.push({
				mesh: this.resources[actor.mesh],
				mat_mvp: mat_mvp,
				mat_model_view: mat_model_view,
				mat_normals_to_view: mat_normals_to_view,

				light_position: light_position_cam,
				light_color: light_color,

				material: {
					texture: this.resources[actor.material.texture],
				},
			})
		}

		// Draw on the GPU
		this.pipeline(entries_to_draw)
	}
}

export class SysRenderTextured extends SysRenderMeshes {
	static shader_name = 'unshaded'
}

export class SysRenderSky extends SysRenderMeshes {
	static shader_name = 'sky'

	pipeline_uniforms(regl) {
		return {
			mat_mvp: regl.prop('mat_mvp'),
			mat_model_view: regl.prop('mat_model_view'),
			mat_normals_to_view: regl.prop('mat_normals_to_view'),

			light_position: regl.prop('light_position'),
			light_color: regl.prop('light_color'),

			tex_color: regl.prop('material.texture'),

			sim_time: regl.prop('sim_time'),
		}
	}

	render(frame_info, scene_info) {
		/* 
		We will collect all objects to draw with this pipeline into an array
		and then run the pipeline on all of them.
		This way the GPU does not need to change the active shader between objects.
		*/
		const entries_to_draw = []

		// Read frame info
		const { light_position_cam, light_color } = frame_info

		// For each planet, construct information needed to draw it using the pipeline
		for (const actor of scene_info.actors) {

			// skip objects with reflections
			if (!actor.mesh || actor.material.mirror) {
				continue
			}

			const { mat_model_view, mat_mvp, mat_normals_to_view } = this.make_transformation_matrices(frame_info, actor)

			entries_to_draw.push({
				mesh: this.resources[actor.mesh],
				mat_mvp: mat_mvp,
				mat_model_view: mat_model_view,
				mat_normals_to_view: mat_normals_to_view,

				light_position: light_position_cam,
				light_color: light_color,

				sim_time: scene_info.sim_time,

				material: {
					texture: this.resources[actor.material.texture],
				},
			})
		}

		// Draw on the GPU
		this.pipeline(entries_to_draw)
	}

}

export class SysRenderMeshesWithLight extends SysRenderMeshes {
	static shader_name = 'unshaded'

	init() {
		this.env_capture = new EnvironmentCapture(this.regl, this.resources)
		this.env_capture.visualization_color_factor = 0.05

		super.init()
	}

	pipeline_uniforms(regl) {
		return {
			mat_mvp: regl.prop('mat_mvp'),
			mat_model_view: regl.prop('mat_model_view'),
			mat_normals_to_view: regl.prop('mat_normals_to_view'),

			light_position: regl.prop('light_position'),
			light_color: regl.prop('light_color'),

			tex_color: regl.prop('material.texture'),
			cube_shadowmap: this.env_capture.env_cubemap,

			color_factor: 0.1, // ambient component
		}
	}

	init_pipeline(regl) {
		super.init_pipeline(regl) // init the ambient pass

		let shader_name = 'phong_shadow'
		console.log('Compiling shader', shader_name)
		this.pipeline_phong_contribution = regl({
			attributes: {
				vertex_position: regl.prop('mesh.vertex_positions'),
				vertex_normal: regl.prop('mesh.vertex_normals'),
				vertex_tex_coords: regl.prop('mesh.vertex_tex_coords'),
			},
			// Faces, as triplets of vertex indices
			elements: regl.prop('mesh.faces'),

			// Uniforms: global data available to the shader
			uniforms: this.pipeline_uniforms(regl),

			cull: { enable: true }, // don't draw back faces

			// blend mode
			// The depth buffer needs to be filled before calling this pipeline,
			// otherwise our additive blending mode can accumulate contributions
			// from fragments that should be invisible.
			// (The depth buffer is filled by the ambient pass.)
			depth: {
				enable: true,
				mask: true,
				func: '<=',
			},

			/* #TODO GL3.3.2
				change the blend options
			*/
			blend: {
				enable: true,
				func: {
					src: 'one',
					dst: 'one',
				},
			},


			vert: this.get_resource_checked(`${shader_name}.vert.glsl`),
			frag: this.get_resource_checked(`${shader_name}.frag.glsl`),
		})


		this.pipeline_shadowmap = regl({
			attributes: {
				vertex_position: regl.prop('mesh.vertex_positions'),
			},
			// Faces, as triplets of vertex indices
			elements: regl.prop('mesh.faces'),

			// Uniforms: global data available to the shader
			uniforms: {
				mat_mvp: regl.prop('mat_mvp'),
				mat_model_view: regl.prop('mat_model_view'),
			},

			vert: this.get_resource_checked(`shadowmap_gen.vert.glsl`),
			frag: this.get_resource_checked(`shadowmap_gen.frag.glsl`),
		})

	}

	render_shadowmap(frame_info, scene_info) {

		const entries_to_draw = []

		for (const actor of scene_info.actors) {

			// skip objects with no mesh or no reflections
			if (!actor.mesh || actor.material.mirror) {
				continue
			}

			const { mat_model_view, mat_mvp, mat_normals_to_view } = this.make_transformation_matrices(frame_info, actor)

			entries_to_draw.push({
				mesh: this.resources[actor.mesh],
				mat_mvp: mat_mvp,
				mat_model_view: mat_model_view,
			})
		}

		this.pipeline_shadowmap(entries_to_draw)
	}

	render_light_contributions(frame_info, scene_info, light_position_cam, light_color) {
		const entries_to_draw = []

		// Read frame info

		// For each planet, construct information needed to draw it using the pipeline
		for (const actor of scene_info.actors) {

			// skip objects with reflections
			if (!actor.mesh || actor.material.mirror) {
				continue
			}

			const { mat_model_view, mat_mvp, mat_normals_to_view } = this.make_transformation_matrices(frame_info, actor)

			entries_to_draw.push({
				mesh: this.resources[actor.mesh],
				mat_mvp: mat_mvp,
				mat_model_view: mat_model_view,
				mat_normals_to_view: mat_normals_to_view,

				light_position: light_position_cam,
				light_color: light_color,

				material: {
					texture: this.resources[actor.material.texture],
				},
			})
		}

		// Draw on the GPU
		this.pipeline_phong_contribution(entries_to_draw)
	}

	render(frame_info, scene_info) {
		const { mat_projection, mat_view } = frame_info

		// draw ambient pass without shading
		super.render(frame_info, scene_info)

		for (const light_actor of scene_info.actors) {
			// skip objects with no light
			if (!light_actor.light) {
				continue
			}

			// capture the shadowmap from this actor's point of view
			this.env_capture.capture_scene_cubemap(frame_info, scene_info, light_actor.translation, (frame_info, scene_info) => {
				this.render_shadowmap(frame_info, scene_info)
			})
			let alpha = 1.;
			if(light_actor.light.fire){ // If the light is associated with a fire, make it appear and disappear with the fire.
				alpha = Math.atan(5. * Math.sin(scene_info.sim_time))/Math.atan(5.)
			}
			const light_position_cam = vec3.transformMat4([0., 0., 0.], light_actor.translation, mat_view)
			const light_color = vec3.scale([0, 0, 0], light_actor.light.color, light_actor.light.intensity * (alpha + 1)/2)

			this.render_light_contributions(frame_info, scene_info, light_position_cam, light_color)
		}

		// Draw on the GPU
	}
}

export class SysRenderParticles extends SysRenderMeshes {

}

export class SysRenderParticlesFire extends SysRenderMeshes {
	static shader_name = 'fire'

	init_pipeline(regl) {
		this.mat_mvp = mat4.create();
		this.mat_model_to_world = mat4.create();
		this.mat_scale = mat4.fromScaling(mat4.create(), [3.,3.,3.]);

		// initial particles state and texture for buffer
		// multiply by 4 for R G B A
		const sqrtNumParticles = 65;
		const numParticles = sqrtNumParticles * sqrtNumParticles;
		this.pointWidth = 40;
		const initialParticleState = new Float32Array(numParticles * 4); 
		// THIS DEFINES THE STATE OF EACH PARTICLE AT THE BEGINNING OF THE RENDERING.
		for (let i = 0; i < numParticles; ++i) {
			const r = Math.sqrt(Math.random());
			const theta = Math.random() * 2 * Math.PI;
			initialParticleState[i * 4] = r * Math.cos(theta); // x position
			initialParticleState[i * 4 + 1] = r * Math.sin(theta);// y position
			initialParticleState[i * 4 + 2] = 0.; // z position
			initialParticleState[i * 4 + 3] = 0.; // age 
		}

		// Lifetime information
		const initialParticleLifetime = new Float32Array(numParticles * 4);
		for (let i = 0; i < numParticles; ++i) {
			initialParticleLifetime[i * 4] = Math.random() * 3 + 1; // lifetime
			initialParticleLifetime[i * 4 + 1] = Math.random() * 8; // start time
		}

		// create a regl framebuffer holding the initial particle state and/or lifetime info.
		function createInitialParticleBuffer(initialParticleState) {
			const initialTexture = regl.texture({
				data: initialParticleState,
				shape: [sqrtNumParticles, sqrtNumParticles, 4],
				type: 'float'
			});

			// create a frame buffer using the state as the colored texture
			return regl.framebuffer({
				color: initialTexture,
				depth: false,
				stencil: false,
			});
		}

		// initialize particle states
		let prevParticleState = createInitialParticleBuffer(initialParticleState);
		let currParticleState = createInitialParticleBuffer(initialParticleState);
		let nextParticleState = createInitialParticleBuffer(initialParticleState);

		// initialize particle lifetime info
		let particleLifetimeInfo = createInitialParticleBuffer(initialParticleState);

		// cycle buffers so that we can advance from next to current etc...
		function cycleParticleStates() {
			const tmp = prevParticleState;
			prevParticleState = currParticleState;
			currParticleState = nextParticleState;
			nextParticleState = tmp;
		}

		// create array of indices into the particle texture so that each particle has a unique index.
		const particleTextureIndex = [];
		for (let i = 0; i < sqrtNumParticles; i++) {
			for (let j = 0; j < sqrtNumParticles; j++) {
				particleTextureIndex.push(i / (sqrtNumParticles), j / (sqrtNumParticles));
			}
		}
		

		const shader_name = this.constructor.shader_name

		console.log('Compiling shaders: ', shader_name)
		const drawParticles = regl({
			attributes: {
				particleTextureIndex,
			},

			primitive: 'points',
			count: numParticles,

			depth: {
				enable: true,
				mask: false,
			},

			uniforms: {
				pointWidthFactor: regl.prop('width_factor'),
				particleState: () => currParticleState, // important to use a function here. Otherwise it would cache the buffer and not use the updated one.
				particleLifetime: particleLifetimeInfo,
				mat_mvp: regl.prop('mat_mvp'),
				u_time: regl.prop('u_time'),
			},

			blend: {
				enable: true,
				func: {
					src: 'src alpha',
					dst: 'one minus src alpha',
				},
				equation: {
					rgb: 'add',
					alpha: 'add'
				},
				color: [0., 0., 0., 0.],
			},

			vert: this.get_resource_checked(`${shader_name}draw.vert.glsl`),
			frag: this.get_resource_checked(`${shader_name}draw.frag.glsl`),
		})

		const updateParticles = regl({
			//IMPORTANT : Write to a framebuffer, not to the screen!!!
			framebuffer: () => nextParticleState,

			attributes: {
				position: [
					-4, 0,
					4, 4,
					4, -4
				]
			},

			// pass previous states to update from
			uniforms: {
				currParticleState: () => currParticleState,
				prevParticleState: () => prevParticleState,
				particleLifetime: particleLifetimeInfo,
				u_time: regl.prop('u_time'),
			},

			// We create a triangle big enough to fit the whole screen, so that our update info is actually written onto the buffer.
			count: 3,

			vert: this.get_resource_checked(`${shader_name}update.vert.glsl`),
			frag: this.get_resource_checked(`${shader_name}update.frag.glsl`),
		});

		this.pipeline = (frame_info, cinema_mode) => {

			drawParticles({
				mat_mvp: this.mat_mvp,
				u_time : frame_info.sim_time,
				width_factor: cinema_mode ? 10 / (length(frame_info.camera_position)) : 1 / (frame_info.cam_distance_factor),
			});

			updateParticles({
				u_time : frame_info.sim_time,
			});

			cycleParticleStates();

		};


	}

	calculate_model_matrix() {
		// Compute the this.mat_model_to_world, which puts the particles at the right places.
		mat4.identity(this.mat_model_to_world);
		const translation = mat4.fromTranslation(mat4.create, [-0.1, 0., 1.]);
		mat4_matmul_many(this.mat_model_to_world, mat4.create(), this.mat_scale, translation);

	}

	render(frame_info, cinema_mode) {
		const { mat_projection, mat_view } = frame_info
		this.calculate_model_matrix();
		mat4_matmul_many(this.mat_mvp, mat_projection, mat_view, this.mat_model_to_world);
		this.pipeline(frame_info, cinema_mode);
	}

}

export class SysRenderParticlesCloud extends SysRenderMeshes {
	static shader_name = 'cloud'

	init_pipeline(regl) {
		this.mat_mvp = mat4.create();
		this.mat_model_to_world = mat4.create();
		this.mat_scale = mat4.fromScaling(mat4.create(), [30.,30.,30.]);

		// initial particles state and texture for buffer
		// multiply by 4 for R G B A
		const sqrtNumParticles = 15;
		const numParticles = sqrtNumParticles * sqrtNumParticles;
		this.pointWidth = 900;
		// THIS DEFINES THE STATE OF EACH PARTICLE AT THE BEGINNING OF THE RENDERING.
		const initialParticleState = new Float32Array(numParticles * 4);
		for (let i = 0; i < numParticles; ++i) {
			const r = Math.sqrt(Math.random());
			const theta = Math.random() * 2 * Math.PI;

			initialParticleState[i * 4] = r * Math.cos(theta); // x position
			initialParticleState[i * 4 + 1] = r * Math.sin(theta); // y position
			initialParticleState[i * 4 + 2] = Math.random()*0.01; // z position
		}

		// create a regl framebuffer holding the initial particle state
		function createInitialParticleBuffer(initialParticleState) {
			const initialTexture = regl.texture({
				data: initialParticleState,
				shape: [sqrtNumParticles, sqrtNumParticles, 4],
				type: 'float'
			});

			// create a frame buffer using the state as the colored texture
			return regl.framebuffer({
				color: initialTexture,
				depth: false,
				stencil: false,
			});
		}

		// initialize particle states
		let currParticleState = createInitialParticleBuffer(initialParticleState);
		let nextParticleState = createInitialParticleBuffer(initialParticleState);

		// cycle which buffer is being pointed to by the state variables
		function cycleParticleStates() {
			const tmp = currParticleState;
			currParticleState = nextParticleState;
			nextParticleState = tmp;
		}


		// create array of indices into the particle texture so that each particle has a unique index
		const particleTextureIndex = [];
		for (let i = 0; i < sqrtNumParticles; i++) {
			for (let j = 0; j < sqrtNumParticles; j++) {
				particleTextureIndex.push(i / (sqrtNumParticles), j / (sqrtNumParticles));
			}
		}
		const shader_name = this.constructor.shader_name

		console.log('Compiling shaders: ', shader_name)
		const drawParticles = regl({
			attributes: {
				particleTextureIndex,
			},

			primitive: 'points',
			count: numParticles,

			depth: {
				enable: true,
				mask: false,
			},

			uniforms: {
				pointWidth: regl.prop('width_factor'),
				particleState: () => currParticleState, // important to use a function here. Otherwise it would cache and not use the newest buffer.
				mat_mvp: regl.prop('mat_mvp'),
				u_time: regl.prop('u_time'),
			},

			blend: {
				enable: true,
				func: {
					src: 'src alpha',
					dst: 'one minus src alpha',
				},
				equation: {
					rgb: 'add',
					alpha: 'add'
				},
				color: [0., 0., 0., 0.],
			},

			vert: this.get_resource_checked(`${shader_name}draw.vert.glsl`),
			frag: this.get_resource_checked(`${shader_name}draw.frag.glsl`),
		})

		const updateParticles = regl({
			//IMPORTANT : Write to a framebuffer, not to the screen!!!
			framebuffer: () => nextParticleState,

			attributes: {
				position: [
					-4, 0,
					4, 4,
					4, -4
				]
			},

			uniforms: {
				currParticleState: () => currParticleState,
				u_time: regl.prop('u_time'),
			},

			// we create a triangle big enough to fit the whole screen, so that our updates can be written.
			count: 3,

			vert: this.get_resource_checked(`${shader_name}update.vert.glsl`),
			frag: this.get_resource_checked(`${shader_name}update.frag.glsl`),
		});

		this.pipeline = (frame_info, cinema_mode) => {
	
			drawParticles({
				mat_mvp: this.mat_mvp,
				u_time : frame_info.sim_time,
				width_factor: cinema_mode ?  27 * this.pointWidth / length(frame_info.camera_position) : this.pointWidth / frame_info.cam_distance_factor,
			});

			updateParticles({
				u_time : frame_info.sim_time,
			});

			cycleParticleStates();

		};
	}

	calculate_model_matrix() {
		// Compute the this.mat_model_to_world, to place correctly the particles in the scene.
		mat4.identity(this.mat_model_to_world);
		const translation = mat4.fromTranslation(mat4.create(), [0., 0., -0.09]);
		//console.error(camera_position);
		mat4_matmul_many(this.mat_model_to_world, mat4.create(), this.mat_scale, translation);
	}

	render(frame_info, cinema_mode) {
		const { mat_projection, mat_view } = frame_info
		this.calculate_model_matrix();
		mat4_matmul_many(this.mat_mvp, mat_projection, mat_view, this.mat_model_to_world);
		this.pipeline(frame_info, cinema_mode);
	}
}

export class SysRenderParticlesSmoke extends SysRenderMeshes {
	static shader_name = 'smoke'

	init_pipeline(regl) {
		this.mat_mvp = mat4.create();
		this.mat_model_to_world = mat4.create();
		this.mat_scale = mat4.fromScaling(mat4.create(), [1.5,1.5,0.75]);
		// initial particles state and texture for buffer
		// multiply by 4 for R G B A
		const sqrtNumParticles = 64;
		const numParticles = sqrtNumParticles * sqrtNumParticles;
		this.pointWidth = 40; //TODO :try more possibilites
		const initialParticlePosition = new Float32Array(numParticles * 4);
		for (let i = 0; i < numParticles; ++i) {
			const r = Math.sqrt(Math.random());
			const theta = Math.random() * 2 * Math.PI;
			// store x then y and then leave 2 spots empty
			initialParticlePosition[i * 4] = r * Math.cos(theta); // x position
			initialParticlePosition[i * 4 + 1] = r * Math.sin(theta);//2 * Math.random() - 1;// y position
			initialParticlePosition[i * 4 + 2] = 0.; // z position
			initialParticlePosition[i * 4 + 3] = 0.; // age
		}

		const initialParticleState = new Float32Array(numParticles * 4);
		for (let i = 0; i < numParticles; ++i) {
			initialParticleState[i * 4] = Math.random() * 7 + 1; // lifetime
			initialParticleState[i * 4 + 1] = Math.random() * 8; // start time
		}

		// create a regl framebuffer holding the initial particle state
		function createInitialParticleBuffer(initialParticleState) {
			const initialTexture = regl.texture({
				data: initialParticleState,
				shape: [sqrtNumParticles, sqrtNumParticles, 4],
				type: 'float'
			});

			// create a frame buffer using the state as the colored texture
			return regl.framebuffer({
				color: initialTexture,
				depth: false,
				stencil: false,
			});
		}

		// initialize particle positions
		let currParticlePosition = createInitialParticleBuffer(initialParticlePosition);
		let nextParticlePosition = createInitialParticleBuffer(initialParticlePosition);

		// initialize particle lifetime info
		let particleLifetimeInfo = createInitialParticleBuffer(initialParticleState);


		function cycleParticleStates() {
			const tmp = currParticlePosition;
			currParticlePosition = nextParticlePosition;
			nextParticlePosition = tmp;
		}


		// create array of indices into the particle texture so that each particle has a unique index
		const particleTextureIndex = [];
		for (let i = 0; i < sqrtNumParticles; i++) {
			for (let j = 0; j < sqrtNumParticles; j++) {
				particleTextureIndex.push(i / (sqrtNumParticles), j / (sqrtNumParticles));
			}
		}
		const shader_name = this.constructor.shader_name

		console.log('Compiling shaders: ', shader_name)
		const drawParticles = regl({
			attributes: {
				particleTextureIndex,
			},

			primitive: 'points',
			count: numParticles,

			depth: {
				enable: true,
				mask: false,
			},

			uniforms: {
				pointWidth: regl.prop('width_factor'),
				particlePosition: () => currParticlePosition, // important to use a function here. Otherwise it would cache and not use the newest buffer.
				particleLifetime: particleLifetimeInfo,
				mat_mvp: regl.prop('mat_mvp'),
				u_time: regl.prop('u_time'),
			},

			blend: {
				enable: true,
				func: {
					src: 'src alpha',
					dst: 'one minus src alpha',
				},
				equation: {
					rgb: 'add',
					alpha: 'add'
				},
				color: [0., 0., 0., 0.],
			},
			vert: this.get_resource_checked(`${shader_name}draw.vert.glsl`),
			frag: this.get_resource_checked(`${shader_name}draw.frag.glsl`),
		})

		const updateParticles = regl({
			//IMPORTANT : Write to a framebuffer, not to the screen!!!
			framebuffer: () => nextParticlePosition,

			attributes: {
				position: [
					-4, 0,
					4, 4,
					4, -4
				]
			},

			uniforms: {
				currParticleState: () => currParticlePosition,
				particleLifetime: particleLifetimeInfo,
				u_time: regl.prop('u_time'),
			},

			// we create a triangle big enough to fill the screen so that our updates can be written.
			count: 3,

			vert: this.get_resource_checked(`${shader_name}update.vert.glsl`),
			frag: this.get_resource_checked(`${shader_name}update.frag.glsl`),
		});

		this.pipeline = (frame_info, cinema_mode) => {

			drawParticles({
				mat_mvp: this.mat_mvp,
				u_time : frame_info.sim_time ,
				width_factor: cinema_mode ? 20 * this.pointWidth / length(frame_info.camera_position) : 2 * this.pointWidth / frame_info.cam_distance_factor,
			});

			updateParticles({
				u_time : frame_info.sim_time,
			});

			cycleParticleStates();

		};

	}

	calculate_model_matrix() {
		// Compute the this.mat_model_to_world, which places the particles at the right place in our scene.
		mat4.identity(this.mat_model_to_world);
		const translation = mat4.fromTranslation(mat4.create(), [-0.2, 0.1, 3.]);
		mat4_matmul_many(this.mat_model_to_world, mat4.create(), this.mat_scale, translation);

	}

	render(frame_info, cinema_mode) {
		const { mat_projection, mat_view } = frame_info
		this.calculate_model_matrix();
		mat4_matmul_many(this.mat_mvp, mat_projection, mat_view, this.mat_model_to_world);
		this.pipeline(frame_info, cinema_mode);
	}

}


export class SysRenderParticlesFireflies extends SysRenderMeshes {
	static shader_name = 'fireflies'

	init_pipeline(regl) {
		this.mat_mvp = mat4.create();
		this.mat_model_to_world = mat4.create();
		this.mat_scale = mat4.fromScaling(mat4.create(), [3.,3.,1]);
		// initial particles state and texture for buffer
		// multiply by 4 for R G B A
		const sqrtNumParticles = 10;
		const numParticles = sqrtNumParticles * sqrtNumParticles;
		this.pointWidth = 15;
		const initialParticlePosition = new Float32Array(numParticles * 4);
		for (let i = 0; i < numParticles; ++i) {
			const r = Math.sqrt(Math.random());
			const theta = Math.random() * 2 * Math.PI;
			// store x then y and then leave 2 spots empty
			initialParticlePosition[i * 4] = r * Math.cos(theta); // x position
			initialParticlePosition[i * 4 + 1] = r * Math.sin(theta); // y position
			initialParticlePosition[i * 4 + 2] = 0.; // z position
			initialParticlePosition[i * 4 + 3] = 0.; // age
		}

		const initialParticleState = new Float32Array(numParticles * 4);
		for (let i = 0; i < numParticles; ++i) {
			initialParticleState[i * 4] = Math.random() * 6 + 1; // lifetime
			initialParticleState[i * 4 + 1] = Math.random() * 8; // start time
		}

		// create a regl framebuffer holding the initial particle state
		function createInitialParticleBuffer(initialParticleState) {
			const initialTexture = regl.texture({
				data: initialParticleState,
				shape: [sqrtNumParticles, sqrtNumParticles, 4],
				type: 'float'
			});

			// create a frame buffer using the state as the colored texture
			return regl.framebuffer({
				color: initialTexture,
				depth: false,
				stencil: false,
			});
		}

		// initialize particle positions
		let currParticlePosition = createInitialParticleBuffer(initialParticlePosition);
		let nextParticlePosition = createInitialParticleBuffer(initialParticlePosition);

		// initialize particle lifetime info
		let particleLifetimeInfo = createInitialParticleBuffer(initialParticleState);


		// cycle which buffer is being pointed to by the state variables
		function cycleParticleStates() {
			const tmp = currParticlePosition;
			currParticlePosition = nextParticlePosition;
			nextParticlePosition = tmp;
		}


		// create array of indices into the particle texture so that each particle has a unique index.
		const particleTextureIndex = [];
		for (let i = 0; i < sqrtNumParticles; i++) {
			for (let j = 0; j < sqrtNumParticles; j++) {
				particleTextureIndex.push(i / (sqrtNumParticles), j / (sqrtNumParticles));
			}
		}
		const shader_name = this.constructor.shader_name

		console.log('Compiling shaders: ', shader_name)
		const drawParticles = regl({
			attributes: {
				particleTextureIndex,
			},

			primitive: 'points',
			count: numParticles,

			depth: {
				enable: true,
				mask: false,
			},

			uniforms: {
				pointWidth: regl.prop('width_factor'),
				particlePosition: () => currParticlePosition, // important to use a function here. Otherwise it would cache and not use the newest buffer.
				particleLifetime: particleLifetimeInfo,
				mat_mvp: regl.prop('mat_mvp'),
				u_time: regl.prop('u_time'),
			},

			blend: {
				enable: true,
				func: {
					src: 'src alpha',
					dst: 'one minus src alpha',
				},
				equation: {
					rgb: 'add',
					alpha: 'add'
				},
				color: [0., 0., 0., 0.],
			},

			vert: this.get_resource_checked(`${shader_name}draw.vert.glsl`),
			frag: this.get_resource_checked(`${shader_name}draw.frag.glsl`),
		})

		const updateParticles = regl({
			//IMPORTANT : Write to a framebuffer, not to the screen!!!
			framebuffer: () => nextParticlePosition,

			attributes: {
				position: [
					-4, 0,
					4, 4,
					4, -4
				]
			},

			uniforms: {
				currParticleState: () => currParticlePosition,
				particleLifetime: particleLifetimeInfo,
				u_time: regl.prop('u_time'),
			},

			// we create a triangle big enough to fill the screen so that our updates can be written.
			count: 3,
			vert: this.get_resource_checked(`${shader_name}update.vert.glsl`),
			frag: this.get_resource_checked(`${shader_name}update.frag.glsl`),
		});

		this.pipeline = (frame_info, cinema_mode) => {
			drawParticles({
				mat_mvp: this.mat_mvp,
				u_time : frame_info.sim_time,
				width_factor: cinema_mode ? 20* this.pointWidth / length(frame_info.camera_position) : 2.*this.pointWidth / (frame_info.cam_distance_factor),
			});

			updateParticles({
				u_time : frame_info.sim_time,
			});

			cycleParticleStates();

		};

			
	}

	calculate_model_matrix() {
		// Compute the this.mat_model_to_world, which places the particles at the right place in the scene
		mat4.identity(this.mat_model_to_world);
		const translation = mat4.fromTranslation(mat4.create(), [0., 0., 6.]);
		const scale = mat4.fromScaling(mat4.create(), [9.5, 9.5, 9.5]);
		mat4_matmul_many(this.mat_model_to_world, mat4.create(), this.mat_scale, translation, scale);

	}

	render(frame_info, cinema_mode) {
		const { mat_projection, mat_view } = frame_info
		this.calculate_model_matrix();
		mat4_matmul_many(this.mat_mvp, mat_projection, mat_view, this.mat_model_to_world);
		this.pipeline(frame_info, cinema_mode);
	}

}
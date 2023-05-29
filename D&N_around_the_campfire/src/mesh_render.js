import { vec2, vec3, vec4, mat3, mat4 } from "../lib/gl-matrix_3.3.0/esm/index.js"
import { cross, length, dot, random } from "../lib/gl-matrix_3.3.0/esm/vec3.js";
import { mat4_matmul_many } from "./icg_math.js"
import { EnvironmentCapture } from "./env_capture.js"
import { RANDOM } from "../lib/gl-matrix_3.3.0/esm/common.js";

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
			if(light_actor.light.fire){
				alpha = Math.atan(5. * Math.sin(scene_info.sim_time))/Math.atan(5.)
			}
			const light_position_cam = vec3.transformMat4([0., 0., 0.], light_actor.translation, mat_view)
			const light_color = vec3.scale([0, 0, 0], light_actor.light.color, light_actor.light.intensity * (alpha + 1)/2)

			this.render_light_contributions(frame_info, scene_info, light_position_cam, light_color)
		}

		// Draw on the GPU
	}
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
		for (let i = 0; i < numParticles; ++i) {
			const r = Math.sqrt(Math.random());
			const theta = Math.random() * 2 * Math.PI;
			// store x then y and then leave 2 spots empty
			initialParticleState[i * 4] = r * Math.cos(theta); // x position
			initialParticleState[i * 4 + 1] = r * Math.sin(theta);//2 * Math.random() - 1;// y position
			initialParticleState[i * 4 + 2] = 0.;
			initialParticleState[i * 4 + 3] = 0.; // age 
		}

		const initialParticleLifetime = new Float32Array(numParticles * 4);
		for (let i = 0; i < numParticles; ++i) {
			initialParticleLifetime[i * 4] = Math.random() * 3 + 1; // lifetime
			initialParticleLifetime[i * 4 + 1] = Math.random() * 8; // start time
		}

		// create a regl framebuffer holding the initial particle state
		function createInitialParticleBuffer(initialParticleState) {
			// create a texture where R holds particle X and G holds particle Y position
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

		// initialize particle ages
		let particleAge = createInitialParticleBuffer(initialParticleState);

		// cycle which buffer is being pointed to by the state variables
		function cycleParticleStates() {
			const tmp = prevParticleState;
			prevParticleState = currParticleState;
			currParticleState = nextParticleState;
			nextParticleState = tmp;
		}

		// create array of indices into the particle texture for each particle
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

			// Uniforms: global data available to the shader
			uniforms: {
				pointWidthFactor: regl.prop('width_factor'),
				particleState: () => currParticleState, // important to use a function here. Otherwise it would cache and not use the newest buffer.
				particleLifetime: particleAge,
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

			// pass in previous states to work from
			uniforms: {
				// must use a function so it gets updated each call
				currParticleState: () => currParticleState,
				prevParticleState: () => prevParticleState,
				particleLifetime: particleAge,
				u_time: regl.prop('u_time'),
			},

			// it's a triangle - 3 vertices
			count: 3,

			vert: this.get_resource_checked(`${shader_name}update.vert.glsl`),
			frag: this.get_resource_checked(`${shader_name}update.frag.glsl`),
		});

		this.pipeline = (frame_info) => {

			//runParticleFireSystem();
			// draw the points using our created regl func
			drawParticles({
				mat_mvp: this.mat_mvp,
				u_time : frame_info.sim_time,
				width_factor: 1 / (frame_info.cam_distance_factor),
			});

			// update position of particles in state buffers
			updateParticles({
				u_time : frame_info.sim_time,
			});

			// update pointers for next, current, and previous particle states
			cycleParticleStates();

		};

		/**
		// Define a function to draw a fullscreen quad
		function drawFullscreenQuad() {
			const attributes = {
			position: regl.buffer([
				[-1, -1], [1, -1], [-1, 1], [-1, 1], [1, -1], [1, 1]
			]),
			};
		
			const vertexShader = `
			precision highp float;
			attribute vec2 position;
			varying vec2 uv;
		
			void main() {
				uv = 0.5 * (position + 1.0);
				gl_Position = vec4(position, 0, 1);
			}
			`;
		
			const fragmentShader = `
			precision highp float;
			uniform sampler2D texture;
			varying vec2 uv;
		
			void main() {
				gl_FragColor = texture2D(texture, uv);
			}
			`;
		
			const drawCommand = regl({
			vert: vertexShader,
			frag: fragmentShader,
			attributes: attributes,
			uniforms: {
				texture: regl.prop('texture'),
			},
			count: 6,
			});
		
			return function (texture) {
				drawCommand({ texture });
			};
		}

		function renderBloomEffect() {
			const bloomPass = regl({
				frag: `
				  precision highp float;
			  
				  uniform sampler2D image;
				  uniform float bloomThreshold;
			  
				  varying vec2 uv;
			  
				  void main() {
					// Sample the color from the previous pass
					vec4 color = texture2D(image, uv);
			  
					// Apply the bloom effect
					if (color.rgb.r > bloomThreshold || color.rgb.g > bloomThreshold || color.rgb.b > bloomThreshold) {
					  // Add the bright color to the original color
					  color += texture2D(image, uv);
					}
			  
					// Output the final color
					gl_FragColor = color;
				  }
				`,
				uniforms: {
				  image: regl.prop('image'), // Texture containing the rendered image from the first pass
				  bloomThreshold: regl.prop('bloomThreshold'), // Threshold for determining the bright pixels
				},
			});
		}

		const drawQuad = drawFullscreenQuad();

		// Step 4: Perform the second rendering pass with bloom effect
		regl.frame(() => {
			// Create a framebuffer object and automatically match the dimensions to the current viewport or canvas
			const framebuffer = regl.framebuffer();
		  
			// Bind the framebuffer
			framebuffer.use(() => {
			  // Render the second pass with bloom effect
			  renderBloomEffect({
				image: framebuffer.color[0], // Use the color buffer of the framebuffer as the input texture
				bloomThreshold: 0.8, // Adjust the threshold value to control the intensity of the bloom effect
			  });
		  
			  // Render the final result to the screen
			  regl.clear({
				color: [0, 0, 0, 1],
				depth: 1,
			  });
		  
			  drawQuad(framebuffer.color[0]);
			});
		  });*/

	}

	calculate_model_matrix({camera_position}) {

		// Compute the this.mat_model_to_world, which makes the normal of the billboard always point to our eye.
		mat4.identity(this.mat_model_to_world);
		const nb = vec3.fromValues(0.,0.,1.);
		const rotation_angle = Math.acos(dot(nb, camera_position)/length(camera_position));
		const rotation_axis = cross(vec3.create(), nb, camera_position);
		const rotation_mat = mat4.fromRotation(mat4.create(), rotation_angle, rotation_axis);
		const translation = mat4.fromTranslation(mat4.create, [-0.1, 0., 1.]);
		//console.error(camera_position);
		mat4_matmul_many(this.mat_model_to_world, mat4.create(), this.mat_scale, translation);

	}

	render(frame_info) {
		const { mat_projection, mat_view } = frame_info
		this.calculate_model_matrix(frame_info);
		mat4_matmul_many(this.mat_mvp, mat_projection, mat_view, this.mat_model_to_world);
		this.pipeline(frame_info);
	}

	check_scene(scene_info) {
		// check if all meshes are loaded
		for (const actor of scene_info.actors) {
			if (actor.mesh) {
				this.get_resource_checked(actor.material.texture)
			}
		}
	}

	init_positions(nParticles, height, width) {
		const positions = [];
		for (let index = 0; index < nParticles; index++) {
			const alpha = vec2.random(vec2.create())
			positions[index] = [alpha[0] * width + width / 2, alpha[1] * height + height / 2]
		}
		return positions;
	}

	init_velocity(nParticles) {
		const init_vel = [];
		for (let index = 0; index < nParticles; index++) {
			const alpha = Math.random()
			const y = alpha * 0.5 + (1 - alpha) * 0.1
			init_vel[index] = [0., y, 0.];
		}
		return init_vel;
	}

	init_start(nParticles) {
		const start_times = [];
		let time = 0.;
		for (let index = 0; index < nParticles; index++) {
			start_times[index] = time;
			time += 0.00075;
		}
		return start_times;
	}

}

export class SysRenderParticlesCloud extends SysRenderMeshes {
	static shader_name = 'cloud'

	init_pipeline(regl) {
		this.mat_mvp = mat4.create();
		this.mat_model_to_world = mat4.create();
		this.mat_scale = mat4.fromScaling(mat4.create(), [35.,35.,35.]);
		// initial particles state and texture for buffer
		// multiply by 4 for R G B A
		const sqrtNumParticles = 45;
		const numParticles = sqrtNumParticles * sqrtNumParticles;
		this.pointWidth = 500;//TODO :try more possibilites
		const initialParticleState = new Float32Array(numParticles * 4);
		for (let i = 0; i < numParticles; ++i) {
			const r = Math.sqrt(Math.random());
			const theta = Math.random() * 2 * Math.PI;
			// store x then y and then leave 2 spots empty
			initialParticleState[i * 4] = r * Math.cos(theta); // x position
			initialParticleState[i * 4 + 1] = r * Math.sin(theta);//2 * Math.random() - 1;// y position
			initialParticleState[i * 4 + 2] = Math.random()*0.01;
		}

		// create a regl framebuffer holding the initial particle state
		function createInitialParticleBuffer(initialParticleState) {
			// create a texture where R holds particle X and G holds particle Y position
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

		// cycle which buffer is being pointed to by the state variables
		function cycleParticleStates() {
			const tmp = prevParticleState;
			prevParticleState = currParticleState;
			currParticleState = nextParticleState;
			nextParticleState = tmp;
		}


		// create array of indices into the particle texture for each particle
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

			// Uniforms: global data available to the shader
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

			// pass in previous states to work from
			uniforms: {
				// must use a function so it gets updated each call
				currParticleState: () => currParticleState,
				prevParticleState: () => prevParticleState,
				u_time: regl.prop('u_time'),
			},

			// it's a triangle - 3 vertices
			count: 3,

			vert: this.get_resource_checked(`${shader_name}update.vert.glsl`),
			frag: this.get_resource_checked(`${shader_name}update.frag.glsl`),
		});

		this.pipeline = (frame_info) => {
	
			// draw the points using our created regl func
			drawParticles({
				mat_mvp: this.mat_mvp,
				u_time : frame_info.sim_time,
				width_factor: this.pointWidth / frame_info.cam_distance_factor,
			});

			// update position of particles in state buffers
			updateParticles({
				u_time : frame_info.sim_time,
			});

			// update pointers for next, current, and previous particle states
			cycleParticleStates();

		};
	}

	calculate_model_matrix({camera_position}) {

		// Compute the this.mat_model_to_world, which makes the normal of the billboard always point to our eye.
		mat4.identity(this.mat_model_to_world);
		const nb = vec3.fromValues(0.,0.,1.);
		const rotation_angle = Math.acos(dot(nb, camera_position)/length(camera_position));
		const rotation_axis = cross(vec3.create(), nb, camera_position);
		const rotation_mat = mat4.fromRotation(mat4.create(), rotation_angle, rotation_axis);
		const translation = mat4.fromTranslation(mat4.create(), [0., 0., -0.01]);
		//console.error(camera_position);
		mat4_matmul_many(this.mat_model_to_world, mat4.create(), this.mat_scale, translation);

	}

	render(frame_info) {
		const { mat_projection, mat_view } = frame_info
		this.calculate_model_matrix(frame_info);
		mat4_matmul_many(this.mat_mvp, mat_projection, mat_view, this.mat_model_to_world);
		this.pipeline(frame_info);
	}

	check_scene(scene_info) {
		// check if all meshes are loaded
		for (const actor of scene_info.actors) {
			if (actor.mesh) {
				this.get_resource_checked(actor.material.texture)
			}
		}
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
			initialParticlePosition[i * 4 + 2] = 0.;
			initialParticlePosition[i * 4 + 3] = 0.; // age
		}

		const initialParticleState = new Float32Array(numParticles * 4);
		for (let i = 0; i < numParticles; ++i) {
			initialParticleState[i * 4] = Math.random() * 7 + 1; // lifetime
			initialParticleState[i * 4 + 1] = Math.random() * 8; // start time
		}

		// create a regl framebuffer holding the initial particle state
		function createInitialParticleBuffer(initialParticleState) {
			// create a texture where R holds particle X and G holds particle Y position
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
		let prevParticlePosition = createInitialParticleBuffer(initialParticlePosition);
		let currParticlePosition = createInitialParticleBuffer(initialParticlePosition);
		let nextParticlePosition = createInitialParticleBuffer(initialParticlePosition);

		// initialize particle ages
		let particleAge = createInitialParticleBuffer(initialParticleState);


		// cycle which buffer is being pointed to by the state variables
		function cycleParticleStates() {
			const tmp = prevParticlePosition;
			prevParticlePosition = currParticlePosition;
			currParticlePosition = nextParticlePosition;
			nextParticlePosition = tmp;
		}


		// create array of indices into the particle texture for each particle
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

			// Uniforms: global data available to the shader
			uniforms: {
				pointWidth: regl.prop('width_factor'),
				particlePosition: () => currParticlePosition, // important to use a function here. Otherwise it would cache and not use the newest buffer.
				particleLifetime: particleAge,
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

			// pass in previous states to work from
			uniforms: {
				// must use a function so it gets updated each call
				currParticleState: () => currParticlePosition,
				prevParticleState: () => prevParticlePosition,
				particleLifetime: particleAge,
				u_time: regl.prop('u_time'),
			},

			// it's a triangle - 3 vertices
			count: 3,

			vert: this.get_resource_checked(`${shader_name}update.vert.glsl`),
			frag: this.get_resource_checked(`${shader_name}update.frag.glsl`),
		});

		this.pipeline = (frame_info) => {
			// draw the points using our created regl func
			drawParticles({
				mat_mvp: this.mat_mvp,
				u_time : frame_info.sim_time ,
				width_factor: 2 * this.pointWidth / frame_info.cam_distance_factor,
			});

			// update position of particles in state buffers
			updateParticles({
				u_time : frame_info.sim_time,
			});

			// update pointers for next, current, and previous particle states
			cycleParticleStates();

		};

			
	}

	calculate_model_matrix({camera_position}) {

		// Compute the this.mat_model_to_world, which makes the normal of the billboard always point to our eye.
		mat4.identity(this.mat_model_to_world);
		const nb = vec3.fromValues(0.,0.,1.);
		const rotation_angle = Math.acos(dot(nb, camera_position)/length(camera_position));
		const rotation_axis = cross(vec3.create(), nb, camera_position);
		const rotation_mat = mat4.fromRotation(mat4.create(), rotation_angle, rotation_axis);
		const translation = mat4.fromTranslation(mat4.create(), [-0.2, 0.1, 3.]);
		//console.error(camera_position);
		mat4_matmul_many(this.mat_model_to_world, mat4.create(), this.mat_scale, translation);

	}

	render(frame_info) {
		const { mat_projection, mat_view } = frame_info
		this.calculate_model_matrix(frame_info);
		mat4_matmul_many(this.mat_mvp, mat_projection, mat_view, this.mat_model_to_world);
		this.pipeline(frame_info);
	}

	check_scene(scene_info) {
		// check if all meshes are loaded
		for (const actor of scene_info.actors) {
			if (actor.mesh) {
				this.get_resource_checked(actor.material.texture)
			}
		}
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
		const pointWidth = 30; //TODO :try more possibilites
		const initialParticlePosition = new Float32Array(numParticles * 4);
		for (let i = 0; i < numParticles; ++i) {
			const r = Math.sqrt(Math.random());
			const theta = Math.random() * 2 * Math.PI;
			// store x then y and then leave 2 spots empty
			initialParticlePosition[i * 4] = r * Math.cos(theta); // x position
			initialParticlePosition[i * 4 + 1] = r * Math.sin(theta);//2 * Math.random() - 1;// y position
			initialParticlePosition[i * 4 + 2] = 0.;
			initialParticlePosition[i * 4 + 3] = 0.; // age
		}

		const initialParticleState = new Float32Array(numParticles * 4);
		for (let i = 0; i < numParticles; ++i) {
			initialParticleState[i * 4] = Math.random() * 6 + 1; // lifetime
			initialParticleState[i * 4 + 1] = Math.random() * 8; // start time
		}

		// create a regl framebuffer holding the initial particle state
		function createInitialParticleBuffer(initialParticleState) {
			// create a texture where R holds particle X and G holds particle Y position
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
		let prevParticlePosition = createInitialParticleBuffer(initialParticlePosition);
		let currParticlePosition = createInitialParticleBuffer(initialParticlePosition);
		let nextParticlePosition = createInitialParticleBuffer(initialParticlePosition);

		// initialize particle ages
		let particleAge = createInitialParticleBuffer(initialParticleState);


		// cycle which buffer is being pointed to by the state variables
		function cycleParticleStates() {
			const tmp = prevParticlePosition;
			prevParticlePosition = currParticlePosition;
			currParticlePosition = nextParticlePosition;
			nextParticlePosition = tmp;
		}


		// create array of indices into the particle texture for each particle
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

			// Uniforms: global data available to the shader
			uniforms: {
				pointWidth,
				particlePosition: () => currParticlePosition, // important to use a function here. Otherwise it would cache and not use the newest buffer.
				particleLifetime: particleAge,
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

			// pass in previous states to work from
			uniforms: {
				// must use a function so it gets updated each call
				currParticleState: () => currParticlePosition,
				prevParticleState: () => prevParticlePosition,
				particleLifetime: particleAge,
				u_time: regl.prop('u_time'),
			},

			// it's a triangle - 3 vertices
			count: 3,
			vert: this.get_resource_checked(`${shader_name}update.vert.glsl`),
			frag: this.get_resource_checked(`${shader_name}update.frag.glsl`),
		});

		this.pipeline = (frame_info) => {
			// draw the points using our created regl func
			drawParticles({
				mat_mvp: this.mat_mvp,
				u_time : frame_info.sim_time,
			});

			// update position of particles in state buffers
			updateParticles({
				u_time : frame_info.sim_time,
			});

			// update pointers for next, current, and previous particle states
			cycleParticleStates();

		};

			
	}

	calculate_model_matrix({camera_position}) {

		// Compute the this.mat_model_to_world, which makes the normal of the billboard always point to our eye.
		mat4.identity(this.mat_model_to_world);
		const nb = vec3.fromValues(0.,0.,1.);
		const rotation_angle = Math.acos(dot(nb, camera_position)/length(camera_position));
		const rotation_axis = cross(vec3.create(), nb, camera_position);
		const rotation_mat = mat4.fromRotation(mat4.create(), rotation_angle, rotation_axis);
		const translation = mat4.fromTranslation(mat4.create(), [0., 0., 6.]);
		const scale = mat4.fromScaling(mat4.create(), [9.5, 9.5, 9.5]);
		//console.error(camera_position);
		mat4_matmul_many(this.mat_model_to_world, mat4.create(), this.mat_scale, translation, scale);

	}

	render(frame_info) {
		const { mat_projection, mat_view } = frame_info
		this.calculate_model_matrix(frame_info);
		mat4_matmul_many(this.mat_mvp, mat_projection, mat_view, this.mat_model_to_world);
		this.pipeline(frame_info);
	}

	check_scene(scene_info) {
		// check if all meshes are loaded
		for (const actor of scene_info.actors) {
			if (actor.mesh) {
				this.get_resource_checked(actor.material.texture)
			}
		}
	}
}
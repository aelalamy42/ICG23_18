## sky.frag.glsl
```
precision mediump float;
	
varying vec3 v2f_color;

void main()
{
	gl_FragColor = vec4(v2f_color, 1.);
}
```
## sky.vert.glsl
```
// Vertex attributes, specified in the "attributes" entry of the pipeline
attribute vec3 vertex_position;

// Per-vertex outputs passed on to the fragment shader
varying vec3 v2f_color;

// Global variables specified in "uniforms" entry of the pipeline
uniform mat4 mat_mvp;

uniform float sim_time;

void main() {
	vec3 day_color = vec3(0.55, 0.86, 0.99);
	vec3 night_color = vec3(0.01, 0., 0.07);
	float alpha = sin(sim_time);
	v2f_color = mix(day_color, night_color, (alpha + 1.)/2.);
	gl_Position = mat_mvp * vec4(vertex_position, 1);
}
```

## mesh_render.js
```
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
```
In the rest of the code in this file, we took the existing model from the github gist referenced in the final report (point 6 in reference for the link. The file is script.js), but adapted it a lot to work with our framework and get the results we wanted. We give you the original file for transparency.
```
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

```

## main.js

```
	// speed level
	let speed = 5
	register_keyboard_action('1', () => speed = 5);
	register_keyboard_action('2', () => speed = 2);
	register_keyboard_action('3', () => speed = 0.75);

	// Cinema mode
	let cinema_mode = true
	register_keyboard_action('c', () => {
		cinema_mode = !cinema_mode;
		speed = 5;
		set_predef_view_1();
	});

	/*---------------------------------------------------------------
		Scene and systems
	---------------------------------------------------------------*/

	// Systems

	const sys_render_unshaded = new SysRenderTextured(regl, resources)
	sys_render_unshaded.check_scene(scene)
	sys_render_unshaded.init()

	const sys_render_light = new SysRenderMeshesWithLight(regl, resources)
	sys_render_light.init()

	const sys_render_sky = new SysRenderSky(regl, resources);
	sys_render_sky.init()

	// Particle systems

	const fire = new SysRenderParticlesFire(regl, resources);
	fire.init();

	const cloud = new SysRenderParticlesCloud(regl, resources);
	cloud.init();

	const smoke = new SysRenderParticlesSmoke(regl, resources);
	smoke.init();

	const fireflies = new SysRenderParticlesFireflies(regl, resources);
	fireflies.init();

	/*---------------------------------------------------------------
		Camera
	---------------------------------------------------------------*/

	function triangle_pi_period(value) { // Function used to move the camera in a rectangular smooth manner.
		const modulo = value % (2 * Math.PI);
		if (modulo <= Math.PI) {
			return 18 * modulo / Math.PI - 8;
		}
		else {
			return 28 - 18 * modulo / Math.PI;
		}
	}

	const cam_distance_base = 15.
	function update_cam_transform(frame_info) {
		const { cam_angle_z, cam_angle_y, cam_distance_factor, sim_time } = frame_info;

		const r = cam_distance_base * (cinema_mode ? 3.4693280768000003 : cam_distance_factor);

		// Positioning of the target and the camera depends on the mode we're in.
		const target = cinema_mode ? [0, 0, 2.5 * Math.sin(sim_time) + 7.5] : [0, 0, 0];
		const position = cinema_mode ? [r * Math.sin(2 * sim_time), triangle_pi_period(2 * sim_time), 10 + 5 * Math.cos(sim_time)] : [-r, 0, 0];

		const look_at = mat4.lookAt(mat4.create(),
			position, // camera position in world coord
			target,//[0, 0, 0], // view target point
			[0, 0, 1], // up vector
		)
		const yRotate = mat4.fromYRotation(mat4.create(), cam_angle_y);
		const zRotate = mat4.fromZRotation(mat4.create(), cam_angle_z);
		// Store the combined transform in mat_turntable
		//mat4_matmul_many(frame_info.mat_turntable, look_at, zRotate);
		// Store the combined transform in mat_turntable
		// frame_info.mat_turntable = A * B * ...
		if (cinema_mode) {
			frame_info.camera_position = position;
			mat4_matmul_many(frame_info.mat_turntable, look_at)
		}
		else {
			mat4_matmul_many(frame_info.mat_turntable, look_at, yRotate, zRotate)
		}
	}

	update_cam_transform(frame_info)

	set_predef_view_1();

	/*---------------------------------------------------------------
		Render loop
	---------------------------------------------------------------*/

	let prev_regl_time = 0

	regl.frame((frame) => {

		const { mat_view, mat_projection, mat_turntable, camera_position } = frame_info

		const scene_info = scene
		const dt = frame.time - prev_regl_time
		frame_info.sim_time += dt / speed
		scene_info.sim_time = frame_info.sim_time
		prev_regl_time = frame.time


		sys_orbit(scene_info)

		const sky_info = scene_info.actors.slice(4)
		const terrain_info = scene_info.actors.slice(0, 4)
		sys_render_light.render(frame_info, {
			sim_time: scene_info.sim_time,
			actors: terrain_info,
		})
		sys_render_sky.render(frame_info, {
			sim_time: scene_info.sim_time,
			actors: sky_info,
		})

		cloud.render(frame_info, cinema_mode);
		smoke.render(frame_info, cinema_mode);
		fireflies.render(frame_info, cinema_mode);
		fire.render(frame_info, cinema_mode);

		debug_text.textContent = (Math.sin(frame_info.sim_time) > 0 ? `Good night!` : `Good day!`) + ` sim time is : ${frame_info.sim_time.toFixed(2)} s`;
	})
```

## scene.js
We adapted most of this code by adding our files to load and giving our own list of actors.

```
// Start downloads in parallel
	const resource_promises = {}

	// We load cube sides as images because we will put them into the cubemap constructor
	for(let cube_side_idx = 0; cube_side_idx < 6; cube_side_idx++) {
		const texture_name = `cube_side_${cube_side_idx}.png`
		resource_promises[texture_name] = load_image(`./textures/${texture_name}`)
	}
	resource_promises['text_scene'] = load_texture(regl, './textures/Merged_document.png')

	const shaders_to_load = [
		'phong_shadow.vert.glsl', 'phong_shadow.frag.glsl',
		'cubemap_visualization.vert.glsl', 'cubemap_visualization.frag.glsl',
		'unshaded.vert.glsl', 'unshaded.frag.glsl',
		'shadowmap_gen.vert.glsl', 'shadowmap_gen.frag.glsl',
		'sky.vert.glsl', 'sky.frag.glsl',
		'fireupdate.vert.glsl', 'fireupdate.frag.glsl',
		'firedraw.vert.glsl', 'firedraw.frag.glsl',
		'cloudupdate.vert.glsl', 'cloudupdate.frag.glsl',
		'clouddraw.vert.glsl', 'clouddraw.frag.glsl',
		'smokeupdate.vert.glsl', 'smokeupdate.frag.glsl',
		'smokedraw.vert.glsl', 'smokedraw.frag.glsl',
		'firefliesupdate.vert.glsl', 'firefliesupdate.frag.glsl',
		'firefliesdraw.vert.glsl', 'firefliesdraw.frag.glsl',
	]
	for(const shader_name of shaders_to_load) {
		resource_promises[shader_name] = load_text(`./src/shaders/${shader_name}`)
	}

	const meshes_to_load = [
		"Compgraph_template.obj",
		"Compgraph_floor.obj",
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

export function create_scene_content() {

	const actors = [

		
		{
			translation: [0., 0., 10.],
			scale: [2., 2., 2.],

			light: {
				color: [1., 0.8, 0.7],
				intensity: 100.,
				fire: 'yes', // This is to differentiate the light of the fire from the orbit one.
			},
			
		},
		
		{
			translation: [0., 0., 0.],

			light: {
				color: [1., 0.8, 0.7],
				intensity: 1000.,
			},

			orbit: {
				anchor: [0., 0., 20.],
				axis: [0., 1., 0.],
				radius: 36.,
				angular_velocity: 1.,
			},
		},

		{
			translation: [0., 0., 0.102],
			scale: [10., 10., 10.],
					
			mesh: 'Compgraph_template.obj',
			material: {
				texture: 'text_scene',
			}
		},

		{
			translation: [0., 0., 0.],
			scale: [10., 10., 15.],
					
			mesh: 'Compgraph_floor.obj',
			material: {
				texture: 'tex_green',
				shininess: 0.,
			}
		},

		{
			translation: [0., 0., 0.],
			scale: [100., 100., 100.],
					
			mesh: 'mesh_sphere',
			material: {
				texture: 'tex_blue',
			}
		}


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
```
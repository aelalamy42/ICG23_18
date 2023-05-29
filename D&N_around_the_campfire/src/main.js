
import { createREGL } from "../lib/regljs_2.1.0/regl.module.js"
import { vec3, mat4 } from "../lib/gl-matrix_3.3.0/esm/index.js"
import { quat } from "../lib/gl-matrix_3.3.0/esm/index.js"

import { DOM_loaded_promise, register_keyboard_action } from "./icg_web.js"
import { deg_to_rad, mat4_matmul_many } from "./icg_math.js"


import { SysRenderTextured, SysRenderMeshesWithLight, SysRenderSky, SysRenderParticlesFire, SysRenderParticlesCloud, SysRenderParticlesSmoke, SysRenderParticlesFireflies } from "./mesh_render.js"


import { create_scene_content, load_resources } from "./scene.js"


function sys_orbit(scene_info) {

	const { sim_time } = scene_info
	const q = quat.create()

	for (const actor of scene_info.actors) {
		const { orbit } = actor

		if (orbit) {
			quat.setAxisAngle(q, orbit.axis, orbit.angular_velocity * sim_time)
			vec3.transformQuat(actor.translation, [orbit.radius, 0, 0], q)
			vec3.add(actor.translation, actor.translation, orbit.anchor)
		}
	}
}

async function main() {
	/* const in JS means the variable will not be bound to a new value, but the value can be modified (if its an object or array)
		https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const
	*/

	// We are using the REGL library to work with webGL
	// http://regl.party/api
	// https://github.com/regl-project/regl/blob/master/API.md
	const regl = createREGL({
		profile: true, // if we want to measure the size of buffers/textures in memory
		extensions: ['OES_texture_float', 'OES_texture_float_linear', 'WEBGL_color_buffer_float',
			'OES_vertex_array_object', 'OES_element_index_uint'
		],
	})
	// The <canvas> (HTML element for drawing graphics) was created by REGL, lets take a handle to it.
	const canvas_elem = document.getElementsByTagName('canvas')[0]

	/*---------------------------------------------------------------
		UI
	---------------------------------------------------------------*/

	// Debug overlay
	const debug_overlay = document.getElementById('debug-overlay')
	const debug_text = document.getElementById('debug-text')
	register_keyboard_action('h', () => debug_overlay.classList.toggle('hidden'))

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


	const set_predef_view_1 = () => {

		frame_info.sim_time = Math.max(0., frame_info.sim_time);
		frame_info.cam_angle_z = -2.731681469282041
		frame_info.cam_angle_y =
			-0.4785987755982989
		frame_info.cam_distance_factor = 3.4693280768000003

		mat4.set(frame_info.mat_turntable, 0.3985278716916164, -0.42238331447052535, 0.8141055651092455, 0, 0.9171562219627312, 0.18353636962060468, -0.3537497216133721, 0, 0, 0.8876411080405088, 0.4605358436827886, 0, 0, 0, -22.039921152000005, 1)
	}

	/*---------------------------------------------------------------
		Scene and systems
	---------------------------------------------------------------*/

	// Resources and scene 
	const resources = await load_resources(regl)

	const scene = create_scene_content()

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
		Frame info
	---------------------------------------------------------------*/

	const frame_info = {
		sim_time: 0.,

		cam_angle_z: Math.PI * 0.2, // in radians!
		cam_angle_y: -Math.PI / 6, // in radians!
		cam_distance_factor: 1.,
		camera_position: [0, 0, 0],
		mat_turntable: mat4.create(),

		mat_view: mat4.create(),
		mat_projection: mat4.create(),
	}

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

	function animate_camera() {
		update_cam_transform(frame_info);
		requestAnimationFrame(animate_camera);
	}
	animate_camera();


	// Rotate camera position by dragging with the mouse
	canvas_elem.addEventListener('mousemove', (event) => {
		// if left or middle button is pressed
		if (event.buttons & 1 || event.buttons & 4) {
			frame_info.cam_angle_z += event.movementX * 0.005
			frame_info.cam_angle_y += -event.movementY * 0.005

			update_cam_transform(frame_info)
		}
	})


	canvas_elem.addEventListener('wheel', (event) => {
		// scroll wheel to zoom in or out
		const factor_mul_base = 1.08
		const factor_mul = (event.deltaY > 0) ? factor_mul_base : 1. / factor_mul_base
		frame_info.cam_distance_factor *= factor_mul
		frame_info.cam_distance_factor = Math.max(0.02, Math.min(frame_info.cam_distance_factor, 4))
		update_cam_transform(frame_info)
	})

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

		// Calculate view matrix, view centered on chosen planet
		mat4.perspective(mat_projection,
			deg_to_rad * 60, // fov y
			frame.framebufferWidth / frame.framebufferHeight, // aspect ratio
			0.01, // near
			512, // far
		)
		mat4.copy(mat_view, mat_turntable)

		// Calculate light position in camera frame
		//vec3.transformMat4(light_position_cam, light_position_world, mat_view)

		// Set the whole image to black
		regl.clear({ color: [0, 0, 0, 1] });

		sys_orbit(scene_info)

		// Calculate camera position and store it in `camera_position`, it will be needed for the billboard
		{
			/*
			Camera is at [0, 0, 0] in camera coordinates.
			mat_view is a transformation from world to camera coordinates.
			The inverse of mat_view is a transformation from camera to world coordinates.
			Transforming [0, 0, 0] from camera to world we obtain the world position of the camera.
				cam_pos = mat_view^-1 * [0, 0, 0]^T
			*/
			const mat_camera_to_world = mat4.invert(mat4.create(), mat_view);

			// Transform [0, 0, 0] from camera to world:
			//const camera_position = vec3.transformMat4([0, 0, 0], [0, 0, 0], mat_view_invert);
			// But the rotation and scale parts of the matrix do no affect [0, 0, 0] so, we can just get the translation, its cheaper:
			mat4.getTranslation(camera_position, mat_camera_to_world);
		}

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
}

DOM_loaded_promise.then(main);

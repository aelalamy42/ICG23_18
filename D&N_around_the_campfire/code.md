## clouddraw.frag.glsl
```
void main() {
    vec2 cxy = gl_PointCoord - vec2(0.5);
    float d = dot(cxy, cxy);
    float g = 2. * exp(-3. * d) - 1.2;
    float alpha = g + 0.5 * perlin_fbm((gl_PointCoord + vec2(0.5*u_time) + 3. * idx));
    vec3 day_color = mix(vec3(1.), vec3(0.776, 0.78, 0.855), length(idx));
    vec3 night_color = mix( vec3(0.776, 0.78, 1.), vec3(0.043, 0.13, 0.286), length(idx));
    float night_to_day_alpha = (sin(u_time) + 1.) /2.;
    vec3 color = mix(day_color, night_color, night_to_day_alpha);
    gl_FragColor = vec4(color, alpha);
}
```

## clouddraw.vert.glsl
```
// set the precision of floating point numbers
precision mediump float;
attribute vec2 particleTextureIndex;
uniform sampler2D particleState;
uniform mat4 mat_mvp;

varying vec3 fragColor;
varying vec2 idx;

uniform float pointWidth;
void main() {
	
    vec3 position = texture2D(particleState, particleTextureIndex).xyz;
	
    fragColor = mix(vec3(1.), vec3(0.776, 0.78, 0.855), length(particleTextureIndex));
    idx = particleTextureIndex;
	
    gl_Position = mat_mvp * vec4(position, 1.0);
    gl_PointSize = pointWidth;
}
```

## cloudupdate.frag.glsl

```
precision mediump float;

uniform sampler2D currParticleState;

varying vec2 particleTextureIndex;

void main() {
    vec3 currPosition = texture2D(currParticleState, particleTextureIndex).xyz;
    vec3 position = currPosition;
		// we store the new position as the color in this frame buffer
    gl_FragColor = vec4(position, 1);
}
```


## firedraw.frag.glsl
```
precision mediump float;

uniform float u_time;
uniform sampler2D particleLifetime;
uniform sampler2D particleState;

varying vec2 idx;
varying float alpha_factor;

void main() {
  // Using alpha to make a periodic function used to dim the light at the end of the cycle 
  // And using perlin_fbm make random variations of the alpha to make it more realistic
  vec2 cxy = gl_PointCoord - vec2(0.5);
  float d = dot(cxy, cxy);
  float g = 2. * exp(-3. * d) - 1.;
  float alpha = (atan(5. * sin(u_time), 1.) / atan(5., 1.) + 1.)/ 2. * (g + 0.5 * perlin_fbm((gl_PointCoord + 3. * idx)));
  vec3 color;
	
  vec4 state = texture2D(particleState, idx);
  vec4 lifetime = texture2D(particleLifetime, idx);
	float age = state.w; // we saved the age as the 4th attribute of the state
  // randomise how the fire elvolves for each particle to make it more realistic
  float fire_evolution = lifetime.y + (rand(idx) + 1. ) * 2.;
  // make color variations depending on the age of the particle
  if (age < fire_evolution / 3.){
    color = vec3(1.0, 0.98, 0.51);
  }else if (age < fire_evolution / 2.){
    color = vec3(1.0, 0.92, 0.0);
  } else if (age < fire_evolution * 2. / 3. ) {
    color = mix( vec3(1.0, 0.53, 0.0), vec3(1.0, 0.95, 0.57), -(alpha + 1.)/2.);
  } else if (age < fire_evolution ) {
    color = vec3(0.88, 0.2, 0.17);
    alpha = alpha * 0.5; // dim the alpha a bit because the red is too bright for a more realistic effect
  } else {
    color = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), (alpha + 1.)/2.);
    alpha = alpha * 0.5;
  }
  gl_FragColor = vec4(color, alpha * alpha_factor);
  
}
```

## firedraw.vert.glsl
```
// set the precision of floating point numbers
precision mediump float;
attribute vec2 particleTextureIndex;
uniform sampler2D particleState;
uniform sampler2D particleLifetime;
uniform mat4 mat_mvp;
uniform float pointWidthFactor;
varying float alpha_factor;
varying vec2 idx;

void main() {
  vec4 state = texture2D(particleState, particleTextureIndex);
  float lifetime = texture2D(particleLifetime, particleTextureIndex).x;
	
  // the alpha_factor used to make the opacity smaller in the end of the lifetime
  float x = 1./8. * (lifetime - state.w);
  alpha_factor = 5.* x*x - 2.*x*x*x;

	// read in position from the state texture
  vec3 position = texture2D(particleState, particleTextureIndex).xyz;
	idx = particleTextureIndex;

  // scale to normalized device coordinates
	// gl_Position is a special variable that holds the position of a vertex
  gl_Position = mat_mvp * vec4(position, 1.0);
  
  // update the size of a particles based on the prop pointWidth and a random value done with noise to make it look more realistic
  gl_PointSize = (rand(particleTextureIndex) + 1. ) * 65. * pointWidthFactor;
}
```

## fireupdate.frag.glsl
```
// set the precision of floating point numbers
precision mediump float;
  // states to read from to get velocity
uniform sampler2D currParticleState;
uniform sampler2D prevParticleState;
uniform sampler2D particleLifetime;
uniform float u_time;

  // index into the texture state
varying vec2 particleTextureIndex;
void main() {
    vec4 currPosition =  texture2D(currParticleState, particleTextureIndex);
    vec4 prevPosition =  texture2D(prevParticleState, particleTextureIndex);
    vec4 velocity = currPosition - prevPosition;
    vec2 st = velocity.xy;
    float t = u_time * 0.1;
    vec2 noiseOffset = vec2(turbulence(st), t);
    vec2 pos = st + vec2(0.0, t * 0.25);
    vec2 noisePos = pos + noiseOffset;

    float noiseVal = perlin_noise(noisePos * 4.0);
    noiseVal += perlin_noise((noisePos + vec2(0.5)) * 10.0) * 0.5;
    noiseVal += perlin_noise((noisePos + vec2(0.25, 0.25)) * 20.0) * 0.25;
    noiseVal += perlin_noise((noisePos + vec2(-0.25, 0.5)) * 40.0) * 0.125;
    
    vec3 position = currPosition.xyz;
    // Clamping the fire so it dosen't go too far on the z axis
    position.z = clamp(position.z, 0.0, 5.0);
    // Vary the position on the X and Y axes using Perlin noise
    position.x = perlin_noise(noisePos * 2.0) * 0.5;
    position.y = perlin_noise(noisePos * 3.0) * 0.5;

    // Overlay to have more fire at the bottom 
    float grady = 1. - smoothstep(0., 1., currPosition.y);
    float gradx = 1. - smoothstep(0., 1., currPosition.x);
    position.x = overlay(position.x, grady);
    position.y = overlay(position.y, gradx);

    float age = currPosition.w + 0.1;
    float nextZ = age;
    vec4 lifetime = texture2D(particleLifetime, particleTextureIndex);
    // Randomising the lifetime of each fire particle to make it more realistic 
    lifetime.x = lifetime.x + (rand(particleTextureIndex) + 1. ) * 1.;
    float start_time = lifetime.y + (rand(particleTextureIndex) + 1. ) * 2.;
    if (age > lifetime.x){
      nextZ = 0.;
      age = 0.;
    }
    if(u_time < start_time){
      gl_FragColor = vec4(currPosition);
    } else {
      position.z = nextZ;
      gl_FragColor = vec4(position, age);
    }
}
```

## firefliesdraw.frag.glsl
```
// set the precision of floating point numbers
precision mediump float;

uniform float u_time;

// this value is populated by the vertex shader
varying vec2 idx;
varying float alpha_factor;
  #define NUM_GRADIENTS 12


void main() {
    vec2 cxy = gl_PointCoord - vec2(0.5);
    float d = dot(cxy, cxy);
    float g = 2. * exp(-3. * d) - 1.2;
    // Using a periodic function for alpha to make the fireflies only appear during the night
    float alpha = (atan(5. * sin(u_time), 1.) / atan(5., 1.) + 1.)/ 2. * (3. * g);
    vec3 colorfireflies1 = vec3(0.28, 1.0, 0.38);
    vec3 colorfireflies2 = vec3(0.95, 0.77, 0.16);
    vec3 color = mix(colorfireflies1, colorfireflies2, length(idx) * alpha_factor); // mixing the colors more realisticly 
    gl_FragColor = vec4(color, alpha_factor * alpha);
}
```
## firefliesdraw.vert.glsl
```
// set the precision of floating point numbers
precision mediump float;
attribute vec2 particleTextureIndex;
uniform sampler2D particlePosition;
uniform sampler2D particleLifetime;
uniform mat4 mat_mvp;
varying vec2 idx;
varying float alpha_factor;
// values that are the same for all vertices
uniform float pointWidth;


void main() {
	// read in position from the state texture
    vec4 state = texture2D(particlePosition, particleTextureIndex);
    float lifetime = texture2D(particleLifetime, particleTextureIndex).x;
	// copy color over to fragment shader
    idx = particleTextureIndex;
	// scale to normalized device coordinates
	// gl_Position is a special variable that holds the position of a vertex
    float x = 1./8. * (lifetime - state.w);
    alpha_factor = 3.* x*x - 2.*x*x*x;
    gl_Position = mat_mvp * vec4(state.xyz, 1.0);

	// update the size of a particles based on the prop pointWidth
    gl_PointSize = pointWidth;
}
```

## firefliesupdate.frag.glsl
```
void main() {
    vec4 currPosition = texture2D(currParticleState, particleTextureIndex);
	vec3 position = currPosition.xyz; 
	float const_velocity = 0.02; // the velocity for the particles
	vec3 noise_value = vec3(
		perlin_noise(rand(particleTextureIndex * vec2(1., 0.)) + 0.01 * u_time * vec2( 1., 0.) * (-1., particleTextureIndex.x)),
		perlin_noise(rand(particleTextureIndex * vec2(0., 1.)) + 0.01 * u_time * vec2(0., 1. ) * (- particleTextureIndex.x)),
		perlin_noise(rand(particleTextureIndex * vec2(0.5, 0.5)) + 0.01 * u_time * vec2(0.7, 0.7))
	);
	position += (noise_value ) * const_velocity; // Updating the position of the fireflies to make the movement look like a particle stream
	
	float age = currPosition.w + 0.1;
	vec4 lifetime = texture2D(particleLifetime, particleTextureIndex);
	float start_time = lifetime.y; 
	// Reseting the position randomly using the time and perlin noise
    if (age > lifetime.x){
		age = 0.;
		float nextX = abs(perlin_noise((vec2(1., rand(vec2(u_time, 1.)) + currPosition.x))));
    	float nextY = abs(perlin_noise((vec2(1., rand(vec2(1., u_time)) + currPosition.y))));
		// Translating our uniformly distributed particle initialisation
	  	float X = 3.5 *(nextX - 0.5) + 1.25;
	  	float Y = 3.5 *(nextY - 0.5) + 1.25;
	  	// Reseting the position 
	  	if (X > 1.5) {
			X = 2.5 ;
	  	} 
	  	if (Y > 1.5){
			Y = 2.5;
	  	}
	  	position = vec3(X,Y,0.);
    }
	// If it didn't start the particles shouldn't move
    if(u_time < start_time){
        position = vec3(currPosition);
    }
	// We store the new position as the color in this frame buffer
    gl_FragColor = vec4(position, age);
}
```
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

## smokedraw.frag.glsl
```
// set the precision of floating point numbers
precision mediump float;

uniform float u_time;

varying vec2 idx;
varying float alpha_factor;
void main() {
    vec2 cxy = gl_PointCoord - vec2(0.5);
    float d = dot(cxy, cxy);
    float g = 2. * exp(-3. * d) - 1.2;
    float alpha = (atan(5. * sin(u_time + 1.57 + 0.785), 1.) / atan(5., 1.) + 1.)/ 2. * (atan(5. * sin(u_time + 3.14+ 0.785), 1.) / atan(5., 1.) + 1.)/ 2.* (g + 0.5 * perlin_fbm((gl_PointCoord + vec2(0.05*u_time) + 3. * idx)));
    vec3 color = mix(vec3(0.675, 0.651, 0.588), vec3(0.212, 0.196,0.196), length(idx));
    gl_FragColor = vec4(color, alpha_factor * alpha);
}
```

## smokedraw.vert.glsl
```
// set the precision of floating point numbers
precision mediump float;
attribute vec2 particleTextureIndex;
uniform sampler2D particlePosition;
uniform sampler2D particleLifetime;
uniform mat4 mat_mvp;
// variables to send to the fragment shader
varying vec3 fragColor;
varying vec2 idx;
varying float alpha_factor;
// values that are the same for all vertices
uniform float pointWidth;
void main() {
	// read in position from the state texture
    vec4 state = texture2D(particlePosition, particleTextureIndex);
    float lifetime = texture2D(particleLifetime, particleTextureIndex).x;
	// copy color over to fragment shader
    fragColor = mix(vec3(1.), vec3(0.776, 0.78, 0.855), length(particleTextureIndex));
    idx = particleTextureIndex;
	// scale to normalized device coordinates
	// gl_Position is a special variable that holds the position of a vertex
    float x = 1./8. * (lifetime - state.w);
    alpha_factor = 3.* x*x - 2.*x*x*x;

    gl_Position = mat_mvp * vec4(state.xyz, 1.0);

	// update the size of a particles based on the prop pointWidth
    gl_PointSize = pointWidth;
}
```

## smokeupdate.frag.glsl

```
	// set the precision of floating point numbers
precision mediump float;
  // states to read from to get velocity
uniform sampler2D currParticleState;
uniform sampler2D prevParticleState;
uniform sampler2D particleLifetime;
uniform float u_time;

  // index into the texture state
varying vec2 particleTextureIndex;

float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}
void main() {
    vec4 currState = texture2D(currParticleState, particleTextureIndex);
    vec4 prevState = texture2D(prevParticleState, particleTextureIndex);
    vec2 random = 0.5 - vec2(rand(currState.xy), rand(10.0 * currState.xy));
    vec2 velocity = currState.xy - prevState.xy;
    vec2 positionXY = currState.xy + (0.01 * random);
    float age = currState.w + 0.1;
    float nextZ = age;
    vec4 lifetime = texture2D(particleLifetime, particleTextureIndex);
    float start_time = lifetime.y;
    if (age > lifetime.x){
      nextZ = 0.;
      age = 0.;
    }
    if(u_time < start_time){
      gl_FragColor = vec4(currState);
    } else {
		// we store the new position as the color in this frame buffer
    gl_FragColor = vec4(positionXY, nextZ, age);
    }
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
**In the rest of the code in this file, we took the existing model from the github gist referenced in the final report (point 6 in reference for the link. The file is script.js), but adapted it a lot to work with our framework and get the results we wanted. We give you the original file for transparency.**
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
**We adapted most of this code by adding our files to load and giving our own list of actors.**

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
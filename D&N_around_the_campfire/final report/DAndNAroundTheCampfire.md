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




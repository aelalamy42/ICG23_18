
	// set the precision of floating point numbers
precision mediump float;
  // states to read from to get velocity
uniform sampler2D currParticleState;
uniform sampler2D prevParticleState;
uniform sampler2D particleLifetime;
uniform float u_time;

  // index into the texture state
varying vec2 particleTextureIndex;
  // seemingly standard 1-liner random function
  // http://stackoverflow.com/questions/4200224/random-noise-functions-for-glsl
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
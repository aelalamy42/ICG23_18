// set the precision of floating point numbers
precision mediump float;
  // states to read from to get velocity
uniform sampler2D currParticleState;
uniform sampler2D prevParticleState;
  // index into the texture state
varying vec2 particleTextureIndex;
  // seemingly standard 1-liner random function
  // http://stackoverflow.com/questions/4200224/random-noise-functions-for-glsl
float rand(vec3 co) {
    return fract(sin(dot(co.xyz, vec3(12.9898, 78.233, 43.4795))) * 43758.5453);
}
void main() {
    vec3 currPosition = texture2D(currParticleState, particleTextureIndex).xyz;
    vec3 prevPosition = texture2D(prevParticleState, particleTextureIndex).xyz;
    vec3 velocity = currPosition - prevPosition;
    vec3 random = 0.5 - vec3(rand(currPosition), rand(10.0 * currPosition), rand(100.0 * currPosition));
    vec3 position = currPosition + (0.95 * velocity) + (0.0005 * random);
		// we store the new position as the color in this frame buffer
    gl_FragColor = vec4(position, 1);
}
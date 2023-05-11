// set the precision of floating point numbers
precision mediump float;
  // states to read from to get velocity
uniform sampler2D currParticleState;
uniform sampler2D prevParticleState;
  // index into the texture state
varying vec2 particleTextureIndex;
  // seemingly standard 1-liner random function
  // http://stackoverflow.com/questions/4200224/random-noise-functions-for-glsl
float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}
void main() {
    vec2 currPosition = texture2D(currParticleState, particleTextureIndex).xy;
    vec2 prevPosition = texture2D(prevParticleState, particleTextureIndex).xy;
    vec2 velocity = currPosition - prevPosition;
    vec2 random = 0.5 - vec2(rand(currPosition), rand(10.0 * currPosition));
    vec2 position = currPosition + (0.95 * velocity) + (0.0005 * random);
		// we store the new position as the color in this frame buffer
    gl_FragColor = vec4(position, 0., 1);
}
// set the precision of floating point numbers
precision mediump float;
attribute vec2 particleTextureIndex;
uniform sampler2D particleState;
uniform sampler2D particleLifetime;
uniform mat4 mat_mvp;
uniform float pointWidthFactor;
  // variables to send to the fragment shader
varying vec3 fragColor;
varying float alpha_factor;
varying vec2 idx;

float rand(vec2 co)
{
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
  // read in position from the state texture
    vec4 state = texture2D(particleState, particleTextureIndex);
    float lifetime = texture2D(particleLifetime, particleTextureIndex).x;
	// copy color over to fragment shader
    fragColor = mix(vec3(1.), vec3(0.776, 0.78, 0.855), length(particleTextureIndex));//TODO: enlever ca
    idx = particleTextureIndex;
	// scale to normalized device coordinates
	// gl_Position is a special variable that holds the position of a vertex
    float x = 1./8. * (lifetime - state.w);
    alpha_factor = 5.* x*x - 2.*x*x*x;

		// read in position from the state texture
  vec3 position = texture2D(particleState, particleTextureIndex).xyz;
		// copy color over to fragment shader
  fragColor = mix(vec3(0.), vec3(0.4), length(particleTextureIndex));
	idx = particleTextureIndex;
  	// scale to normalized device coordinates
		// gl_Position is a special variable that holds the position of a vertex
  gl_Position = mat_mvp * vec4(position, 1.0);

  // update the size of a particles based on the prop pointWidth and a random value done with noise
  // to make it look more realistic
  gl_PointSize = (rand(particleTextureIndex) + 1. ) * 65. * pointWidthFactor;
}
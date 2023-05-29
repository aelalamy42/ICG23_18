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
// set the precision of floating point numbers
precision mediump float;
attribute vec2 particleTextureIndex;
uniform sampler2D particleState;
uniform mat4 mat_mvp;
// variables to send to the fragment shader
varying vec3 fragColor;
varying vec2 idx;
// values that are the same for all vertices
uniform float pointWidth;
void main() {
	// read in position from the state texture
    vec3 position = texture2D(particleState, particleTextureIndex).xyz;
	// copy color over to fragment shader
    fragColor = mix(vec3(1.), vec3(0.776, 0.78, 0.855), length(particleTextureIndex));
    idx = particleTextureIndex;
	// scale to normalized device coordinates
	// gl_Position is a special variable that holds the position of a vertex

    gl_Position = mat_mvp * vec4(position, 1.0);

	// update the size of a particles based on the prop pointWidth
    gl_PointSize = pointWidth;
}
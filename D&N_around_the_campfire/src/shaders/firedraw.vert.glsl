// set the precision of floating point numbers
precision mediump float;
attribute vec2 particleTextureIndex;
uniform sampler2D particleState;
uniform mat4 mat_mvp;
  // variables to send to the fragment shader
varying vec3 fragColor;
  // values that are the same for all vertices
uniform float pointWidth;
void main() {
		// read in position from the state texture
  vec3 position = texture2D(particleState, particleTextureIndex).xyz;
		// copy color over to fragment shader
  fragColor = mix(vec3(0.), vec3(0.4), length(particleTextureIndex));
		// scale to normalized device coordinates
		// gl_Position is a special variable that holds the position of a vertex
  gl_Position = mat_mvp * vec4(position, 1.0);

		// update the size of a particles based on the prop pointWidth
  gl_PointSize = pointWidth;
}
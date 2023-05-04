// Vertex attributes, specified in the "attributes" entry of the pipeline
attribute vec3 vertex_position;
attribute vec2 vertex_tex_coords;

// Per-vertex outputs passed on to the fragment shader
varying vec2 v2f_uv;

// Global variables specified in "uniforms" entry of the pipeline
uniform mat4 mat_mvp;

uniform float sim_time;

void main() {
	v2f_uv = vec2(vertex_tex_coords.x + sim_time/500., vertex_tex_coords.y);
	gl_Position = mat_mvp * vec4(vertex_position, 1);
}

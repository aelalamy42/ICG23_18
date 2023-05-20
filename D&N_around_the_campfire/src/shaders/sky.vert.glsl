// Vertex attributes, specified in the "attributes" entry of the pipeline
attribute vec3 vertex_position;
attribute vec2 vertex_tex_coords;

// Per-vertex outputs passed on to the fragment shader
varying vec2 v2f_uv;
varying vec3 v2f_color;

// Global variables specified in "uniforms" entry of the pipeline
uniform mat4 mat_mvp;

uniform float sim_time;

void main() {
	vec3 day_color = vec3(0.55, 0.86, 0.99);
	vec3 night_color = vec3(0.01, 0., 0.07);
	float alpha = sin(sim_time);
	v2f_color = mix(day_color, night_color, (alpha + 1.)/2.);
	v2f_uv = vertex_tex_coords;
	gl_Position = mat_mvp * vec4(vertex_position, 1);
}

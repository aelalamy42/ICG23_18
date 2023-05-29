attribute vec3 vertex_position;
attribute vec3 vertex_normal;
attribute vec2 vertex_tex_coords;

varying vec3 v2f_normal;
varying vec4 v2f_vertex_position;
varying vec2 v2f_uv;

uniform mat4 mat_mvp;
uniform mat4 mat_model_view;
uniform mat3 mat_normals_to_view;

void main() {
	v2f_uv = vertex_tex_coords;
	v2f_vertex_position = mat_model_view * vec4(vertex_position, 1);
	v2f_normal = normalize(mat_normals_to_view * vertex_normal);
	
	gl_Position = mat_mvp * vec4(vertex_position, 1);

}

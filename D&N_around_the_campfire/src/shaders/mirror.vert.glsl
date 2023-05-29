attribute vec3 vertex_position;
attribute vec3 vertex_normal;

varying vec4 v2f_dir_to_camera;
varying vec3 v2f_normal;

uniform mat4 mat_mvp;
uniform mat4 mat_model_view;
uniform mat3 mat_normals_to_view;


void main() {
	v2f_dir_to_camera = normalize(mat_model_view * vec4(vertex_position, 1));
	v2f_normal = normalize(mat_normals_to_view * vertex_normal);
	gl_Position = mat_mvp * vec4(vertex_position, 1);
}

attribute vec3 vertex_position;
attribute vec3 vertex_normal;
varying vec3 vertex_to_fragment;

uniform mat4 mat_mvp;
uniform mat3 mat_normals_to_view;

void main() {
	vertex_to_fragment = normalize(mat_normals_to_view * vertex_normal);
	gl_Position = mat_mvp * vec4(vertex_position, 1);
}

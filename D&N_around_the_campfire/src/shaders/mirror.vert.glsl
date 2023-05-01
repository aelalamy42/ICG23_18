// Vertex attributes, specified in the "attributes" entry of the pipeline
attribute vec3 vertex_position;
attribute vec3 vertex_normal;

// Per-vertex outputs passed on to the fragment shader

varying vec4 v2f_dir_to_camera;
varying vec3 v2f_normal;

// Global variables specified in "uniforms" entry of the pipeline
uniform mat4 mat_mvp;
uniform mat4 mat_model_view;
uniform mat3 mat_normals_to_view;


void main() {
	// viewing vector (from camera to vertex in view coordinates), camera is at vec3(0, 0, 0) in cam coords
	v2f_dir_to_camera = normalize(mat_model_view * vec4(vertex_position, 1));
	// transform normal to camera coordinates
	v2f_normal = normalize(mat_normals_to_view * vertex_normal);
	
	gl_Position = mat_mvp * vec4(vertex_position, 1);
}

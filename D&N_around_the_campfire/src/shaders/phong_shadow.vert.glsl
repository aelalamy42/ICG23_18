// Vertex attributes, specified in the "attributes" entry of the pipeline
attribute vec3 vertex_position;
attribute vec3 vertex_normal;
attribute vec2 vertex_tex_coords;


// Per-vertex outputs passed on to the fragment shader

/* #TODO GL3.3.1: Pass on the normals and fragment position in camera coordinates */
varying vec3 v2f_normal;
varying vec4 v2f_vertex_position;
varying vec2 v2f_uv;

// Global variables specified in "uniforms" entry of the pipeline
uniform mat4 mat_mvp;
uniform mat4 mat_model_view;
uniform mat3 mat_normals_to_view;

void main() {
	v2f_uv = vertex_tex_coords;
	// viewing vector (from camera to vertex in view coordinates), camera is at vec3(0, 0, 0) in cam coords
	// vertex position in camera coordinates
	// transform normal to camera coordinates
	v2f_vertex_position = mat_model_view * vec4(vertex_position, 1);
	v2f_normal = normalize(mat_normals_to_view * vertex_normal);
	
	gl_Position = mat_mvp * vec4(vertex_position, 1);

}

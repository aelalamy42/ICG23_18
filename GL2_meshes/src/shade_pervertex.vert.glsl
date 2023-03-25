// Vertex attributes, specified in the "attributes" entry of the pipeline
attribute vec3 vertex_position;
attribute vec3 vertex_normal;

// Per-vertex outputs passed on to the fragment shader

/* #TODO GL2.3
	Pass the values needed for per-pixel
	Create a vertex-to-fragment variable.
*/
varying vec3 vertex_to_fragment;

// Global variables specified in "uniforms" entry of the pipeline
uniform mat4 mat_mvp;
uniform mat4 mat_model_view;
uniform mat3 mat_normals_to_view;

uniform vec3 light_position; //in camera space coordinates already

uniform vec3 material_color;
uniform float material_shininess;
uniform vec3 light_color;

void main() {
	float material_ambient = 0.1;

	/** #TODO GL2.3 Gouraud lighting
	Compute the visible object color based on the Blinn-Phong formula.

	Hint: Compute the vertex position, normal and light_position in eye space.
	Hint: Write the final vertex position to gl_Position
	*/
	vec3 normal_view = normalize(mat_normals_to_view * vertex_normal);
	vec3 vertex_view = (mat_model_view * vec4(vertex_position, 1)).xyz;
	vec3 halfway_vect = normalize(light_position - 2.*vertex_view);

	vertex_to_fragment = material_ambient * light_color + light_color * material_color * dot(normal_view, normalize(light_position - vertex_view)) + light_color * material_color * pow(dot(halfway_vect, normal_view), material_shininess);
	gl_Position = mat_mvp * vec4(vertex_position, 1);

}

precision highp float;

/* #TODO GL3.3.1: Pass on the normals and fragment position in camera coordinates */
varying vec3 v2f_normal;
varying vec4 v2f_vertex_position;
varying vec2 v2f_uv;


uniform vec3 light_position; // light position in camera coordinates
uniform vec3 light_color;
uniform samplerCube cube_shadowmap;
uniform sampler2D tex_color;

void main() {

	float material_shininess = 12.;

	vec3 material_color = texture2D(tex_color, v2f_uv).xyz;
	vec3 color = vec3(0.);
	vec3 distance_to_light = light_position - v2f_vertex_position.xyz;
	vec3 direction_to_light = normalize(distance_to_light);
	vec3 halfway_vect = normalize(direction_to_light - normalize(v2f_vertex_position.xyz));

	float shadowDistance = textureCube(cube_shadowmap, - direction_to_light).r;
	
	if(length(distance_to_light) <= 1.05 * shadowDistance){
		color += light_color * material_color * dot(v2f_normal, direction_to_light);
		color += light_color * material_color * pow(dot(halfway_vect, v2f_normal), material_shininess);
	}
	color = color / pow(length(distance_to_light), 2.);
	
	gl_FragColor = vec4(color, 1.); // output: RGBA in 0..1 range
}
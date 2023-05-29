precision mediump float;

varying vec4 v2f_dir_to_camera;
varying vec3 v2f_normal;

uniform samplerCube cube_env_map;

void main()
{
	vec3 reflect_vect = normalize(reflect(v2f_dir_to_camera.xyz, v2f_normal));
	vec3 color = textureCube(cube_env_map, reflect_vect).xyz;
	gl_FragColor = vec4(color, 1.);
}

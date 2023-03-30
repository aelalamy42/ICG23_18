precision mediump float;

/* #TODO GL3.2.3
	Setup the varying values needed to compue the Phong shader:
	* surface normal
	* view vector: direction to camera
*/
varying vec4 v2f_dir_to_camera;
varying vec3 v2f_normal;

uniform samplerCube cube_env_map;

void main()
{
	/*
	/* #TODO GL3.2.3: Mirror shader
	Calculate the reflected ray direction R and use it to sample the environment map.
	Pass the resulting color as output.
	*/
	vec3 reflect_vect = normalize(reflect(v2f_dir_to_camera.xyz, v2f_normal));
	vec3 color = textureCube(cube_env_map, reflect_vect).xyz;
	gl_FragColor = vec4(color, 1.); // output: RGBA in 0..1 range
}

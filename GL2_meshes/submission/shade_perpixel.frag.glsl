precision mediump float;

/* #TODO GL2.4
	Setup the varying values needed to compue the Phong shader:
	* surface normal
	* lighting vector: direction to light
	* view vector: direction to camera
*/
varying vec3 v2f_normal;
varying vec3 v2f_dir_to_light;
varying vec3 v2f_dir_from_view;

uniform vec3 material_color;
uniform float material_shininess;
uniform vec3 light_color;

void main()
{
	float material_ambient = 0.1;

	/*
	/** #TODO GL2.4: Apply the Blinn-Phong lighting model

	Implement the Blinn-Phong shading model by using the passed
	variables and write the resulting color to `color`.

	Make sure to normalize values which may have been affected by interpolation!
	*/
	vec3 halfway_vect = normalize(v2f_dir_to_light - v2f_dir_from_view);
	vec3 color = material_ambient * material_color * light_color;
	if(dot(v2f_normal, v2f_dir_to_light) > 0.){
		color += light_color * material_color * dot(v2f_normal, normalize(v2f_dir_to_light));
		if(dot(v2f_normal, halfway_vect) > 0.){
			color += light_color * material_color * pow(dot(halfway_vect, v2f_normal), material_shininess);
		}
	}
	gl_FragColor = vec4(color, 1.); // output: RGBA in 0..1 range
}

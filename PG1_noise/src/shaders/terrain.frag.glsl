precision highp float;

varying float v2f_height;

/* #TODO PG1.6.1: Copy Blinn-Phong shader setup from previous exercises */
varying vec3 v2f_normal;
varying vec3 v2f_light_pos;
varying vec3 v2f_vert_pos;


const vec3  light_color = vec3(1.0, 0.941, 0.898);
// Small perturbation to prevent "z-fighting" on the water on some machines...
const float terrain_water_level    = -0.03125 + 1e-6;
const vec3  terrain_color_water    = vec3(0.29, 0.51, 0.62);
const vec3  terrain_color_mountain = vec3(0.8, 0.5, 0.4);
const vec3  terrain_color_grass    = vec3(0.33, 0.43, 0.18);

void main()
{
	const vec3 ambient = 0.2 * light_color; // Ambient light intensity
	float height = v2f_height;

	/* #TODO PG1.6.1
	Compute the terrain color ("material") and shininess based on the height as
	described in the handout. `v2f_height` may be useful.
	
	Water:
			color = terrain_color_water
			shininess = 30.
	Ground:
			color = interpolate between terrain_color_grass and terrain_color_mountain, weight is (height - terrain_water_level)*2
	 		shininess = 2.
	*/
	vec3 material_color = vec3(0.);
	float shininess = 0.5;
	if(v2f_height < terrain_water_level){
		material_color = terrain_color_water;
		shininess = 30.;
	} else {
		material_color = mix(terrain_color_grass, terrain_color_mountain, (height - terrain_water_level)*2.);
		shininess = 2.;
	}

	/* #TODO PG1.6.1: apply the Blinn-Phong lighting model
    	Implement the Phong shading model by using the passed variables and write the resulting color to `color`.
    	`material_color` should be used as material parameter for ambient, diffuse and specular lighting.
    	Hints:
	*/
	vec3 dir_to_light = normalize(v2f_light_pos - v2f_vert_pos);
	vec3 dir_to_view = normalize(- v2f_vert_pos);
	vec3 halfway_vect = normalize(dir_to_light + dir_to_view);


	vec3 color = ambient * light_color *material_color;
	if(dot(v2f_normal, dir_to_light) > 0.){
		color += light_color * material_color * dot(v2f_normal, dir_to_light);
		if(dot(v2f_normal, halfway_vect) > 0.){
			color += light_color * material_color * pow(dot(halfway_vect, v2f_normal), shininess);
		}
	}
	color = v2f_normal * 0.5 + vec3(0.5);
	gl_FragColor = vec4(color, 1.); // output: RGBA in 0..1 range
}

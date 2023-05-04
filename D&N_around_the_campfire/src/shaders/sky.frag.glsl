precision mediump float;
		
// Texture coordinates passed from vertex shader
varying vec2 v2f_uv;

// Texture to sample color from
uniform sampler2D tex_color;
// Texture to sample the cloud "mask" from
uniform sampler2D tex_mask;


void main()
{
	vec3 color = texture2D(tex_color, v2f_uv).xyz;
	vec4 mask = texture2D(tex_mask, v2f_uv);
	if (mask.a > 0.){
		gl_FragColor = vec4(mask);
	}
	else {
		gl_FragColor = vec4(color, 1.);
	}
}

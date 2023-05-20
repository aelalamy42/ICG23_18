precision mediump float;
		
// Texture coordinates passed from vertex shader
varying vec2 v2f_uv;
varying vec3 v2f_color;

// Texture to sample color from
uniform sampler2D tex_color;



void main()
{
	vec3 color = texture2D(tex_color, v2f_uv).xyz;
	gl_FragColor = vec4(v2f_color, 1.);
}

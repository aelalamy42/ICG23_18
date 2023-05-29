precision mediump float;
	
varying vec3 v2f_color;

void main()
{
	gl_FragColor = vec4(v2f_color, 1.);
}

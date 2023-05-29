precision mediump float;
varying vec3 vertex_to_fragment;

void main()
{
	vec3 color = vertex_to_fragment * 0.5 + 0.5; 
	gl_FragColor = vec4(color, 1.); 
}

precision mediump float;

varying vec3 v2f_position_view;

void main () {
	float depth = length(v2f_position_view); 
	gl_FragColor = vec4(depth, depth, depth, 1.);

}

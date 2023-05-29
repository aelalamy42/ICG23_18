
attribute vec2 position;

varying vec2 v2f_position;

uniform vec2 preview_rect_scale;

void main() {
	v2f_position = position;

	gl_Position = vec4(position * preview_rect_scale - vec2(1., 1.), -0.98, 1);
}

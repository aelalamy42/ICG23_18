// set the precision of floating point numbers
precision mediump float;
attribute vec2 particleTextureIndex;
uniform sampler2D particleState;
uniform mat4 mat_mvp;

varying vec3 fragColor;
varying vec2 idx;

uniform float pointWidth;
void main() {
	
    vec3 position = texture2D(particleState, particleTextureIndex).xyz;
	
    fragColor = mix(vec3(1.), vec3(0.776, 0.78, 0.855), length(particleTextureIndex));
    idx = particleTextureIndex;
	
    gl_Position = mat_mvp * vec4(position, 1.0);
    gl_PointSize = pointWidth;
}
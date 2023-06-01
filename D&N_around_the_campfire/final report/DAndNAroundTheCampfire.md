## clouddraw.frag.glsl
void main() {
    vec2 cxy = gl_PointCoord - vec2(0.5);
    float d = dot(cxy, cxy);
    float g = 2. * exp(-3. * d) - 1.2;
    float alpha = g + 0.5 * perlin_fbm((gl_PointCoord + vec2(0.5*u_time) + 3. * idx));
    vec3 day_color = mix(vec3(1.), vec3(0.776, 0.78, 0.855), length(idx));
    vec3 night_color = mix( vec3(0.776, 0.78, 1.), vec3(0.043, 0.13, 0.286), length(idx));
    float night_to_day_alpha = (sin(u_time) + 1.) /2.;
    vec3 color = mix(day_color, night_color, night_to_day_alpha);
    gl_FragColor = vec4(color, alpha);
}

## clouddraw.vert.glsl
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

## cloudupdate.frag.glsl

precision mediump float;

uniform sampler2D currParticleState;

varying vec2 particleTextureIndex;

float rand(vec3 co) {
    return fract(sin(dot(co.xyz, vec3(12.9898, 78.233, 43.4795))) * 43758.5453);
}
void main() {
    vec3 currPosition = texture2D(currParticleState, particleTextureIndex).xyz;
    vec3 position = currPosition;
		// we store the new position as the color in this frame buffer
    gl_FragColor = vec4(position, 1);
}

## cloudupdate.vert.glsl
precision mediump float;

attribute vec2 position;

varying vec2 particleTextureIndex;
void main() {
    particleTextureIndex = 0.5 * (1.0 + position);
    gl_Position = vec4(position, 0, 1);
}

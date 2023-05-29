
precision mediump float;

uniform sampler2D currParticleState;
uniform sampler2D prevParticleState;

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
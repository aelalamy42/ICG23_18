precision mediump float;

attribute vec2 position;

varying vec2 particleTextureIndex;
void main() {
    particleTextureIndex = 0.5 * (1.0 + position);
    gl_Position = vec4(position, 0, 1);
}
 // set the precision of floating point numbers
precision mediump float;
  // vertex of the triangle
attribute vec2 position;
  // index into the texture state
varying vec2 particleTextureIndex;
void main() {
    // map bottom left -1,-1 (normalized device coords) to 0,0 (particle texture index)
    // and 1,1 (ndc) to 1,1 (texture)
    particleTextureIndex = 0.5 * (1.0 + position);
    gl_Position = vec4(position, 0, 1);
}
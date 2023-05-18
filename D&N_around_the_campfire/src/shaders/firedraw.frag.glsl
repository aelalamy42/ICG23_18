// set the precision of floating point numbers
precision mediump float;
  // this value is populated by the vertex shader
varying vec3 fragColor;
void main() {
	float r = 0.0;
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    r = dot(cxy, cxy);
    if (r > 1.0) { // if the radius is greater than 1.0, discard the pixel
        discard;
    }
    // gl_FragColor is a special variable that holds the color of a pixel
	gl_FragColor = vec4(fragColor, 1);
}
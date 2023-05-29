// set the precision of floating point numbers
precision mediump float;

uniform float u_time;

// this value is populated by the vertex shader
varying vec2 idx;
varying float alpha_factor;
  #define NUM_GRADIENTS 12


void main() {
    vec2 cxy = gl_PointCoord - vec2(0.5);
    float d = dot(cxy, cxy);
    float g = 2. * exp(-3. * d) - 1.2;
    // Using a periodic function for alpha to make the fireflies only appear during the night
    float alpha = (atan(5. * sin(u_time), 1.) / atan(5., 1.) + 1.)/ 2. * (3. * g);
    vec3 colorfireflies1 = vec3(0.28, 1.0, 0.38);
    vec3 colorfireflies2 = vec3(0.95, 0.77, 0.16);
    vec3 color = mix(colorfireflies1, colorfireflies2, length(idx) * alpha_factor); // mixing the colors more realisticly 
    gl_FragColor = vec4(color, alpha_factor * alpha);
}
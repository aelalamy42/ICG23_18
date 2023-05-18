// set the precision of floating point numbers
precision mediump float;
  // this value is populated by the vertex shader
uniform float u_time;
varying vec3 fragColor;
vec3 fireColor(float t, vec2 st) {
    vec3 color = vec3(0.0);
    color += vec3(1.0, 1.0, 0.0) * smoothstep(0.05, 0.25, st.y);
    color += vec3(1.0, 0.5, 0.0) * smoothstep(0.25, 0.5, st.y);      
    color += vec3(1.0, 0.0, 0.0) * smoothstep(0.5, 0.75, st.y);
    color += vec3(0.5, 0.0, 0.0) * smoothstep(0.75, 0.95, st.y);
    color += vec3(1.0, 1.0, 1.0) * pow(t, 4.0) * 0.1;
      return color;
    }
vec3 smokeColor(float t, vec2 st) { // à tester 
  vec3 color = vec3(0.0);
  color += vec3(0.0, 0.0, 0.0) * smoothstep(0.05, 0.25, st.y);
  color += vec3(0.0, 0.0, 0.0) * smoothstep(0.25, 0.5, st.y);
  color += vec3(0.0, 0.0, 0.0) * smoothstep(0.5, 0.75, st.y);
  color += vec3(0.0, 0.0, 0.0) * smoothstep(0.75, 0.95, st.y);
  color += vec3(1.0, 1.0, 1.0) * pow(t, 4.0) * 0.1;
    return color;
}

void main() {
	float r = 0.0;
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    r = dot(cxy, cxy);
    if (r > 1.0) { // if the radius is greater than 1.0, discard the pixel
        discard;
    }
    // gl_FragColor is a special variable that holds the color of a pixel
  
    vec2 st = gl_PointCoord.xy;
    float t = u_time * 0.05;
    vec2 pos = st + vec2(0.0, t * 0.25);
    vec3 color = fireColor(t, pos);
	  gl_FragColor = vec4(color, 1);
}
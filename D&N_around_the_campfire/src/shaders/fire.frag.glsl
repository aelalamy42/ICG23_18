
precision mediump float;

uniform float u_time;

const float freq_multiplier = 2.17;
const float ampl_multiplier = 0.5;
const int num_octaves = 4;

// We use here a perlin noise function to generate a random value and make the fire more realistic and natural
float perlin_noise(in vec2 point) {
    vec2 c00 = floor(point);
	vec2 c10 = c00 + vec2(1, 0);
	vec2 c01 = c00 + vec2(0, 1);
	vec2 c11 = c00 + vec2(1, 1);

	vec2 g00 = gradients(hash_func(c00));
	vec2 g10 = gradients(hash_func(c10));
	vec2 g01 = gradients(hash_func(c01));
	vec2 g11 = gradients(hash_func(c11));

	vec2 a = point - c00;
	vec2 b = point - c10;
	vec2 c = point - c01;
	vec2 d = point - c11;
	
	float s = dot(g00, a);
	float t = dot(g10, b);
	float u = dot(g01, c);
	float v = dot(g11, d);

	float st = mix(s, t, blending_weight_poly(point.x - c00.x));
	float uv = mix(u, v, blending_weight_poly(point.x - c00.x));
	float result = mix(st, uv, blending_weight_poly(point.y - c00.y));
	return result;
}

float turbulence(in vec2 point) {
	float res = 0.;
	for(int i = 0; i < num_octaves; i++) {
		res += pow(ampl_multiplier, float(i)) * abs(perlin_noise(point * pow(freq_multiplier, float(i))));
	}
	return res;
}

vec3 fireColor(float t, vec2 st) {
  vec3 color = vec3(0.0);
  color += vec3(1.0, 1.0, 0.0) * smoothstep(0.05, 0.25, st.y);
  color += vec3(1.0, 0.5, 0.0) * smoothstep(0.25, 0.5, st.y);
  color += vec3(1.0, 0.0, 0.0) * smoothstep(0.5, 0.75, st.y);
  color += vec3(0.5, 0.0, 0.0) * smoothstep(0.75, 0.95, st.y);
  color += vec3(1.0, 1.0, 1.0) * pow(t, 4.0) * 0.1;
  return color;
}

void main() {
 /**/ vec2 st = gl_PointCoord.xy; // we use gl_PointCoord because the fragment shader is called once per particle and 
  // it gives us the position within the current particle's texture coordinates

  float t = u_time * 0.1;

  vec2 noiseOffset = vec2(turbulence(st), t);
  vec2 pos = st + vec2(0.0, t * 0.25);
  vec2 noisePos = pos + noiseOffset;

  float noiseVal = perlin_noise(noisePos * 4.0); // TODO should try different values and try if turbulance works better or not
  noiseVal += perlin_noise((noisePos + vec2(0.5)) * 10.0) * 0.5;
  noiseVal += perlin_noise((noisePos + vec2(0.25, 0.25)) * 20.0) * 0.25;
  noiseVal += perlin_noise((noisePos + vec2(-0.25, 0.5)) * 40.0) * 0.125;

  vec3 color = fireColor(t, pos);
  color *= pow(noiseVal, 2.0) * 2.0;

  gl_FragColor = vec4(1.,1.,1., 1.0);
}
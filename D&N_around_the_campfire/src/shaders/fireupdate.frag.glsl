// set the precision of floating point numbers
precision mediump float;
  // states to read from to get velocity
uniform sampler2D currParticleState;
uniform sampler2D prevParticleState;

  // index into the texture state
varying vec2 particleTextureIndex;
  // seemingly standard 1-liner random function
  // http://stackoverflow.com/questions/4200224/random-noise-functions-for-glsl
float rand(vec3 co) {
    return fract(sin(dot(co.xyz, vec3(12.9898, 78.233, 43.4795))) * 43758.5453);
}
uniform float u_time;

const float freq_multiplier = 2.17;
const float ampl_multiplier = 0.5;
const int num_octaves = 4;

#define NUM_GRADIENTS 12

// -- Gradient table --
vec2 gradients(int i) {
	if (i ==  0) return vec2( 1,  1);
	if (i ==  1) return vec2(-1,  1);
	if (i ==  2) return vec2( 1, -1);
	if (i ==  3) return vec2(-1, -1);
	if (i ==  4) return vec2( 1,  0);
	if (i ==  5) return vec2(-1,  0);
	if (i ==  6) return vec2( 1,  0);
	if (i ==  7) return vec2(-1,  0);
	if (i ==  8) return vec2( 0,  1);
	if (i ==  9) return vec2( 0, -1);
	if (i == 10) return vec2( 0,  1);
	if (i == 11) return vec2( 0, -1);
	return vec2(0, 0);
}

float hash_poly(float x) {
	return mod(((x*34.0)+1.0)*x, 289.0);
}

// -- Hash function --
// Map a gridpoint to 0..(NUM_GRADIENTS - 1)
int hash_func(vec2 grid_point) {
	return int(mod(hash_poly(hash_poly(grid_point.x) + grid_point.y), float(NUM_GRADIENTS)));
}

// -- Smooth interpolation polynomial --
// Use mix(a, b, blending_weight_poly(t))
float blending_weight_poly(float t) {
	return t*t*t*(t*(t*6.0 - 15.0)+10.0);
}


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

float overlay(in float a, in float b) {        
    if (a < .5) {
        return 2. * a * b;
    } else {
        return 1. - 2. * (1. - a) * (1. - b);
    }
}


void main() {
    vec3 currPosition =  texture2D(currParticleState, particleTextureIndex).xyz;
    vec3 prevPosition =  texture2D(prevParticleState, particleTextureIndex).xyz;
    vec3 velocity = currPosition - prevPosition;
    vec2 st = velocity.xy;
    float t = u_time * 0.1;
    vec2 noiseOffset = vec2(turbulence(st), t);
    vec2 pos = st + vec2(0.0, t * 0.25);
    vec2 noisePos = pos + noiseOffset;

    float noiseVal = perlin_noise(noisePos * 4.0); // TODO should try different values and try if turbulance works better or not
    noiseVal += perlin_noise((noisePos + vec2(0.5)) * 10.0) * 0.5;
    noiseVal += perlin_noise((noisePos + vec2(0.25, 0.25)) * 20.0) * 0.25;
    noiseVal += perlin_noise((noisePos + vec2(-0.25, 0.5)) * 40.0) * 0.125;
    
    vec3 position = currPosition;
    if (position.z > 5.) {
        position = currPosition - vec3(0., 0.,  0.5 * noiseVal); // TODO à revoir 
    } else {
        position = currPosition + vec3(0., 0.,  0.1 * noiseVal);
    }
    // Keep the particles within the specified range on the Z-axis
    position.z = clamp(position.z, 0.0, 5.0);
    // Vary the position on the X and Y axes using Perlin noise
    position.x = perlin_noise(noisePos * 2.0) * 0.5;
    position.y = perlin_noise(noisePos * 3.0) * 0.5;

    // Overlay
    float grady = 1. - smoothstep(0., 1., currPosition.y);
    float gradx = 1. - smoothstep(0., 1., currPosition.x);
    position.x = overlay(position.x, grady);
    position.y = overlay(position.y, gradx);

    gl_FragColor = vec4(position, 1);
}
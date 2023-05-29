// set the precision of floating point numbers
precision mediump float;
  // states to read from to get velocity
uniform sampler2D currParticleState;
uniform sampler2D prevParticleState;
uniform sampler2D particleLifetime;
uniform float u_time;

  // index into the texture state
varying vec2 particleTextureIndex;

float rand(vec2 co)
{
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

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


int hash_func(vec2 grid_point) {
	return int(mod(hash_poly(hash_poly(grid_point.x) + grid_point.y), float(NUM_GRADIENTS)));
}


float blending_weight_poly(float t) {
	return t*t*t*(t*(t*6.0 - 15.0)+10.0);
}


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
    vec4 currPosition =  texture2D(currParticleState, particleTextureIndex);
    vec4 prevPosition =  texture2D(prevParticleState, particleTextureIndex);
    vec4 velocity = currPosition - prevPosition;
    vec2 st = velocity.xy;
    float t = u_time * 0.1;
    vec2 noiseOffset = vec2(turbulence(st), t);
    vec2 pos = st + vec2(0.0, t * 0.25);
    vec2 noisePos = pos + noiseOffset;

    float noiseVal = perlin_noise(noisePos * 4.0);
    noiseVal += perlin_noise((noisePos + vec2(0.5)) * 10.0) * 0.5;
    noiseVal += perlin_noise((noisePos + vec2(0.25, 0.25)) * 20.0) * 0.25;
    noiseVal += perlin_noise((noisePos + vec2(-0.25, 0.5)) * 40.0) * 0.125;
    
    vec3 position = currPosition.xyz;
    // Clamping the fire so it dosen't go too far on the z axis
    position.z = clamp(position.z, 0.0, 5.0);
    // Vary the position on the X and Y axes using Perlin noise
    position.x = perlin_noise(noisePos * 2.0) * 0.5;
    position.y = perlin_noise(noisePos * 3.0) * 0.5;

    // Overlay to have more fire at the bottom 
    float grady = 1. - smoothstep(0., 1., currPosition.y);
    float gradx = 1. - smoothstep(0., 1., currPosition.x);
    position.x = overlay(position.x, grady);
    position.y = overlay(position.y, gradx);

    float age = currPosition.w + 0.1;
    float nextZ = age;
    vec4 lifetime = texture2D(particleLifetime, particleTextureIndex);
    // Randomising the lifetime of each fire particle to make it more realistic 
    lifetime.x = lifetime.x + (rand(particleTextureIndex) + 1. ) * 1.;
    float start_time = lifetime.y + (rand(particleTextureIndex) + 1. ) * 2.;
    if (age > lifetime.x){
      nextZ = 0.;
      age = 0.;
    }
    if(u_time < start_time){
      gl_FragColor = vec4(currPosition);
    } else {
      position.z = nextZ;
      gl_FragColor = vec4(position, age);
    }
}
// set the precision of floating point numbers
precision mediump float;

uniform float u_time;

varying vec2 idx;
varying float alpha_factor;
  #define NUM_GRADIENTS 12

const float freq_multiplier = 2.17;
const float ampl_multiplier = 0.5;
const int num_octaves = 4;

// -- Gradient table --
vec2 gradients(int i) {
    if(i == 0)
        return vec2(1, 1);
    if(i == 1)
        return vec2(-1, 1);
    if(i == 2)
        return vec2(1, -1);
    if(i == 3)
        return vec2(-1, -1);
    if(i == 4)
        return vec2(1, 0);
    if(i == 5)
        return vec2(-1, 0);
    if(i == 6)
        return vec2(1, 0);
    if(i == 7)
        return vec2(-1, 0);
    if(i == 8)
        return vec2(0, 1);
    if(i == 9)
        return vec2(0, -1);
    if(i == 10)
        return vec2(0, 1);
    if(i == 11)
        return vec2(0, -1);
    return vec2(0, 0);
}

float hash_poly(float x) {
    return mod(((x * 34.0) + 1.0) * x, 289.0);
}

// -- Hash function --
// Map a gridpoint to 0..(NUM_GRADIENTS - 1)
int hash_func(vec2 grid_point) {
    return int(mod(hash_poly(hash_poly(grid_point.x) + grid_point.y), float(NUM_GRADIENTS)));
}

// -- Smooth interpolation polynomial --
// Use mix(a, b, blending_weight_poly(t))
float blending_weight_poly(float t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}


float perlin_noise(vec2 point) {
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

float perlin_fbm(vec2 point) {
    float res = 0.;
    for(int i = 0; i < num_octaves; i++) {
        res += pow(ampl_multiplier, float(i)) * perlin_noise(point * pow(freq_multiplier, float(i)));
    }
    return res;
}
void main() {
    vec2 cxy = gl_PointCoord - vec2(0.5);
    float d = dot(cxy, cxy);
    float g = 2. * exp(-3. * d) - 1.2;
    float alpha = (atan(5. * sin(u_time + 1.57 + 0.785), 1.) / atan(5., 1.) + 1.)/ 2. * (atan(5. * sin(u_time + 3.14+ 0.785), 1.) / atan(5., 1.) + 1.)/ 2.* (g + 0.5 * perlin_fbm((gl_PointCoord + vec2(0.05*u_time) + 3. * idx)));
    vec3 color = mix(vec3(0.675, 0.651, 0.588), vec3(0.212, 0.196,0.196), length(idx));
    gl_FragColor = vec4(color, alpha_factor * alpha);
}
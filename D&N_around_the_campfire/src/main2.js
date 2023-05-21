import {createREGL} from "../lib/regljs_2.1.0/regl.module.js"
const width = window.innerWidth;
const height = window.innerHeight;
const pointWidth = 100;

const animationTickLimit = -1; // -1 disables
if (animationTickLimit >= 0) {
  console.log(`Limiting to ${animationTickLimit} ticks`);
}

const sqrtNumParticles = 4;
const numParticles = sqrtNumParticles * sqrtNumParticles;
console.log(`Using ${numParticles} particles`);

// initialize regl
const regl = createREGL({
	// need this to use the textures as states
  extensions: 'OES_texture_float',
});


// initial particles state and texture for buffer
// multiply by 4 for R G B A
const initialParticleState = new Float32Array(numParticles * 4);
for (let i = 0; i < numParticles; ++i) {
	const r = Math.sqrt(Math.random());
	const theta = Math.random() * 2 * Math.PI;
	// store x then y and then leave 2 spots empty
	initialParticleState[i * 4] = (2 * Math.random() - 1) * 0.5;;//r * Math.cos(theta); // x position
	initialParticleState[i * 4 + 1] = -1.;//r * Math.sin(theta);//2 * Math.random() - 1;// y position
	initialParticleState[i * 4 + 2] = Math.random() * 0.4 + 0.1; // velocity
}

// create a regl framebuffer holding the initial particle state
function createInitialParticleBuffer(initialParticleState) {
	// create a texture where R holds particle X and G holds particle Y position
	const initialTexture = regl.texture({
	  data: initialParticleState,
	  shape: [sqrtNumParticles, sqrtNumParticles, 4],
	  type: 'float'
	});

	// create a frame buffer using the state as the colored texture
	return regl.framebuffer({
		color: initialTexture,
		depth: false,
		stencil: false,
	});
}

// initialize particle states
let prevParticleState = createInitialParticleBuffer(initialParticleState);
let currParticleState = createInitialParticleBuffer(initialParticleState);
let nextParticleState = createInitialParticleBuffer(initialParticleState);

// cycle which buffer is being pointed to by the state variables
function cycleParticleStates() {
	const tmp = prevParticleState;
	prevParticleState = currParticleState;
	currParticleState = nextParticleState;
	nextParticleState = tmp;
}


// create array of indices into the particle texture for each particle
const particleTextureIndex = [];
for (let i = 0; i < sqrtNumParticles; i++) {
	for (let j = 0; j < sqrtNumParticles; j++) {
		particleTextureIndex.push(i / (sqrtNumParticles), j / (sqrtNumParticles));
	}
}

// regl command that updates particles state based on previous two
const updateParticles = regl({
	// write to a framebuffer instead of to the screen
  framebuffer: () => nextParticleState,
  // ^^^^^ important stuff.  ------------------------------------------

  vert: `
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
  `,

	frag: `
	// set the precision of floating point numbers
  precision mediump float;
  // states to read from to get velocity
	uniform sampler2D currParticleState;
	uniform sampler2D prevParticleState;
  // index into the texture state
  varying vec2 particleTextureIndex;
  // seemingly standard 1-liner random function
  // http://stackoverflow.com/questions/4200224/random-noise-functions-for-glsl
  float rand(vec2 co){
	  return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
	}
  void main() {
		vec2 currPosition = texture2D(currParticleState, particleTextureIndex).xy;
		vec2 prevPosition = texture2D(prevParticleState, particleTextureIndex).xy;
		float velocity = texture2D(currParticleState, particleTextureIndex).z;
		vec2 random = 0.5 - vec2(rand(currPosition), rand(10.0 * currPosition));
		vec2 position = currPosition + vec2(0., 0.005 * velocity) + (0.0005 * random);
		// we store the new position as the color in this frame buffer
  	gl_FragColor = vec4(position, velocity, 1);
  }
	`,

	attributes: {
		// a triangle big enough to fill the screen
    position: [
		-4, 0,
		4, 4,
		4, -4
    ]
  },

  // pass in previous states to work from
  uniforms: {
  	// must use a function so it gets updated each call
    currParticleState: () => currParticleState,
    prevParticleState: () => prevParticleState,
  },

  // it's a triangle - 3 vertices
  count: 3,
});


// regl command that draws particles at their current state
const drawParticles = regl({
	vert: `
	// set the precision of floating point numbers
  precision mediump float;
	attribute vec2 particleTextureIndex;
	uniform sampler2D particleState;
  // variables to send to the fragment shader
  varying vec3 fragColor;
  varying vec2 idx;
  // values that are the same for all vertices
  uniform float pointWidth;
	void main() {
		// read in position from the state texture
		vec2 position = texture2D(particleState, particleTextureIndex).xy;
		// copy color over to fragment shader
		fragColor = vec3(1.);
		idx = particleTextureIndex;
		// scale to normalized device coordinates
		// gl_Position is a special variable that holds the position of a vertex
		
    gl_Position = vec4(position, 0.0, 1.0);
	
		// update the size of a particles based on the prop pointWidth
		gl_PointSize = pointWidth;
	}
	`,

  frag: `
  // set the precision of floating point numbers
  precision mediump float;
  // this value is populated by the vertex shader
  varying vec3 fragColor;
  varying vec2 idx;
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


// Constants for FBM
const float freq_multiplier = 2.17;
const float ampl_multiplier = 0.5;
const int num_octaves = 4;

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
	/* #TODO PG1.4.2
	Implement 2D fBm as described in the handout. Like in the 1D case, you
	should use the constants num_octaves, freq_multiplier, and ampl_multiplier. 
	*/
	float res = 0.;
	for(int i = 0; i < num_octaves; i++) {
		res += pow(ampl_multiplier, float(i)) * perlin_noise(point * pow(freq_multiplier, float(i)));
	}
	return res;
}
  void main() {
	vec2 cxy = gl_PointCoord - vec2(0.5);
    float d = dot(cxy, cxy);
	float g = 2.*exp(-3.*d) - 1.;
	float alpha = g + 0.5 * perlin_fbm(gl_PointCoord+3.*idx);
    if (alpha <= 0.1) { // if the radius is greater than 1.0, discard the pixel
        discard;
    }
    // gl_FragColor is a special variable that holds the color of a pixel
    gl_FragColor = vec4(fragColor, alpha);
  }
  `,

	attributes: {
		// each of these gets mapped to a single entry for each of the points.
		// this means the vertex shader will receive just the relevant value for a given point.
		particleTextureIndex,
	},

	uniforms: {
		// important to use a function here so it gets the new buffer each render
		particleState: () => currParticleState,
		pointWidth,
	},

	blend : {
		enable: true,
		func: {
			  srcRGB: 'src alpha',
			  srcAlpha: 1,
			  dstRGB: 'one minus src alpha',
			  dstAlpha: 1
		},
		equation: {
			  rgb: 'add',
			  alpha: 'add'
		},
		color: [0., 0., 1., 0.],
	},

	// specify the number of points to draw
	count: numParticles,

	// specify that each vertex is a point (not part of a mesh)
	primitive: 'points',

  
});

// start the animation loop
const frameLoop = regl.frame(({ tick }) => {
	// clear the buffer
	regl.clear({
		// background color (black)
		color: [0, 0, 0, 1],
		depth: 1,
	});

	// draw the points using our created regl func
	drawParticles();

	// update position of particles in state buffers
	updateParticles();

	// update pointers for next, current, and previous particle states
	cycleParticleStates();

	// simple way of stopping the animation after a few ticks
	if (tick === animationTickLimit) {
		console.log(`Hit tick ${tick}, canceling animation loop`);

		// cancel this loop
		frameLoop.cancel();
	}
});
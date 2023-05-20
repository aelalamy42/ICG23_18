import {createREGL} from "../lib/regljs_2.1.0/regl.module.js"
const width = window.innerWidth;
const height = window.innerHeight;
const pointWidth = 5;

const animationTickLimit = -1; // -1 disables
if (animationTickLimit >= 0) {
  console.log(`Limiting to ${animationTickLimit} ticks`);
}

const sqrtNumParticles = 256;
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
	initialParticleState[i * 4] = r * Math.cos(theta); // x position
	initialParticleState[i * 4 + 1] = r * Math.sin(theta);//2 * Math.random() - 1;// y position
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
		vec2 velocity = currPosition - prevPosition;
		vec2 random = 0.5 - vec2(rand(currPosition), rand(10.0 * currPosition));
		vec2 position = currPosition + (1. * velocity) + (0.0005 * random);
		// we store the new position as the color in this frame buffer
  	gl_FragColor = vec4(position, 0, 1);
  }
	`,

	attributes: {
		// a triangle big enough to fill the screen
    position: [
      0, 0.5,
      0.5, 0,
      0, 0
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
  // values that are the same for all vertices
  uniform float pointWidth;
	void main() {
		// read in position from the state texture
		vec2 position = texture2D(particleState, particleTextureIndex).xy;
		// copy color over to fragment shader
		fragColor = mix(vec3(0.), vec3(0.4), length(particleTextureIndex));
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
  void main() {
    // gl_FragColor is a special variable that holds the color of a pixel
    gl_FragColor = vec4(fragColor, 1);
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

	// specify the number of points to draw
	count: numParticles,

	// specify that each vertex is a point (not part of a mesh)
	primitive: 'points',

  // we don't care about depth computations
  depth: {
    enable: false,
    mask: false,
  },
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
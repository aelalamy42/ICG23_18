// Define the particle object
var particle = {
    position: [],
    velocity: [],
    size: 0,
    color: []
};

// Create the particle array
var particles = [];
for (var i = 0; i < numParticles; i++) {
    particles.push(Object.assign({}, particle));
    particles[i].position = [centerX + Math.random() * rangeX - rangeX / 2, centerY + Math.random() * rangeY, centerZ + Math.random() * rangeZ - rangeZ / 2];
    particles[i].velocity = [Math.random() * 0.1 - 0.05, Math.random() * 0.2 + 0.1, Math.random() * 0.1 - 0.05];
    particles[i].size = Math.random() * 0.05 + 0.03;
    particles[i].color = [1, Math.random(), 0, 1];
}

// Create the texture
var texture = gl.createTexture();
var image = new Image();
image.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}
image.src = "particle.png";

// Create the shader program
var vertexShaderSource = `
    attribute vec3 a_position;
    attribute float a_size;
    attribute vec4 a_color;
    uniform mat4 u_projectionMatrix;
    varying vec4 v_color;
    varying vec2 v_texCoord;
    void main() {
        vec4 position = u_projectionMatrix * vec4(a_position, 1.0);
        gl_Position = position + vec4(a_size, a_size, 0.0, 0.0);
        v_color = a_color;
        v_texCoord = vec2((a_size - 0.03) * 20.0, 0.5);
    }
`;

var fragmentShaderSource = `
    precision mediump;
`;
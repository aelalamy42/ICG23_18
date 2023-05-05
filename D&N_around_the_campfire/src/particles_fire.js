
// Compile the vertex shader
var vertexShaderSource = `#version 300 es
    in vec3 a_position;
    in vec2 a_texCoord;
    in float a_size;
    in vec4 a_color;
    in float a_age;
    uniform mat4 u_modelViewMatrix;
    uniform mat4 u_projectionMatrix;
    uniform float u_time;
    out vec4 v_color;
    out vec2 v_texCoord;
    void main() {
        vec3 position = a_position;
        float age = a_age + u_time;
        float scale = 1.0 - (age / 1.5);
        scale = max(scale, 0.0);
        position.y += (age * age) * 0.1;
        position.x += sin(position.y * 20.0 + u_time) * 0.1;
        gl_Position = u_projectionMatrix * u_modelViewMatrix * vec4(position * scale, 1.0);
        gl_PointSize = a_size * scale;
        v_color = a_color;
        v_texCoord = a_texCoord;
    }
`;
var vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, vertexShaderSource);
gl.compileShader(vertexShader);

// Compile the fragment shader
var fragmentShaderSource = `#version 300 es
    precision mediump float;
    uniform sampler2D u_texture;
    in vec4 v_color;
    in vec2 v_texCoord;
    out vec4 outColor;
    void main() {
        vec4 texColor = texture(u_texture, v_texCoord);
        outColor = v_color * texColor;
    }
`;
var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, fragmentShaderSource);
gl.compileShader(fragmentShader);

// Create the shader program
var program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

// Set up the particle attributes
var positionLocation = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(positionLocation);
var texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
gl.enableVertexAttribArray(texCoordLocation);
var sizeLocation = gl.getAttribLocation(program, "a_size");
gl.enableVertexAttribArray(sizeLocation);
var colorLocation = gl.getAttribLocation(program, "a_color");
gl.enableVertexAttribArray(colorLocation);
var ageLocation = gl.getAttribLocation(program, "a_age");
gl.enableVertexAttribArray(ageLocation);

// Set up the uniforms
var modelViewMatrixLocation = gl.getUniformLocation(program, "u_modelViewMatrix");
var projectionMatrixLocation = gl.getUniformLocation(program, "u_projectionMatrix");
var textureLocation = gl.getUniformLocation(program, "u_texture");
var timeLocation = gl.getUniformLocation(program, "u_time");
gl.uniform1i(textureLocation, 0);

// Create the texture
var texture = gl.createTexture();
var image = new Image();
image.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D); 
};


// Create the vertex buffer
var vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, 100000 * 4 * (3 + 2 + 1 + 4 + 1), gl.DYNAMIC_DRAW);

// Create the texture
var texture = gl.createTexture();
var image = new Image();
image.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}
image.src = "fire_texture.png";

// Initialize the particles
var particles = [];
for (var i = 0; i < numParticles; i++) {
    var particle = {
        position: [centerX + Math.random() * rangeX - rangeX / 2, centerY + Math.random() * rangeY, centerZ + Math.random() * rangeZ - rangeZ / 2],
        velocity: [Math.random() * 0.1 - 0.05]

    };
    particles.push(particle);
}



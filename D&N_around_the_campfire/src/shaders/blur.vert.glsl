precision mediump float;
uniform sampler2D uTexture;
uniform sampler2D uBloomTexture;

void main() {
  vec4 color = texture2D(uTexture, gl_FragCoord.xy);
  vec4 bloomColor = texture2D(uBloomTexture, gl_FragCoord.xy);

  // Add the bloom color to the original color
  vec4 finalColor = color + bloomColor;

  gl_FragColor = finalColor;
}
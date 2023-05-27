precision mediump float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform vec2 uDirection;

void main() {
  vec2 texelSize = 1.0 / uResolution;
  vec2 texCoord = gl_FragCoord.xy / uResolution;

  // Apply Gaussian blur
  const int blurRadius = 5;
  vec3 color = vec3(0.0);
  for (int i = -blurRadius; i <= blurRadius; i++) {
    float offset = float(i);
    color += texture2D(uTexture, texCoord + uDirection * offset * texelSize).rgb;
  }
  color /= float(blurRadius * 2 + 1);

  gl_FragColor = vec4(color, 1.0);
}
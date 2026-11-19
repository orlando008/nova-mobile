const vertex = `#version 300 es
layout(location=0) in vec4 box;
layout(location=1) in vec4 rgba;
uniform vec2 screen;
out vec4 fill;
void main() {
  vec2 corner = vec2(gl_VertexID & 1, gl_VertexID >> 1);
  vec2 position = (box.xy + corner * box.zw) / screen;
  gl_Position = vec4(position.x * 2.0 - 1.0, 1.0 - position.y * 2.0, 0.0, 1.0);
  fill = rgba;
}`;
const fragment = `#version 300 es
precision mediump float;
in vec4 fill;
out vec4 color;
void main() { color = fill; }`;

export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl2', { alpha: false });
  if (!gl) return null;
  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const screenUniform = gl.getUniformLocation(program, 'screen');
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  for (let attribute = 0; attribute < 2; attribute += 1) {
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, 4, gl.FLOAT, false, 32, attribute * 16);
    gl.vertexAttribDivisor(attribute, 1);
  }
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0.055, 0.105, 0.105, 1);

  function draw(list, screen) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(screenUniform, screen.w, screen.h);
    gl.bufferData(gl.ARRAY_BUFFER, list, gl.STREAM_DRAW);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, list.length / 8);
  }

  return { name: 'WebGL 2', draw };
}

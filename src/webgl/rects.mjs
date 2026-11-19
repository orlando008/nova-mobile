import { DRAW_STRIDE, PICTURE_INDEX } from '../draw-list.mjs';

const vertex = `#version 300 es
layout(location=0) in vec4 box;
layout(location=1) in vec4 rgba;
uniform vec2 screen;
out vec4 fill;
out vec2 uv;
void main() {
  vec2 corner = vec2(gl_VertexID & 1, gl_VertexID >> 1);
  vec2 position = (box.xy + corner * box.zw) / screen;
  gl_Position = vec4(position.x * 2.0 - 1.0, 1.0 - position.y * 2.0, 0.0, 1.0);
  fill = rgba;
  uv = corner;
}`;
const fragment = `#version 300 es
precision mediump float;
in vec4 fill;
in vec2 uv;
uniform sampler2D picture;
out vec4 color;
void main() {
  color = texture(picture, uv) * vec4(fill.rgb * fill.a, fill.a);
}`;

export function createRenderer(canvas, pictures = []) {
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
  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(gl.getUniformLocation(program, 'picture'), 0);

  function createTexture() {
    const texture = gl.createTexture();
    if (!texture) throw new Error('Could not allocate a WebGL texture');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  const solid = createTexture();
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([255, 255, 255, 255]));
  const limit = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  const textures = [solid, ...pictures.map(bitmap => {
    if (bitmap.width > limit || bitmap.height > limit) throw new Error('Picture exceeds the WebGL texture limit');
    const texture = createTexture();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    return texture;
  })];
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  for (let attribute = 0; attribute < 2; attribute += 1) {
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribDivisor(attribute, 1);
  }
  gl.enable(gl.BLEND);
  // The decoder supplies premultiplied pictures. The shader premultiplies solid colors.
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0.055, 0.105, 0.105, 1);

  function draw(list, screen) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(screenUniform, screen.w, screen.h);
    gl.bufferData(gl.ARRAY_BUFFER, list, gl.STREAM_DRAW);
    // Keep painter's order while batching adjacent commands that use the same image.
    const stride = DRAW_STRIDE * Float32Array.BYTES_PER_ELEMENT;
    for (let start = 0, end; start < list.length; start = end) {
      const image = list[start + PICTURE_INDEX];
      end = start + DRAW_STRIDE;
      while (end < list.length && list[end + PICTURE_INDEX] === image) end += DRAW_STRIDE;
      gl.bindTexture(gl.TEXTURE_2D, textures[image]);
      const offset = start * Float32Array.BYTES_PER_ELEMENT;
      gl.vertexAttribPointer(0, 4, gl.FLOAT, false, stride, offset);
      gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, offset + 16);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, (end - start) / DRAW_STRIDE);
    }
  }

  return { name: 'WebGL 2', draw };
}

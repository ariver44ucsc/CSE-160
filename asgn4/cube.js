// cube.js – Unit cube with position, CORRECT NORMALS, + UV

let vbo, inited = false;
// Stride: 3 floats for position, 3 for normal, 2 for UV = 8 floats
export const STRIDE = (3 + 3 + 2) * Float32Array.BYTES_PER_ELEMENT; // 32 bytes
export const VERTS_PER_CUBE = 36; // 6 faces * 2 triangles/face * 3 vertices/triangle

// Vertex data: x, y, z,  nx, ny, nz,  u, v
export const VERTS = new Float32Array([
  // Front face (normal: 0,0,1)
  -0.5, -0.5,  0.5,   0.0, 0.0, 1.0,   0, 0,
   0.5, -0.5,  0.5,   0.0, 0.0, 1.0,   1, 0,
   0.5,  0.5,  0.5,   0.0, 0.0, 1.0,   1, 1,
  -0.5, -0.5,  0.5,   0.0, 0.0, 1.0,   0, 0,
   0.5,  0.5,  0.5,   0.0, 0.0, 1.0,   1, 1,
  -0.5,  0.5,  0.5,   0.0, 0.0, 1.0,   0, 1,

  // Right face (normal: 1,0,0)
   0.5, -0.5,  0.5,   1.0, 0.0, 0.0,   0, 0,
   0.5, -0.5, -0.5,   1.0, 0.0, 0.0,   1, 0,
   0.5,  0.5, -0.5,   1.0, 0.0, 0.0,   1, 1,
   0.5, -0.5,  0.5,   1.0, 0.0, 0.0,   0, 0,
   0.5,  0.5, -0.5,   1.0, 0.0, 0.0,   1, 1,
   0.5,  0.5,  0.5,   1.0, 0.0, 0.0,   0, 1,

  // Back face (normal: 0,0,-1)
   0.5, -0.5, -0.5,   0.0, 0.0,-1.0,   0, 0,
  -0.5, -0.5, -0.5,   0.0, 0.0,-1.0,   1, 0,
  -0.5,  0.5, -0.5,   0.0, 0.0,-1.0,   1, 1,
   0.5, -0.5, -0.5,   0.0, 0.0,-1.0,   0, 0,
  -0.5,  0.5, -0.5,   0.0, 0.0,-1.0,   1, 1,
   0.5,  0.5, -0.5,   0.0, 0.0,-1.0,   0, 1,

  // Left face (normal: -1,0,0)
  -0.5, -0.5, -0.5,  -1.0, 0.0, 0.0,   0, 0,
  -0.5, -0.5,  0.5,  -1.0, 0.0, 0.0,   1, 0,
  -0.5,  0.5,  0.5,  -1.0, 0.0, 0.0,   1, 1,
  -0.5, -0.5, -0.5,  -1.0, 0.0, 0.0,   0, 0,
  -0.5,  0.5,  0.5,  -1.0, 0.0, 0.0,   1, 1,
  -0.5,  0.5, -0.5,  -1.0, 0.0, 0.0,   0, 1,

  // Top face (normal: 0,1,0)
  -0.5,  0.5,  0.5,   0.0, 1.0, 0.0,   0, 0,
   0.5,  0.5,  0.5,   0.0, 1.0, 0.0,   1, 0,
   0.5,  0.5, -0.5,   0.0, 1.0, 0.0,   1, 1,
  -0.5,  0.5,  0.5,   0.0, 1.0, 0.0,   0, 0,
   0.5,  0.5, -0.5,   0.0, 1.0, 0.0,   1, 1,
  -0.5,  0.5, -0.5,   0.0, 1.0, 0.0,   0, 1,

  // Bottom face (normal: 0,-1,0)
  -0.5, -0.5, -0.5,   0.0,-1.0, 0.0,   0, 0,
   0.5, -0.5, -0.5,   0.0,-1.0, 0.0,   1, 0,
   0.5, -0.5,  0.5,   0.0,-1.0, 0.0,   1, 1,
  -0.5, -0.5, -0.5,   0.0,-1.0, 0.0,   0, 0,
   0.5, -0.5,  0.5,   0.0,-1.0, 0.0,   1, 1,
  -0.5, -0.5,  0.5,   0.0,-1.0, 0.0,   0, 1
]);

export default class Cube {
  static _init(gl) {
    if (inited) return;
    vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, VERTS, gl.STATIC_DRAW);
    inited = true;
  }

  constructor(gl) {
    Cube._init(gl);
    this.model = new Matrix4();
    this.color = [1, 1, 1, 1];
    this.texId = 0;
    this.textured = true;
  }

  draw(gl, aPos, aNormal, aUV, uModelMatrix, uBaseColor, uUseTexture, uSampler) {
    gl.uniformMatrix4fv(uModelMatrix, false, this.model.elements);
    gl.uniform4fv(uBaseColor, this.color);
    gl.uniform1i(uUseTexture, this.textured ? 1 : 0);

    if (this.textured) {
      gl.activeTexture(gl.TEXTURE0 + this.texId);
      gl.uniform1i(uSampler, this.texId);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    const FSIZE = Float32Array.BYTES_PER_ELEMENT;

    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, STRIDE, 0);
    gl.enableVertexAttribArray(aPos);

    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, STRIDE, 3 * FSIZE);
    gl.enableVertexAttribArray(aNormal);

    gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, STRIDE, 6 * FSIZE);
    gl.enableVertexAttribArray(aUV);

    gl.drawArrays(gl.TRIANGLES, 0, VERTS_PER_CUBE);
  }

  static getVertices() { 
    return VERTS;
  }
}
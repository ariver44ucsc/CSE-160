// cube.js – unit cube with position + UV
let vbo, inited = false;
export const STRIDE = 5 * Float32Array.BYTES_PER_ELEMENT; // Export STRIDE
export const VERTS_PER_CUBE = 36; // 6 faces * 2 triangles/face * 3 vertices/triangle

/* 36 vertices × (x,y,z,u,v) */
export const VERTS = new Float32Array([ // Export VERTS
  // front
  -0.5, -0.5,  0.5, 0, 0,   0.5, -0.5,  0.5, 1, 0,   0.5, 0.5,  0.5, 1, 1,
  -0.5, -0.5,  0.5, 0, 0,   0.5, 0.5,  0.5, 1, 1,  -0.5, 0.5,  0.5, 0, 1,
  // right
   0.5, -0.5,  0.5, 0, 0,   0.5, -0.5, -0.5, 1, 0,   0.5, 0.5, -0.5, 1, 1,
   0.5, -0.5,  0.5, 0, 0,   0.5, 0.5, -0.5, 1, 1,   0.5, 0.5,  0.5, 0, 1,
  // back
   0.5, -0.5, -0.5, 0, 0,  -0.5, -0.5, -0.5, 1, 0,  -0.5, 0.5, -0.5, 1, 1,
   0.5, -0.5, -0.5, 0, 0,  -0.5, 0.5, -0.5, 1, 1,   0.5, 0.5, -0.5, 0, 1,
  // left
  -0.5, -0.5, -0.5, 0, 0,  -0.5, -0.5,  0.5, 1, 0,  -0.5, 0.5,  0.5, 1, 1,
  -0.5, -0.5, -0.5, 0, 0,  -0.5, 0.5,  0.5, 1, 1,  -0.5, 0.5, -0.5, 0, 1,
  // top
  -0.5, 0.5,  0.5, 0, 0,   0.5, 0.5,  0.5, 1, 0,   0.5, 0.5, -0.5, 1, 1,
  -0.5, 0.5,  0.5, 0, 0,   0.5, 0.5, -0.5, 1, 1,  -0.5, 0.5, -0.5, 0, 1,
  // bottom
  -0.5, -0.5, -0.5, 0, 0,   0.5, -0.5, -0.5, 1, 0,   0.5, -0.5,  0.5, 1, 1,
  -0.5, -0.5, -0.5, 0, 0,   0.5, -0.5,  0.5, 1, 1,  -0.5, -0.5,  0.5, 0, 1
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
    Cube._init(gl); // Ensure the shared VBO for unit cube is initialized if needed
    this.model = new Matrix4();
    this.color = [1, 1, 1, 1];
    this.texId = 0;         // 0 = brick, 1 = wood
    this.textured = true;   // Enable texture by default
  }

  draw(gl, aPos, aUV, uModel, uColor, uUseTex, uSampler) {
    gl.uniformMatrix4fv(uModel, false, this.model.elements);
    gl.uniform4fv(uColor, this.color);
    gl.uniform1i(uUseTex, this.textured ? 1 : 0);

    if (this.textured) {
      gl.activeTexture(gl.TEXTURE0 + this.texId);
      gl.uniform1i(uSampler, this.texId);
    }

    // This part is for drawing a SINGLE cube, still used by sky and items
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo); // The original VBO for a single unit cube
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, STRIDE, 0);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, STRIDE, 12); // 3 floats * 4 bytes/float = 12
    gl.enableVertexAttribArray(aUV);

    gl.drawArrays(gl.TRIANGLES, 0, VERTS_PER_CUBE);
  }

  static getVertices() {
    return VERTS;
  }
}
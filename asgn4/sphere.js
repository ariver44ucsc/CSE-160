// sphere.js - Generates and renders a sphere

// STRIDE for the sphere will match the cube: 3 pos, 3 norm, 2 uv = 8 floats
export const STRIDE = (3 + 3 + 2) * Float32Array.BYTES_PER_ELEMENT;

export default class Sphere {
  constructor(gl, segments = 20, radius = 1.0) {
    this.gl = gl;
    this.segments = segments; // Number of latitude/longitude segments
    this.radius = radius;
    this.model = new Matrix4(); // From cuon-matrix.js
    this.color = [0.8, 0.2, 0.2, 1.0]; // Default color 
    this.textured = false; 
    this.texId = 0; // Placeholder 

    this.vbo = null;
    this.numVertices = 0;

    this._init();
  }

  _init() {
    const gl = this.gl;
    const latBands = this.segments;
    const longBands = this.segments;
    const radius = this.radius;

    let vertexData = [];

    for (let latNumber = 0; latNumber <= latBands; latNumber++) {
      const theta = latNumber * Math.PI / latBands;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let longNumber = 0; longNumber <= longBands; longNumber++) {
        const phi = longNumber * 2 * Math.PI / longBands;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const x = cosPhi * sinTheta;
        const y = cosTheta;
        const z = sinPhi * sinTheta;

        const u = 1 - (longNumber / longBands);
        const v = 1 - (latNumber / latBands);

        // Position
        vertexData.push(radius * x);
        vertexData.push(radius * y);
        vertexData.push(radius * z);

        // Normal (for a sphere centered at origin, normal is just the normalized position)
        vertexData.push(x);
        vertexData.push(y);
        vertexData.push(z);

        // UV coordinates
        vertexData.push(u);
        vertexData.push(v);
      }
    }

    let indexData = [];
    for (let latNumber = 0; latNumber < latBands; latNumber++) {
      for (let longNumber = 0; longNumber < longBands; longNumber++) {
        const first = (latNumber * (longBands + 1)) + longNumber;
        const second = first + longBands + 1;

        // Triangle 1
        indexData.push(first);
        indexData.push(second);
        indexData.push(first + 1);

        // Triangle 2
        indexData.push(second);
        indexData.push(second + 1);
        indexData.push(first + 1);
      }
    }

    // Unroll vertices using indexData to create a flat array for drawArrays
    let unrolledVertexData = [];
    for (let i = 0; i < indexData.length; i++) {
        const index = indexData[i];
        const base = index * 8; // 8 floats per vertex (pos, norm, uv)
        unrolledVertexData.push(vertexData[base + 0]); // x
        unrolledVertexData.push(vertexData[base + 1]); // y
        unrolledVertexData.push(vertexData[base + 2]); // z
        unrolledVertexData.push(vertexData[base + 3]); // nx
        unrolledVertexData.push(vertexData[base + 4]); // ny
        unrolledVertexData.push(vertexData[base + 5]); // nz
        unrolledVertexData.push(vertexData[base + 6]); // u
        unrolledVertexData.push(vertexData[base + 7]); // v
    }
    this.numVertices = unrolledVertexData.length / 8; // 8 floats per vertex


    this.vbo = gl.createBuffer();
    if (!this.vbo) {
      console.error('Failed to create the buffer object for sphere');
      return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unrolledVertexData), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null); // Unbind
  }

  draw(gl, aPos, aNormal, aUV, uModelMatrix, uBaseColor, uUseTexture, uSampler) {
    if (!this.vbo) {
      console.error("Sphere VBO not initialized.");
      return;
    }

    gl.uniformMatrix4fv(uModelMatrix, false, this.model.elements);
    gl.uniform4fv(uBaseColor, this.color);
    gl.uniform1i(uUseTexture, this.textured ? 1 : 0);

    if (this.textured) {
      // You would need to load a texture for the sphere and assign this.texId
      // gl.activeTexture(gl.TEXTURE0 + this.texId);
      // gl.bindTexture(gl.TEXTURE_2D, yourSphereTextureObject); // Texture needs to be loaded
      // gl.uniform1i(uSampler, this.texId);
      console.warn("Sphere is set to textured but no texture loading is implemented for it yet.");
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    const FSIZE = Float32Array.BYTES_PER_ELEMENT;

    // Position attribute
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, STRIDE, 0);
    gl.enableVertexAttribArray(aPos);

    // Normal attribute
    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, STRIDE, 3 * FSIZE);
    gl.enableVertexAttribArray(aNormal);

    // UV attribute
    gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, STRIDE, 6 * FSIZE);
    gl.enableVertexAttribArray(aUV);

    gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);

  }
}
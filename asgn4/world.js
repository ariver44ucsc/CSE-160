// world.js – Lit Green Ground, Sky, Perimeter Walls (8x8)
import Cube, { VERTS as CUBE_VERTS_DATA, STRIDE as CUBE_STRIDE_BYTES } from './cube.js';
import { HEIGHT_MAP, PERIMETER_HEIGHT } from './map.js';

const SIZE = 8;
const TEX_BRICK = 0;
// const TEX_WOOD  = 1; // Unused for perimeter-only

const FLOATS_PER_VERTEX_CUBE = 8;
const VERTS_PER_FACE = 6;

const CUBE_FACES_GEOMETRY = {
  FRONT:  CUBE_VERTS_DATA.slice(0  * VERTS_PER_FACE * FLOATS_PER_VERTEX_CUBE, 1 * VERTS_PER_FACE * FLOATS_PER_VERTEX_CUBE),
  RIGHT:  CUBE_VERTS_DATA.slice(1  * VERTS_PER_FACE * FLOATS_PER_VERTEX_CUBE, 2 * VERTS_PER_FACE * FLOATS_PER_VERTEX_CUBE),
  BACK:   CUBE_VERTS_DATA.slice(2  * VERTS_PER_FACE * FLOATS_PER_VERTEX_CUBE, 3 * VERTS_PER_FACE * FLOATS_PER_VERTEX_CUBE),
  LEFT:   CUBE_VERTS_DATA.slice(3  * VERTS_PER_FACE * FLOATS_PER_VERTEX_CUBE, 4 * VERTS_PER_FACE * FLOATS_PER_VERTEX_CUBE),
  TOP:    CUBE_VERTS_DATA.slice(4  * VERTS_PER_FACE * FLOATS_PER_VERTEX_CUBE, 5 * VERTS_PER_FACE * FLOATS_PER_VERTEX_CUBE),
  BOTTOM: CUBE_VERTS_DATA.slice(5  * VERTS_PER_FACE * FLOATS_PER_VERTEX_CUBE, 6 * VERTS_PER_FACE * FLOATS_PER_VERTEX_CUBE)
};

const FLOATS_PER_VERTEX_GROUND = 8;
const GROUND_STRIDE = FLOATS_PER_VERTEX_GROUND * Float32Array.BYTES_PER_ELEMENT;

export default class World {
  constructor(gl) {
    this.gl = gl;
    // Ground VBO: position(3) + normal(3) + uv(2)
    this.groundVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.groundVBO);
    const groundVertices = new Float32Array([
      // x,    y,    z,    nx, ny, nz,  u, v
       0,   -0.5, 0,     0, 1, 0,  0, 0,
       SIZE,-0.5, 0,     0, 1, 0,  1, 0,
       SIZE,-0.5,SIZE,   0, 1, 0,  1, 1,
       0,   -0.5, 0,     0, 1, 0,  0, 0,
       SIZE,-0.5,SIZE,   0, 1, 0,  1, 1,
       0,   -0.5,SIZE,   0, 1, 0,  0, 1
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, groundVertices, gl.STATIC_DRAW);
    this.groundModelMatrix = new Matrix4();

    // Skybox as large cube
    this.sky = new Cube(gl);
    this.sky.model.setScale(SIZE * 10, SIZE * 10, SIZE * 10);
    this.sky.color = [0.5, 0.8, 1, 1];
    this.sky.textured = false;

    // Perimeter walls
    this.worldVBOsByTexture = {};
    this.worldModelMatrix = new Matrix4();
    this._rebuildWorldGeometry();
  }

  _getBlockTexture(x, z) {
    return (x===0 || z===0 || x===SIZE-1 || z===SIZE-1)
      ? TEX_BRICK
      : undefined;
  }

  _isSolid(x, y, z) {
    if (x<0||x>=SIZE||z<0||z>=SIZE||y<0) return false;
    return HEIGHT_MAP[z]?.[x] !== undefined && y < HEIGHT_MAP[z][x];
  }

  _rebuildWorldGeometry() {
    const gl = this.gl;
    // Clear old buffers
    for (const k in this.worldVBOsByTexture) {
      if (this.worldVBOsByTexture[k].vbo) gl.deleteBuffer(this.worldVBOsByTexture[k].vbo);
    }
    this.worldVBOsByTexture = {};
    const verticesData = { [TEX_BRICK]: [] };
    const maxHeight = PERIMETER_HEIGHT;

    for (let y = 0; y < maxHeight; y++) {
      for (let z = 0; z < SIZE; z++) {
        for (let x = 0; x < SIZE; x++) {
          if (!this._isSolid(x, y, z)) continue;
          const wx = x + 0.5, wy = y + 0.5, wz = z + 0.5;
          const target = verticesData[TEX_BRICK];
          // helper to push a face
          const addFace = faceGeom => {
            for (let i = 0; i < faceGeom.length; i += FLOATS_PER_VERTEX_CUBE) {
              target.push(
                faceGeom[i+0] + wx,
                faceGeom[i+1] + wy,
                faceGeom[i+2] + wz,
                faceGeom[i+3], faceGeom[i+4], faceGeom[i+5],
                faceGeom[i+6], faceGeom[i+7]
              );
            }
          };
          // top & bottom
          if (!this._isSolid(x, y+1, z)) addFace(CUBE_FACES_GEOMETRY.TOP);
          if (y===0 || !this._isSolid(x, y-1, z)) addFace(CUBE_FACES_GEOMETRY.BOTTOM);
          // sides
          if (!this._isSolid(x, y, z+1)) addFace(CUBE_FACES_GEOMETRY.FRONT);
          if (!this._isSolid(x, y, z-1)) addFace(CUBE_FACES_GEOMETRY.BACK);
          if (!this._isSolid(x+1, y, z)) addFace(CUBE_FACES_GEOMETRY.RIGHT);
          if (!this._isSolid(x-1, y, z)) addFace(CUBE_FACES_GEOMETRY.LEFT);
        }
      }
    }
    // Upload to GPU
    for (const k in verticesData) {
      const arr = new Float32Array(verticesData[k]);
      if (arr.length > 0) {
        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
        this.worldVBOsByTexture[k] = { vbo, count: arr.length / FLOATS_PER_VERTEX_CUBE };
      }
    }
  }

  draw(
    gl,
    aPos, aNormal, aUV,
    uModelMatrixLoc, uNormalMatrixLoc,
    uBaseColorLoc, uUseTextureLoc,
    uSamplerLoc, uIsUnlitLoc,
    setNormalMatrixFunc,
    isSceneLightingOn
  ) {
    const FSIZE = Float32Array.BYTES_PER_ELEMENT;

    // --- Ground Plane ---
    gl.uniformMatrix4fv(uModelMatrixLoc, false, this.groundModelMatrix.elements);
    setNormalMatrixFunc(this.groundModelMatrix);
    gl.uniform4f(uBaseColorLoc, 0.2, 0.6, 0.2, 1.0);
    gl.uniform1i(uUseTextureLoc, 0);
    gl.uniform1i(uIsUnlitLoc, !isSceneLightingOn);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.groundVBO);
    gl.vertexAttribPointer(aPos,    3, gl.FLOAT, false, GROUND_STRIDE, 0);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, GROUND_STRIDE, 3 * FSIZE);
    gl.enableVertexAttribArray(aNormal);
    gl.vertexAttribPointer(aUV,     2, gl.FLOAT, false, GROUND_STRIDE, 6 * FSIZE);
    gl.enableVertexAttribArray(aUV);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // --- Sky (always unlit) ---
    gl.uniformMatrix4fv(uModelMatrixLoc, false, this.sky.model.elements);
    setNormalMatrixFunc(this.sky.model);
    gl.uniform1i(uIsUnlitLoc, 1);
    this.sky.draw(
      gl, aPos, aNormal, aUV,
      uModelMatrixLoc, uBaseColorLoc,
      uUseTextureLoc, uSamplerLoc
    );

    // --- Batched Perimeter Walls ---
    gl.uniformMatrix4fv(uModelMatrixLoc, false, this.worldModelMatrix.elements);
    setNormalMatrixFunc(this.worldModelMatrix);
    gl.uniform1i(uIsUnlitLoc, !isSceneLightingOn);

    for (const k in this.worldVBOsByTexture) {
      const batch = this.worldVBOsByTexture[k];
      gl.bindBuffer(gl.ARRAY_BUFFER, batch.vbo);
      gl.vertexAttribPointer(aPos,    3, gl.FLOAT, false, CUBE_STRIDE_BYTES, 0);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, CUBE_STRIDE_BYTES, 3 * FSIZE);
      gl.enableVertexAttribArray(aNormal);
      gl.vertexAttribPointer(aUV,     2, gl.FLOAT, false, CUBE_STRIDE_BYTES, 6 * FSIZE);
      gl.enableVertexAttribArray(aUV);

      gl.uniform1i(uUseTextureLoc, 1);
      gl.activeTexture(gl.TEXTURE0 + parseInt(k));
      gl.uniform1i(uSamplerLoc, parseInt(k));
      gl.drawArrays(gl.TRIANGLES, 0, batch.count);
    }
  }
}

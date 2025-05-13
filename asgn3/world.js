// world.js – Maze with hidden gold items (Optimized with Batched Rendering + Sun)
import Cube, { VERTS as CUBE_VERTS_DATA, STRIDE as CUBE_STRIDE_BYTES, VERTS_PER_CUBE } from './cube.js';
import { HEIGHT_MAP as MAP, ITEM_LOCATIONS } from './map.js'; // Ensure ITEM_LOCATIONS is imported

const SIZE = 32;
const TEX_BRICK = 0; // Texture ID for bricks
const TEX_WOOD  = 1; // Texture ID for wood

const FLOATS_PER_VERTEX = 5; // x,y,z, u,v
const VERTS_PER_FACE = 6;    // 2 triangles * 3 vertices

const CUBE_FACES_GEOMETRY = {
    FRONT:  CUBE_VERTS_DATA.slice(0 * VERTS_PER_FACE * FLOATS_PER_VERTEX, 1 * VERTS_PER_FACE * FLOATS_PER_VERTEX),
    RIGHT:  CUBE_VERTS_DATA.slice(1 * VERTS_PER_FACE * FLOATS_PER_VERTEX, 2 * VERTS_PER_FACE * FLOATS_PER_VERTEX),
    BACK:   CUBE_VERTS_DATA.slice(2 * VERTS_PER_FACE * FLOATS_PER_VERTEX, 3 * VERTS_PER_FACE * FLOATS_PER_VERTEX),
    LEFT:   CUBE_VERTS_DATA.slice(3 * VERTS_PER_FACE * FLOATS_PER_VERTEX, 4 * VERTS_PER_FACE * FLOATS_PER_VERTEX),
    TOP:    CUBE_VERTS_DATA.slice(4 * VERTS_PER_FACE * FLOATS_PER_VERTEX, 5 * VERTS_PER_FACE * FLOATS_PER_VERTEX),
    BOTTOM: CUBE_VERTS_DATA.slice(5 * VERTS_PER_FACE * FLOATS_PER_VERTEX, 6 * VERTS_PER_FACE * FLOATS_PER_VERTEX),
};

export default class World {
  constructor(gl) {
    this.gl = gl;

    this.groundVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.groundVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, -0.5, 0,   SIZE, -0.5, 0,   SIZE, -0.5, SIZE, // Ground slightly lower
      0, -0.5, 0,   SIZE, -0.5, SIZE,   0, -0.5, SIZE
    ]), gl.STATIC_DRAW);
    this.groundModelMatrix = new Matrix4();

    // Sky (Large blue cube)
    this.sky = new Cube(gl);
    this.sky.model.setScale(300, 300, 300); // Ensure this is large enough
    this.sky.color = [0.5, 0.8, 1.0, 1];    // Light blue sky (matching main.js clearColor)
    this.sky.textured = false;

    // --- Add Sun Cube ---
    this.sunCube = new Cube(gl);
    this.sunCube.textured = false;
    this.sunCube.color = [1.0, 0.9, 0.2, 1.0]; // Bright yellow sun

    const sunX = 0;     // Centered horizontally for now
    const sunY = 100;   // High up
    const sunZ = -50;  // Far away
    const sunScaleFactor = 25; // Make it noticeable

    this.sunCube.model.setTranslate(sunX, sunY, sunZ)
                       .scale(sunScaleFactor, sunScaleFactor, sunScaleFactor);
    // --- End Sun Cube ---

    this.worldVBOsByTexture = {};
    this.worldModelMatrix = new Matrix4(); // For the batched world geometry (usually identity)

    // Collectibles (Gold Blocks)
    this.items = ITEM_LOCATIONS.map(loc => ({
        pos: [loc.x, loc.y, loc.z], // loc.y is PATH_HEIGHT (usually 0) from map.js
        collected: false
    }));
     if (!this.items) {
        this.items = [];
     }

    this.itemCube = new Cube(gl);
    this.itemCube.color = [1, 0.85, 0.05, 1]; // Gold color
    this.itemCube.textured = false;
    this.itemModelMatrix = new Matrix4();

    this._rebuildWorldGeometry();
  }

  _getBlockTexture(x, z) {
    return (x === 0 || z === 0 || x === SIZE - 1 || z === SIZE - 1) ? TEX_BRICK : TEX_WOOD;
  }

  _isSolid(x, y, z) {
    if (x < 0 || x >= SIZE || z < 0 || z >= SIZE || y < 0) return false;
    return MAP[z]?.[x] !== undefined && y < MAP[z][x];
  }

 _rebuildWorldGeometry() {
    const gl = this.gl;

    for (const texKey in this.worldVBOsByTexture) {
      if (this.worldVBOsByTexture[texKey].vbo) {
        gl.deleteBuffer(this.worldVBOsByTexture[texKey].vbo);
      }
    }
    this.worldVBOsByTexture = {};

    const verticesData = {
      [TEX_BRICK]: [],
      [TEX_WOOD]: []
    };

    const maxPossibleHeightInMap = 5;

    for (let y = 0; y < maxPossibleHeightInMap; y++) {
      for (let z = 0; z < SIZE; z++) {
        for (let x = 0; x < SIZE; x++) {
          if (!this._isSolid(x, y, z)) continue;

          const blockTex = this._getBlockTexture(x, z);
          const targetArray = verticesData[blockTex];

          const worldX = x + 0.5;
          const worldY = y + 0.5;
          const worldZ = z + 0.5;

          if (!this._isSolid(x, y + 1, z)) {
            const faceVerts = CUBE_FACES_GEOMETRY.TOP;
            for (let i = 0; i < faceVerts.length; i += FLOATS_PER_VERTEX) {
              targetArray.push(faceVerts[i] + worldX, faceVerts[i+1] + worldY, faceVerts[i+2] + worldZ, faceVerts[i+3], faceVerts[i+4]);
            }
          }
          if (y === 0 || (y > 0 && !this._isSolid(x, y - 1, z))) {
            const faceVerts = CUBE_FACES_GEOMETRY.BOTTOM;
            for (let i = 0; i < faceVerts.length; i += FLOATS_PER_VERTEX) {
              targetArray.push(faceVerts[i] + worldX, faceVerts[i+1] + worldY, faceVerts[i+2] + worldZ, faceVerts[i+3], faceVerts[i+4]);
            }
          }
          if (!this._isSolid(x, y, z + 1)) {
            const faceVerts = CUBE_FACES_GEOMETRY.FRONT;
            for (let i = 0; i < faceVerts.length; i += FLOATS_PER_VERTEX) {
              targetArray.push(faceVerts[i] + worldX, faceVerts[i+1] + worldY, faceVerts[i+2] + worldZ, faceVerts[i+3], faceVerts[i+4]);
            }
          }
          if (!this._isSolid(x, y, z - 1)) {
            const faceVerts = CUBE_FACES_GEOMETRY.BACK;
            for (let i = 0; i < faceVerts.length; i += FLOATS_PER_VERTEX) {
              targetArray.push(faceVerts[i] + worldX, faceVerts[i+1] + worldY, faceVerts[i+2] + worldZ, faceVerts[i+3], faceVerts[i+4]);
            }
          }
          if (!this._isSolid(x + 1, y, z)) {
            const faceVerts = CUBE_FACES_GEOMETRY.RIGHT;
            for (let i = 0; i < faceVerts.length; i += FLOATS_PER_VERTEX) {
              targetArray.push(faceVerts[i] + worldX, faceVerts[i+1] + worldY, faceVerts[i+2] + worldZ, faceVerts[i+3], faceVerts[i+4]);
            }
          }
          if (!this._isSolid(x - 1, y, z)) {
            const faceVerts = CUBE_FACES_GEOMETRY.LEFT;
            for (let i = 0; i < faceVerts.length; i += FLOATS_PER_VERTEX) {
              targetArray.push(faceVerts[i] + worldX, faceVerts[i+1] + worldY, faceVerts[i+2] + worldZ, faceVerts[i+3], faceVerts[i+4]);
            }
          }
        }
      }
    }

    for (const texKey in verticesData) {
      const vArray = new Float32Array(verticesData[texKey]);
      if (vArray.length > 0) {
        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, vArray, gl.STATIC_DRAW);
        this.worldVBOsByTexture[texKey] = {
          vbo: vbo,
          count: vArray.length / FLOATS_PER_VERTEX
        };
      }
    }
  }

  getHeight(x, z) {
    if (x < 0 || x >= SIZE || z < 0 || z >= SIZE) return 0;
    return MAP[z]?.[x] !== undefined ? MAP[z][x] : 0;
  }

  setHeight(x, z, h) {
    if (x < 0 || x >= SIZE || z < 0 || z >= SIZE) return;
    const maxMazeModHeight = 4;
    h = Math.max(0, Math.min(maxMazeModHeight, h));
     if (MAP[z]) {
        MAP[z][x] = h;
        this._rebuildWorldGeometry();
     }
  }

  collectAt(x, z) {
    for (const item of this.items) {
      if (!item.collected && item.pos[0] === x && item.pos[2] === z) {
        if (this.getHeight(x,z) === item.pos[1]) {
             item.collected = true;
             return true;
        }
      }
    }
    return false;
  }

  remainingItems() {
    return this.items.filter(i => !i.collected).length;
  }

  draw(gl, aPos, aUV, uModel, uColor, uUseTex, uSampler) {
    // Ground plane
    gl.bindBuffer(gl.ARRAY_BUFFER, this.groundVBO);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPos);
    gl.disableVertexAttribArray(aUV);
    gl.uniformMatrix4fv(uModel, false, this.groundModelMatrix.elements);
    gl.uniform4f(uColor, 0.3, 0.5, 0.2, 1);
    gl.uniform1i(uUseTex, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Sky
    this.sky.draw(gl, aPos, aUV, uModel, uColor, uUseTex, uSampler);

    // --- Sun ---
    this.sunCube.draw(gl, aPos, aUV, uModel, uColor, uUseTex, uSampler);
    // --- End Sun ---

    // Batched World Blocks (Maze Walls)
    gl.uniformMatrix4fv(uModel, false, this.worldModelMatrix.elements); 
    for (const texKey in this.worldVBOsByTexture) {
      const batch = this.worldVBOsByTexture[texKey];
      if (batch && batch.vbo && batch.count > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.vbo);
        gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, CUBE_STRIDE_BYTES, 0);
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, CUBE_STRIDE_BYTES, 3 * Float32Array.BYTES_PER_ELEMENT);
        gl.enableVertexAttribArray(aUV);
        gl.uniform1i(uUseTex, 1);
        gl.activeTexture(gl.TEXTURE0 + parseInt(texKey));
        gl.uniform1i(uSampler, parseInt(texKey));
        gl.drawArrays(gl.TRIANGLES, 0, batch.count);
      }
    }

    // Items (Gold Blocks)
    for (const item of this.items) {
      if (item.collected) continue;
      const itemCenterY = item.pos[1] + 0.5;
      this.itemModelMatrix.setTranslate(item.pos[0] + 0.5, itemCenterY, item.pos[2] + 0.5).scale(0.6, 0.6, 0.6);
      this.itemCube.model.set(this.itemModelMatrix);
      this.itemCube.draw(gl, aPos, aUV, uModel, uColor, uUseTex, uSampler);
    }
  }
}

class Cube {
    constructor() {
      this.type = 'cube';
      this.color = [1.0, 1.0, 1.0, 1.0];
      this.matrix = new Matrix4();
    }
  
    render() {
      var rgba = this.color;
  
      // Pass color to shader
      gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
      
      // Pass model matrix
      gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
  
      drawCube();
    }
  }
  
  function drawCube() {
    const vertices = new Float32Array([
      // Front face
      -0.5, -0.5,  0.5,
       0.5, -0.5,  0.5,
       0.5,  0.5,  0.5,
      -0.5,  0.5,  0.5,
      // Back face
      -0.5, -0.5, -0.5,
       0.5, -0.5, -0.5,
       0.5,  0.5, -0.5,
      -0.5,  0.5, -0.5,
    ]);
  
    const indices = new Uint8Array([
      0, 1, 2,   0, 2, 3, // front
      1, 5, 6,   1, 6, 2, // right
      5, 4, 7,   5, 7, 6, // back
      4, 0, 3,   4, 3, 7, // left
      3, 2, 6,   3, 6, 7, // top
      4, 5, 1,   4, 1, 0, // bottom
    ]);
  
    // Create a buffer for vertices
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
  
    // Assign buffer to a_Position
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
  
    // Create a buffer for indices
    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.DYNAMIC_DRAW);
  
    // Draw cube
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);
  }
  
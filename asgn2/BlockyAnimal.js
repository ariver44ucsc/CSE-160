

// === Global Variables ===
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_ModelMatrix;
let u_GlobalRotateMatrix;

let g_globalAngleX = 0;
let g_globalAngleY = 0;
let g_globalAngleZ = 0;
let g_Animation = false;
let g_BoolTailAnimation = false;

let g_Angle = 0;  // Front leg angle
let g_Angle2 = 0; // Back leg angle
let head_animation = 0; // Head bobbing
let g_tails_animation = 0; // Tail wagging

let g_start_time = performance.now() / 1000.0;
let g_seconds = performance.now() / 1000.0 - g_start_time;

let g_last_frame_time = performance.now();


// === Shaders ===
const VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  void main() {
    gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
  }
`;

const FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }
`;

// === HTML UI Controls ===
function addActionForHtmlUI() {
  document.getElementById('CameraAngleSlideX').addEventListener('mousemove', function() {
    g_globalAngleX = this.value;
    renderScene();
  });
  document.getElementById('CameraAngleSlideY').addEventListener('mousemove', function() {
    g_globalAngleY = this.value;
    renderScene();
  });
  document.getElementById('CameraAngleSlideZ').addEventListener('mousemove', function() {
    g_globalAngleZ = this.value;
    renderScene();
  });

  document.getElementById('Head_Joint').addEventListener('mousemove', function() {
    head_animation = this.value;
    renderScene();
  });
  document.getElementById('joint').addEventListener('mousemove', function() {
    g_Angle = this.value;
    renderScene();
  });
  document.getElementById('joint2').addEventListener('mousemove', function() {
    g_Angle2 = this.value;
    renderScene();
  });

  document.getElementById('WalkAnimationButton_On').onclick = function() { g_Animation = true; }
  document.getElementById('WalkAnimationButton_Off').onclick = function() { g_Animation = false; }
  document.getElementById('AllTailsAnimationButton_On').onclick = function() { g_BoolTailAnimation = true; }
  document.getElementById('AllTailsAnimationButton_Off').onclick = function() { g_BoolTailAnimation = false; }
}

// === Setup WebGL ===
function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get WebGL context');
    return;
  }
  gl.enable(gl.DEPTH_TEST);
}

// === Connect GLSL variables ===
function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
}

// === Animate Parts ===
function updateAnimationAngles() {
  if (g_Animation) {
    g_Angle = 20 * Math.sin(g_seconds);
    g_Angle2 = 20 * Math.sin(g_seconds + Math.PI);
    head_animation = 15 * Math.sin(g_seconds);
  }
  if (g_BoolTailAnimation) {
    g_tails_animation = 10 * Math.sin(g_seconds * 2);
  }
}

function tick() {
  // Update timing
  g_seconds = performance.now() / 1000.0 - g_start_time;

  // Update animation angles
  updateAnimationAngles();

  // Render the scene
  renderScene();

  // Update performance indicator
  let now = performance.now();
  let elapsed = now - g_last_frame_time;
  if (elapsed > 100) { // update every ~100ms
    let fps = Math.round(1000 / elapsed);
    document.getElementById('fps').innerHTML = `FPS: ${fps}`;
    g_last_frame_time = now;
  }

  // Request next frame
  requestAnimationFrame(tick);
}

// === Main renderScene ===
function renderScene() {
  let startTime = performance.now();

  // Set global rotation matrix
  let globalRotMat = new Matrix4()
    .rotate(g_globalAngleX, 1, 0, 0)
    .rotate(g_globalAngleY, 0, 1, 0)
    .rotate(g_globalAngleZ, 0, 0, 1);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  drawTurtle();  

  let duration = performance.now() - startTime;
  document.getElementById('fps').innerHTML = 
    " Render time: " + Math.floor(duration) + "ms / " + Math.floor(10000 / duration) / 10 + " fps";
}

// === Draw the Turtle ===
function drawTurtle() {
  // === Shell ===
  let shell = new Cube();
  shell.color = [0.0, 1.0, 0.0, 1.0];
  shell.matrix.setScale(0.6, 0.3, 0.6);
  shell.matrix.translate(0.5, 1.3, 0.0);
  shell.render();



  // === Head ===
  let head = new Cube();
  head.color = [0.2, 0.8, 0.2, 1.0];
  head.matrix.setTranslate(0.5, 0.6, 0.0);
  head.matrix.rotate(head_animation, 0, 1, 0);
  head.matrix.scale(0.2, 0.2, 0.2);
  head.render();

  // Save head's matrix after rotation
  let headMatrix = new Matrix4(head.matrix);

  // === Eyes ===
  // Left Eye
  let leftEye = new Cube();
  leftEye.color = [1.0, 1.0, 1.0, 1.0];
  leftEye.matrix = new Matrix4(headMatrix);  
  leftEye.matrix.translate(0.55, 0.35, 0.4);    
  leftEye.matrix.scale(0.2, 0.2, 0.2);
  leftEye.render();

  // Right Eye
  let rightEye = new Cube();
  rightEye.color = [1.0, 1.0, 1.0, 1.0];
  rightEye.matrix = new Matrix4(headMatrix);  
  rightEye.matrix.translate(0.55, 0.35, -0.4);   
  rightEye.matrix.scale(0.2, 0.2, 0.2);
  rightEye.render();

  // === Tail ===
  let tail = new Cube();
  tail.color = [0.0, 0.5, 0.0, 1.0];
  tail.matrix.setTranslate(-0.05, 0.4, 0.0);
  tail.matrix.rotate(g_tails_animation, 0, 1, 0);
  tail.matrix.scale(0.1, 0.1, 0.1);
  tail.render();


  // === Legs ===
  drawLeg(0.55, 0.25, 0.2, g_Angle);    // Front right
  drawLeg(0.09, 0.25, 0.2, -g_Angle);   // Front left
  drawLeg(0.55, 0.25, -0.2, g_Angle2);  // Back right
  drawLeg(0.09, 0.25, -0.2, -g_Angle2); // Back left


}

// === Draw one leg ===
function drawLeg(x, y, z, angle) {
  let leg = new Cube();
  leg.color = [0.0, 0.4, 0.0, 1.0];  // Dark green legs
  leg.matrix.setTranslate(x, y, z); // move to body first
  leg.matrix.rotate(angle, 0, 0, 1); // then rotate around x axis
  leg.matrix.scale(0.15, 0.15, 0.15); // then scale small
  leg.render();
}


// === Main ===
function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addActionForHtmlUI();
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  requestAnimationFrame(tick);
}

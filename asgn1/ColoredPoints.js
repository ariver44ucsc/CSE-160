const VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform float u_Size;
  void main() {
    gl_Position = a_Position;
    gl_PointSize = u_Size;
  }
`;

const FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }
`;

let gl, canvas;
let a_Position, u_FragColor, u_Size;
let fpsDisplay, numDotDisplay;

let g_selectedType = 'point';
let g_selectedColor = [1.0, 0.0, 0.0, 1.0];
let g_selectedSize = 5;
let g_selectedSegments = 10;
let g_shapesList = [];

function main() {
  canvas = document.getElementById('webgl');
  gl = getWebGLContext(canvas);
  if (!gl) return;

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) return;

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_Size = gl.getUniformLocation(gl.program, 'u_Size');

  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  fpsDisplay = document.getElementById('fpsCounter');
  numDotDisplay = document.getElementById('numdot');

  setupUI();
  canvas.onmousedown = (ev) => handleClick(ev);
  canvas.onmousemove = (ev) => { if (ev.buttons === 1) handleClick(ev); };

  gl.clear(gl.COLOR_BUFFER_BIT);
  requestAnimationFrame(updateFPS);
}

function setupUI() {
  document.getElementById('green').onclick = () => g_selectedColor = [0.0, 1.0, 0.0, 1.0];
  document.getElementById('red').onclick = () => g_selectedColor = [1.0, 0.0, 0.0, 1.0];
  document.getElementById('clearButton').onclick = () => {
    g_shapesList = [];
    renderAllShapes();
    numDotDisplay.innerText = `Shapes: 0`;
  };

  document.getElementById('pointButton').onclick = () => g_selectedType = 'point';
  document.getElementById('triButton').onclick = () => g_selectedType = 'triangle';
  document.getElementById('circleButton').onclick = () => g_selectedType = 'circle';
  document.getElementById("swordButton").onclick = function() {
    drawSword();
  };

  document.getElementById('redSlide').oninput = (e) => g_selectedColor[0] = e.target.value / 100;
  document.getElementById('greenSlide').oninput = (e) => g_selectedColor[1] = e.target.value / 100;
  document.getElementById('blueSlide').oninput = (e) => g_selectedColor[2] = e.target.value / 100;
  document.getElementById('sizeSlide').oninput = (e) => g_selectedSize = parseFloat(e.target.value);
}

function handleClick(ev) {
  const [x, y] = convertCoordinates(ev);
  let shape;

  if (g_selectedType === 'point') {
    shape = new Point();
  } else if (g_selectedType === 'triangle') {
    shape = new Triangle();
  } else {
    shape = new Circle();
    shape.segments = g_selectedSegments;
  }

  shape.position = [x, y];
  shape.color = g_selectedColor.slice();
  shape.size = g_selectedSize;

  g_shapesList.push(shape);
  numDotDisplay.innerText = `Shapes: ${g_shapesList.length}`;
  renderAllShapes();
}

function convertCoordinates(ev) {
  const rect = canvas.getBoundingClientRect();
  const x = ((ev.clientX - rect.left) - canvas.width / 2) / (canvas.width / 2);
  const y = (canvas.height / 2 - (ev.clientY - rect.top)) / (canvas.height / 2);
  return [x, y];
}

function renderAllShapes() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  for (let shape of g_shapesList) {
    shape.render();
  }
}

let lastFrameTime = performance.now();
let frameCount = 0;

function updateFPS() {
  const now = performance.now();
  const delta = now - lastFrameTime;
  frameCount++;

  if (delta >= 1000) {
    fpsDisplay.innerText = `FPS: ${Math.round((frameCount * 1000) / delta)}`;
    frameCount = 0;
    lastFrameTime = now;
  }

  requestAnimationFrame(updateFPS);
}

function drawSword() {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);  // set to black
  gl.clear(gl.COLOR_BUFFER_BIT);     // actually clear it

  // TIP (2 triangles)
  gl.uniform4f(u_FragColor, 0.85, 0.85, 0.85, 1.0); // silver
  drawTriangle([0.0, 0.8, -0.05, 0.7, 0.05, 0.7]);
  drawTriangle([-0.05, 0.7, 0.0, 0.6, 0.05, 0.7]);

  // BLADE (6 stacked triangles)
  for (let i = 0; i < 6; i++) {
    let top = 0.6 - i * 0.1;
    let bottom = top - 0.1;
    drawTriangle([-0.03, top, 0.03, top, -0.03, bottom]);
    drawTriangle([0.03, top, 0.03, bottom, -0.03, bottom]);
  }

  // GUARD (4 triangles, 2 on each side)
  gl.uniform4f(u_FragColor, 0.9, 0.75, 0.1, 1.0); // gold
  drawTriangle([-0.1, -0.1, -0.03, -0.1, -0.03, -0.15]);
  drawTriangle([-0.1, -0.1, -0.03, -0.15, -0.1, -0.15]);
  drawTriangle([0.03, -0.1, 0.1, -0.1, 0.03, -0.15]);
  drawTriangle([0.1, -0.1, 0.1, -0.15, 0.03, -0.15]);

  // HANDLE (4 stacked triangles)
  gl.uniform4f(u_FragColor, 0.3, 0.15, 0.05, 1.0); // dark brown
  for (let i = 0; i < 2; i++) {
    let top = -0.15 - i * 0.1;
    let bottom = top - 0.1;
    drawTriangle([-0.025, top, 0.025, top, -0.025, bottom]);
    drawTriangle([0.025, top, 0.025, bottom, -0.025, bottom]);
  }

  // POMMEL (bottom decoration, 2 triangles)
  gl.uniform4f(u_FragColor, 0.7, 0.7, 0.7, 1.0); // silver
  drawTriangle([-0.05, -0.4, 0.05, -0.4, 0.0, -0.45]);
  drawTriangle([-0.04, -0.45, 0.04, -0.45, 0.0, -0.48]);
}

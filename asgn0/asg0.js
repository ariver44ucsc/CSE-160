function main() {
  const canvas = document.getElementById('example');
  if (!canvas) {
    console.log('Failed to retrieve the <canvas> element');
    return;
  }

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const v1 = new Vector3([
    parseFloat(document.getElementById("v1x").value),
    parseFloat(document.getElementById("v1y").value),
    0
  ]);
  const v2 = new Vector3([
    parseFloat(document.getElementById("v2x").value),
    parseFloat(document.getElementById("v2y").value),
    0
  ]);

  drawVector(v1, "red", ctx);
  drawVector(v2, "blue", ctx);
}

function drawVector(v, color, ctx) {
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(200, 200);
  ctx.lineTo(200 + v.elements[0] * 20, 200 - v.elements[1] * 20);
  ctx.stroke();
}

function handleDrawEvent() {
  const canvas = document.getElementById('example');
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const v1 = new Vector3([
    parseFloat(document.getElementById("v1x").value),
    parseFloat(document.getElementById("v1y").value),
    0
  ]);
  const v2 = new Vector3([
    parseFloat(document.getElementById("v2x").value),
    parseFloat(document.getElementById("v2y").value),
    0
  ]);

  drawVector(v1, "red", ctx);
  drawVector(v2, "blue", ctx);
}

function handleDrawOperationEvent() {
  const canvas = document.getElementById('example');
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const v1 = new Vector3([
    parseFloat(document.getElementById("v1x").value),
    parseFloat(document.getElementById("v1y").value),
    0
  ]);
  const v2 = new Vector3([
    parseFloat(document.getElementById("v2x").value),
    parseFloat(document.getElementById("v2y").value),
    0
  ]);

  drawVector(v1, "red", ctx);
  drawVector(v2, "blue", ctx);

  const op = document.getElementById("operation").value;
  const scalar = parseFloat(document.getElementById("scalar").value);

  if (op === "add") {
    const v3 = new Vector3(v1.elements).add(v2);
    drawVector(v3, "green", ctx);
  } else if (op === "sub") {
    const v3 = new Vector3(v1.elements).sub(v2);
    drawVector(v3, "green", ctx);
  } else if (op === "mul") {
    const v3 = new Vector3(v1.elements).mul(scalar);
    const v4 = new Vector3(v2.elements).mul(scalar);
    drawVector(v3, "green", ctx);
    drawVector(v4, "green", ctx);
  } else if (op === "div") {
    const v3 = new Vector3(v1.elements).div(scalar);
    const v4 = new Vector3(v2.elements).div(scalar);
    drawVector(v3, "green", ctx);
    drawVector(v4, "green", ctx);
  } else if (op === "magnitude") {
    console.log("Magnitude of v1:", v1.magnitude().toFixed(3));
    console.log("Magnitude of v2:", v2.magnitude().toFixed(3));
  } else if (op === "normalize") {
    const v3 = new Vector3(v1.elements).normalize();
    const v4 = new Vector3(v2.elements).normalize();
    drawVector(v3, "green", ctx);
    drawVector(v4, "green", ctx);
  } else if (op === "angle") {
    const angle = angleBetween(v1, v2);
    console.log("Angle:", angle.toFixed(2));
  }
  else if (op === "area") {
    const area = areaTriangle(v1, v2);
    console.log("Area of the triangle:", area.toFixed(3));
  }
}

function angleBetween(v1, v2) {
  const dot = Vector3.dot(v1, v2);
  const mag1 = v1.magnitude();
  const mag2 = v2.magnitude();
  const cosTheta = dot / (mag1 * mag2);
  const clamped = Math.min(1, Math.max(-1, cosTheta));
  const rad = Math.acos(clamped);
  return rad * (180 / Math.PI); // convert to degrees
}

function areaTriangle(v1, v2) {
  const cross = Vector3.cross(v1, v2);
  const area = 0.5 * cross.magnitude(); // Area of triangle = ½‖v1 × v2‖
  return area;
}
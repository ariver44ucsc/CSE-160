function main() {
  var canvas = document.getElementById('example');
  if (!canvas) {
    console.log('Failed to retrieve the <canvas> element');
    return;
  }

  var ctx = canvas.getContext('2d');

  // Clear the canvas with black background
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Create vector v1
  let v1 = new Vector3([2.25, 2.25, 0]);

  // Draw the vector
  drawVector(v1, "red", ctx);
}

// Function to draw a vector from the center of the canvas
function drawVector(v, color, ctx) {
  ctx.strokeStyle = color;
  ctx.beginPath();

  // Canvas center is (200, 200)
  let originX = 200;
  let originY = 200;

  ctx.moveTo(originX, originY);
  ctx.lineTo(originX + v.elements[0] * 20, originY - v.elements[1] * 20); // scale & invert y-axis
  ctx.stroke();
}

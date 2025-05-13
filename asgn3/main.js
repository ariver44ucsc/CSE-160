// main.js
import Camera from './camera.js';
import World  from './world.js';

/* ---------- WebGL & shader -------------------------------------- */
const canvas = document.getElementById('glcanvas');
const gl     = getWebGLContext(canvas);

const VS = `
attribute vec4 a_Position;
attribute vec2 a_TexCoord;
uniform   mat4 u_Model, u_View, u_Proj;
varying   vec2 v_UV;
void main() {
  gl_Position = u_Proj * u_View * u_Model * a_Position;
  v_UV = a_TexCoord;
}`;
const FS = `
precision mediump float;
uniform vec4      u_Color;
uniform sampler2D u_Sampler;
uniform int       u_UseTex;
varying vec2      v_UV;
void main() {
  if (u_UseTex == 1) {
    gl_FragColor = texture2D(u_Sampler, v_UV);
  } else {
    gl_FragColor = u_Color;
  }
}`;
initShaders(gl, VS, FS);

/* ---------- locations ------------------------------------------- */
const aPos   = gl.getAttribLocation(gl.program, 'a_Position');
const aUV    = gl.getAttribLocation(gl.program, 'a_TexCoord');
const uModel = gl.getUniformLocation(gl.program, 'u_Model');
const uView  = gl.getUniformLocation(gl.program, 'u_View');
const uProj  = gl.getUniformLocation(gl.program, 'u_Proj');
const uColor = gl.getUniformLocation(gl.program, 'u_Color');
const uUseTex = gl.getUniformLocation(gl.program, 'u_UseTex');
const uSamp  = gl.getUniformLocation(gl.program, 'u_Sampler');

gl.enable(gl.DEPTH_TEST);
gl.clearColor(0.5, 0.8, 1.0, 1);

/* ---------- texture loader -------------------------------------- */
let texReady = 0;
const NUM_TEXTURES = 2;
const texturesToLoad = [
    { src: 'textures/brick.jpg', id: 0 },
    { src: 'textures/wood.png', id: 1 },
];

const ready  = () => {
    texReady++;
    if (texReady === NUM_TEXTURES) {
        initializeGameWithMessage();
    }
};

function loadTex(src, textureUnitId) {
  const img = new Image();
  img.onload = () => {
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + textureUnitId);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    console.log(`Texture loaded: ${src} to unit ${textureUnitId}`);
    ready();
  };
  img.onerror = () => {
    console.error(`Failed to load texture: ${src}.`);
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + textureUnitId);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    const magentaPixel = new Uint8Array([255, 0, 255, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, magentaPixel);
    ready();
  };
  img.src = src;
}
texturesToLoad.forEach(texInfo => loadTex(texInfo.src, texInfo.id));

/* ---------- DOM Elements for Messages and HUD --- */
const introMessageContainer = document.getElementById('intro-message-container');
const feedbackMessageElement = document.getElementById('feedback-message');
const congratsMessageContainer = document.getElementById('congrats-message-container');

const counterElement = document.getElementById('counter');
const fpsElement = document.getElementById('fps');
const hudElement = document.getElementById('hud');

/* ---------- Message Timing Constants ---------- */
const INTRO_MESSAGE_VISIBLE_TIME = 2000; // 2 seconds intro stays fully visible
const INTRO_MESSAGE_FADE_DURATION = 500;    // 0.5 seconds for intro fade animation (CSS handles this)

const FEEDBACK_MESSAGE_DISPLAY_TIME = 2500; // How long "Found nugget" stays opaque
let feedbackMessageTimeoutId = null;

const CONGRATS_MESSAGE_VISIBLE_TIME = 8000; // How long congrats stays visible (8 seconds)
const CONGRATS_MESSAGE_FADE_DURATION = 1000; // How long congrats takes to fade (1 second)
let congratsMessageTimeoutId = null;


function showFeedbackMessage(message) {
    if (!feedbackMessageElement) { console.warn("feedbackMessageElement not found"); return; }
    clearTimeout(feedbackMessageTimeoutId); // Clear previous timeout if any
    feedbackMessageElement.textContent = message;
    feedbackMessageElement.classList.add('visible'); // CSS handles slide in / become opaque
    feedbackMessageTimeoutId = setTimeout(() => {
        feedbackMessageElement.classList.remove('visible'); // CSS handles slide out / fade
    }, FEEDBACK_MESSAGE_DISPLAY_TIME);
}

function showCongratsMessage() {
    if (!congratsMessageContainer) { console.warn("Congrats message container not found"); return; }
    clearTimeout(congratsMessageTimeoutId); // Clear any previous timeout for congrats

    congratsMessageContainer.classList.add('visible'); // This makes the container display:flex and opacity:1, triggering animation

    // Set a timeout to make the congrats message fade and then disappear
    congratsMessageTimeoutId = setTimeout(() => {
        congratsMessageContainer.style.opacity = '0'; // Start fade out (CSS transition handles this)
        setTimeout(() => {
            congratsMessageContainer.style.display = 'none'; // Fully hide after fade
            congratsMessageContainer.classList.remove('visible'); // Also remove visible class
        }, CONGRATS_MESSAGE_FADE_DURATION);
    }, CONGRATS_MESSAGE_VISIBLE_TIME);
}

function initializeGameWithMessage() {
    if (introMessageContainer) {
        introMessageContainer.classList.add('visible'); // Makes it opacity 1 & triggers text animation
        setTimeout(() => {
            introMessageContainer.style.opacity = '0'; // Start CSS fade out for the container
            setTimeout(() => {
                if(introMessageContainer) introMessageContainer.style.display = 'none'; // Fully hide
            }, INTRO_MESSAGE_FADE_DURATION);
        }, INTRO_MESSAGE_VISIBLE_TIME);
    }
    startGame(); 
}

/* ---------- helper: tile one unit in front of camera ------------ */
function forwardTile(cam) {
  let ex = cam.eye.elements[0];
  let ez = cam.eye.elements[2];
  const fwd = cam.forward();
  let dx = fwd.elements[0];
  let dz = fwd.elements[2];
  if (Math.abs(dx) > Math.abs(dz)) { return [ Math.floor(ex) + Math.sign(dx), Math.floor(ez) ]; }
  else { return [ Math.floor(ex), Math.floor(ez) + Math.sign(dz) ]; }
}

/* ---------- Main Game Logic (YOUR `start` function) ----------- */
function startGame() {
  const cam   = new Camera();
  cam.eye = new Vector3([1.5, 1.5, 1.5]);
  cam.yaw = 45;
  cam.pitch = -10;
  cam.updateView();

  const world = new World(gl);
  // Ensure world.items is an array before trying to get its length
  const numTotalGold = (world.items && Array.isArray(world.items) && world.items.length > 0) ? world.items.length : 3;

  if (counterElement) {
    counterElement.textContent = `Gold: 0 / ${numTotalGold}`;
  } else {
    console.warn("Counter element not found in HUD.");
  }



  canvas.onclick = () => { if(!document.pointerLockElement) canvas.requestPointerLock(); };
  document.addEventListener('mousemove', e => {
    if (document.pointerLockElement !== canvas) return;
    cam.panYaw(  e.movementX * 0.12);
    cam.panPitch(-e.movementY * 0.12);
  });
  document.addEventListener('keydown', e => {
    switch (e.key.toLowerCase()) {
      case 'w': cam.moveForward( 1); break;
      case 's': cam.moveForward(-1); break;
      case 'a': cam.strafe( 1); break;
      case 'd': cam.strafe(-1); break;
      case 'q': cam.panYaw( -2); break;
      case 'e': cam.panYaw(  2); break;
      case 'r': {
        const [tx, tz] = forwardTile(cam);
        const h = world.getHeight(tx, tz);
        if (h < 4) world.setHeight(tx, tz, h + 1);
        break;
      }
      case 'f': {
        const [tx, tz] = forwardTile(cam);
        const h = world.getHeight(tx, tz);
        if (h > 0) world.setHeight(tx, tz, h - 1);
        break;
      }
      case 'h': {
        if (hudElement) {
            hudElement.style.display = hudElement.style.display === 'none' ? 'block' : 'none';
        }
        break;
      }
    }
  });

  let lastT = performance.now(), frameCnt = 0;
  let gameWon = false; // Flag to ensure congrats shows only once

  function tick(now) {
    frameCnt++;
    if (now - lastT >= 1000) {
      if (fpsElement) fpsElement.textContent = `FPS: ${frameCnt}`;
      frameCnt = 0;
      lastT = now;
    }

    // Nugget collection logic
    if (!gameWon) { // Only check for collection if the game hasn't been "won" yet
        const tileX = Math.floor(cam.eye.elements[0]);
        const tileZ = Math.floor(cam.eye.elements[2]);

        if (world.collectAt(tileX, tileZ)) { 
          const remainingGold = world.remainingItems();
          const collectedGold = numTotalGold - remainingGold;

          if (counterElement) {
              counterElement.textContent = `Gold: ${collectedGold} / ${numTotalGold}`;
          }

          if (remainingGold === 0) {
            console.log("All gold collected! Triggering congrats message."); 
            showCongratsMessage(); // Show the message
            gameWon = true;        // Set flag so we don't re-trigger
                                   
          } else {
            showFeedbackMessage(`Nugget Found! ${remainingGold} to go!`);
          }
        }
    }

    // Always perform rendering
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(uView, false, cam.view.elements);
    gl.uniformMatrix4fv(uProj, false, cam.proj.elements);

    
    world.draw(gl, aPos, aUV, uModel, uColor, uUseTex, uSamp);

    requestAnimationFrame(tick); // ALWAYS call this to keep the loop running
  }
  tick(performance.now());
}
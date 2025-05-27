// main.js – Full Phong + Spotlight + Movement Controls
import Camera from './camera.js';
import World  from './world.js';
import Sphere from './sphere.js';
import Cube   from './cube.js';

/* ---------- WebGL & Shaders -------------------------------------- */
const canvas = document.getElementById('glcanvas');
const gl     = getWebGLContext(canvas);

const VS_SOURCE = `
  attribute vec4 a_Position;
  attribute vec3 a_Normal;
  attribute vec2 a_TexCoord;

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjMatrix;
  uniform mat3 u_NormalMatrix;

  varying vec3 v_NormalWorld;
  varying vec3 v_FragPosWorld;
  varying vec2 v_TexCoord;

  void main() {
    vec4 worldPos  = u_ModelMatrix * a_Position;
    v_FragPosWorld = worldPos.xyz;
    v_NormalWorld  = normalize(u_NormalMatrix * a_Normal);
    v_TexCoord     = a_TexCoord;
    gl_Position    = u_ProjMatrix * u_ViewMatrix * worldPos;
  }
`;

const FS_SOURCE = `
  precision mediump float;
  uniform bool   u_ShowNormals;
  uniform bool   u_IsUnlit;
  uniform vec4   u_BaseColor;
  uniform sampler2D u_Sampler;
  uniform int    u_UseTexture;
  uniform vec3   u_PointLightPosWorld;
  uniform vec3   u_PointLightColor;
  uniform vec3   u_AmbientColor;
  uniform vec3   u_CameraPosWorld;
  uniform vec3   u_SpecularColor;
  uniform float  u_Shininess;
  uniform vec3   u_SpotLightPosWorld;
  uniform vec3   u_SpotLightDirWorld;
  uniform float  u_SpotCutoffCos;
  uniform float  u_SpotExponent;

  varying vec3 v_NormalWorld;
  varying vec3 v_FragPosWorld;
  varying vec2 v_TexCoord;

  void main() {
    if(u_ShowNormals) {
      gl_FragColor = vec4(normalize(v_NormalWorld)*0.5 + 0.5, 1.0);
      return;
    }
    vec4 baseColor = (u_UseTexture==1)
                     ? texture2D(u_Sampler, v_TexCoord)
                     : u_BaseColor;
    if(u_IsUnlit) {
      gl_FragColor = baseColor;
      return;
    }
    vec3 N = normalize(v_NormalWorld);

    // Point-light
    vec3  LpVec = u_PointLightPosWorld - v_FragPosWorld;
    float dp    = length(LpVec);
    vec3  Lp    = normalize(LpVec);
    float diffP = max(dot(N,Lp),0.0);
    float attP  = 1.0/(1.0+0.1*dp+0.01*dp*dp);
    vec3  colP  = u_PointLightColor * diffP * attP * baseColor.rgb;

    // Spotlight
    vec3  LsVec = u_SpotLightPosWorld - v_FragPosWorld;
    float ds    = length(LsVec);
    vec3  Ls    = normalize(LsVec);
    float diffS = max(dot(N,Ls),0.0);
    float attS  = 1.0/(1.0+0.1*ds+0.01*ds*ds);
    float cosA  = dot(-Ls, normalize(u_SpotLightDirWorld));
    float spotF = (cosA>u_SpotCutoffCos)? pow(cosA,u_SpotExponent) : 0.0;
    vec3  colS  = u_PointLightColor * diffS * attS * spotF * baseColor.rgb;

    // Ambient
    vec3 ambient = u_AmbientColor * baseColor.rgb;

    // Specular (with point-light)
    vec3 V    = normalize(u_CameraPosWorld - v_FragPosWorld);
    vec3 R    = reflect(-Lp, N);
    float rv  = max(dot(R,V),0.0);
    vec3 spec = u_PointLightColor * u_SpecularColor * pow(rv, u_Shininess);

    vec3 result = ambient + colP + colS + spec;
    gl_FragColor = vec4(result, baseColor.a);
  }
`;

initShaders(gl, VS_SOURCE, FS_SOURCE);

/* ---------- Attributes & Uniforms ------------------------------------- */
const a_Position           = gl.getAttribLocation(gl.program, 'a_Position');
const a_Normal             = gl.getAttribLocation(gl.program, 'a_Normal');
const a_TexCoord           = gl.getAttribLocation(gl.program, 'a_TexCoord');
const u_ModelMatrix        = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
const u_NormalMatrix       = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
const u_ViewMatrix         = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
const u_ProjMatrix         = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
const u_ShowNormals        = gl.getUniformLocation(gl.program, 'u_ShowNormals');
const u_IsUnlit            = gl.getUniformLocation(gl.program, 'u_IsUnlit');
const u_BaseColor          = gl.getUniformLocation(gl.program, 'u_BaseColor');
const u_UseTexture         = gl.getUniformLocation(gl.program, 'u_UseTexture');
const u_Sampler            = gl.getUniformLocation(gl.program, 'u_Sampler');
const u_PointLightPosWorld = gl.getUniformLocation(gl.program, 'u_PointLightPosWorld');
const u_PointLightColor    = gl.getUniformLocation(gl.program, 'u_PointLightColor');
const u_AmbientColor       = gl.getUniformLocation(gl.program, 'u_AmbientColor');
const u_CameraPosWorld     = gl.getUniformLocation(gl.program, 'u_CameraPosWorld');
const u_SpecularColor      = gl.getUniformLocation(gl.program, 'u_SpecularColor');
const u_Shininess          = gl.getUniformLocation(gl.program, 'u_Shininess');
const u_SpotLightPosWorld  = gl.getUniformLocation(gl.program, 'u_SpotLightPosWorld');
const u_SpotLightDirWorld  = gl.getUniformLocation(gl.program, 'u_SpotLightDirWorld');
const u_SpotCutoffCos      = gl.getUniformLocation(gl.program, 'u_SpotCutoffCos');
const u_SpotExponent       = gl.getUniformLocation(gl.program, 'u_SpotExponent');

/* ---------- GL Setup ---------------------------------------------------- */
gl.enable(gl.DEPTH_TEST);
gl.clearColor(0.5, 0.8, 1.0, 1.0);

/* ---------- Global State & UI Vars ------------------------------------- */
let g_showNormals     = false;
let g_lightingOn      = true;
let g_pointLightPos   = [4, 2, 2.5];
let g_pointLightColor = [1,1,1];
let g_ambientColor    = [0.2,0.2,0.2];
let g_specularColor   = [1,1,1];
let g_shininess       = 32;

// Spotlight defaults
const g_spotPos      = [6, 8, 6];
const g_spotDir      = [-0.75, -1, -0.75];
const g_spotCutoff   = Math.cos(20*Math.PI/180);
const g_spotExponent = 30;

let normalVizButton, lightingToggleButton;
let pointLightXSlider, pointLightYSlider, pointLightZSlider;
let pointLightXValue, pointLightYValue, pointLightZValue;
let fpsElement, hudElement;

const cam = new Camera();
let world, mySphere, lightMarker;

/* ---------- UI + Movement Setup ---------------------------------------- */
function setupUIEventListeners() {
  // Lighting & Normal buttons
  normalVizButton    = document.getElementById('normalVizButton');
  lightingToggleButton = document.getElementById('lightingToggleButton');
  fpsElement         = document.getElementById('fps');
  hudElement         = document.getElementById('hud');

  normalVizButton.onclick = () => {
    g_showNormals = !g_showNormals;
    normalVizButton.textContent = `Toggle Normal Vis (${g_showNormals?"On":"Off"})`;
  };
  lightingToggleButton.onclick = () => {
    g_lightingOn = !g_lightingOn;
    lightingToggleButton.textContent = `Toggle Lighting (${g_lightingOn?"On":"Off"})`;
  };

  // Point-light sliders
  pointLightXSlider = document.getElementById('pointLightXSlider');
  pointLightYSlider = document.getElementById('pointLightYSlider');
  pointLightZSlider = document.getElementById('pointLightZSlider');
  pointLightXValue  = document.getElementById('pointLightXValue');
  pointLightYValue  = document.getElementById('pointLightYValue');
  pointLightZValue  = document.getElementById('pointLightZValue');

  const bindSlider = (slider, display, arr, idx) => {
    slider.oninput = () => {
      arr[idx] = parseFloat(slider.value);
      display.textContent = slider.value;
    };
    slider.value = arr[idx]; display.textContent = arr[idx];
  };
  bindSlider(pointLightXSlider, pointLightXValue, g_pointLightPos, 0);
  bindSlider(pointLightYSlider, pointLightYValue, g_pointLightPos, 1);
  bindSlider(pointLightZSlider, pointLightZValue, g_pointLightPos, 2);

  // Movement: pointer lock, mouse look, WASD, Q/E, R/F, H
  canvas.onclick = () => canvas.requestPointerLock();
  document.addEventListener('pointerlockchange', () => {
  });
  document.addEventListener('mousemove', e => {
    if(document.pointerLockElement === canvas) {
      cam.panYaw(e.movementX * 0.12);
      cam.panPitch(-e.movementY * 0.12);
    }
  });
  document.addEventListener('keydown', e => {
    switch(e.key.toLowerCase()) {
      case 'w': cam.moveForward(1); break;
      case 's': cam.moveForward(-1); break;
      case 'a': cam.strafe(1);      break;
      case 'd': cam.strafe(-1);     break;
      case 'q': cam.panYaw(-2);     break;
      case 'e': cam.panYaw(2);      break;
      case 'r': { // raise block under camera
        const [tx,tz] = forwardTile(cam);
        const h = world.getHeight(tx,tz);
        if(h < 4) world.setHeight(tx,tz,h+1);
      } break;
      case 'f': { // lower block
        const [tx,tz] = forwardTile(cam);
        const h = world.getHeight(tx,tz);
        if(h > 0) world.setHeight(tx,tz,h-1);
      } break;
      case 'h': // toggle HUD
        hudElement.style.display = hudElement.style.display==='none'?'block':'none';
        break;
    }
  });
}

function forwardTile(c) {
  const ex = c.eye.elements[0], ez = c.eye.elements[2];
  const f  = c.forward();
  const dx = f.elements[0], dz = f.elements[2];
  if(Math.abs(dx) > Math.abs(dz)) return [Math.floor(ex)+Math.sign(dx), Math.floor(ez)];
  else                                 return [Math.floor(ex), Math.floor(ez)+Math.sign(dz)];
}

/* ---------- Main --------------------------------------------------------- */
function startGame() {
  cam.eye = new Vector3([6 ,2,2]);
  cam.yaw = 180; cam.pitch = -15; cam.updateView();

  world      = new World(gl);
  mySphere   = new Sphere(gl,20,1.0);
  mySphere.model.setTranslate(4,0,4);
  mySphere.color=[0.7,0.2,0.2,1];
  mySphere.textured=false;
  lightMarker= new Cube(gl);
  lightMarker.textured=false;

  setupUIEventListeners();
  requestAnimationFrame(tick);
}

function setNormalMatrix(m) {
  const nm = new Matrix4();
  nm.setInverseOf(m); nm.transpose();
  const e = nm.elements;
  gl.uniformMatrix3fv(u_NormalMatrix,false,new Float32Array([
    e[0],e[1],e[2], e[4],e[5],e[6], e[8],e[9],e[10]
  ]));
}

let lastT=performance.now(), frameCnt=0;
function tick(now) {
  now*=0.001; frameCnt++;
  const t=performance.now();
  if(t-lastT>=1000){ fpsElement.textContent=`FPS: ${frameCnt}`; frameCnt=0; lastT=t; }

  const center = 4.0;      // sphere sits at (4, 0, 4)
  const radius = 3.0;      // how far from the sphere you want the light
  const speed  = 0.8;      // radians per second

  // compute angle
  const angle = now * speed;

  // orbit around (4, 0, 4) in XZ
  g_pointLightPos[0] = center + Math.cos(angle) * radius;
  g_pointLightPos[2] = center + Math.sin(angle) * radius;
  // you can still control Y with your Y‐slider:

  pointLightXSlider.value = g_pointLightPos[0].toFixed(2);
  pointLightXValue.textContent = pointLightXSlider.value;
  pointLightZSlider.value = g_pointLightPos[2].toFixed(2);
  pointLightZValue.textContent = pointLightZSlider.value;

  gl.uniform1i(u_ShowNormals, g_showNormals?1:0);
  gl.uniform1i(u_IsUnlit,      !g_lightingOn?1:0);
  gl.uniform3fv(u_PointLightPosWorld, new Float32Array(g_pointLightPos));
  gl.uniform3fv(u_PointLightColor,    new Float32Array(g_pointLightColor));
  gl.uniform3fv(u_AmbientColor,       new Float32Array(g_ambientColor));
  gl.uniform3fv(u_CameraPosWorld,     cam.eye.elements);
  gl.uniform3fv(u_SpecularColor,      new Float32Array(g_specularColor));
  gl.uniform1f(u_Shininess,           g_shininess);
  // spotlight
  {
    const len = Math.hypot(...g_spotDir),
          nd  = g_spotDir.map(v=>v/len);
    gl.uniform3fv(u_SpotLightPosWorld, new Float32Array(g_spotPos));
    gl.uniform3fv(u_SpotLightDirWorld, new Float32Array(nd));
  }
  gl.uniform1f(u_SpotCutoffCos, g_spotCutoff);
  gl.uniform1f(u_SpotExponent,  g_spotExponent);

  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(u_ViewMatrix, false, cam.view.elements);
  gl.uniformMatrix4fv(u_ProjMatrix, false, cam.proj.elements);

  if(world) world.draw(
    gl,
    a_Position,a_Normal,a_TexCoord,
    u_ModelMatrix,u_NormalMatrix,
    u_BaseColor,u_UseTexture,u_Sampler,
    u_IsUnlit,setNormalMatrix,
    g_lightingOn
  );

  if(mySphere){
    gl.uniformMatrix4fv(u_ModelMatrix,false,mySphere.model.elements);
    setNormalMatrix(mySphere.model);
    gl.uniform1i(u_IsUnlit,!g_lightingOn?1:0);
    mySphere.draw(gl,a_Position,a_Normal,a_TexCoord,u_ModelMatrix,u_BaseColor,u_UseTexture,u_Sampler);
  }

  if(lightMarker){
    lightMarker.model
      .setTranslate(...g_pointLightPos)
      .scale(0.2,0.2,0.2);
    lightMarker.color = g_pointLightColor;
    gl.uniformMatrix4fv(u_ModelMatrix,false,lightMarker.model.elements);
    setNormalMatrix(lightMarker.model);
    gl.uniform1i(u_IsUnlit,1);
    lightMarker.draw(gl,a_Position,a_Normal,a_TexCoord,u_ModelMatrix,u_BaseColor,u_UseTexture,u_Sampler);
  }

  requestAnimationFrame(tick);
}

// Start
startGame();

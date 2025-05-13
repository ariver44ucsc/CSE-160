// camera.js  — first‑person camera with yaw & pitch
export default class Camera {
    constructor () {
      // position the player a bit above and behind the floor
      this.eye   = new Vector3([16, 2.5, 40]);
      this.yaw   = 0;   // left/right angle (°)
      this.pitch = 0;   // up/down     (°), clamped to [-89,89]
  
      this.up   = new Vector3([0, 1, 0]);
      this.view = new Matrix4();
      this.proj = new Matrix4();
      this.proj.setPerspective(60, 1, 0.1, 100);
  
      this.updateView();
    }
  
    // ---------- direction helpers ---------------------------------------
    forward () {
      const yRad = this.yaw   * Math.PI / 180;
      const pRad = this.pitch * Math.PI / 180;
      const cosP = Math.cos(pRad);
      return new Vector3([
        Math.sin(yRad) * cosP,
        Math.sin(pRad),
       -Math.cos(yRad) * cosP
      ]);
    }
  
    right () {
      const f = this.forward();
      return new Vector3([ f.elements[2], 0, -f.elements[0] ]);
    }
  
    // ---------- matrix update -------------------------------------------
    updateView () {
      const f  = this.forward();
      const at = new Vector3([
        this.eye.elements[0] + f.elements[0],
        this.eye.elements[1] + f.elements[1],
        this.eye.elements[2] + f.elements[2]
      ]);
      this.view.setLookAt(
        ...this.eye.elements, ...at.elements, ...this.up.elements
      );
    }
  
    // ---------- movement & rotation -------------------------------------
    translate (dirVec, amount) {
      this.eye.elements[0] += dirVec.elements[0] * amount;
      this.eye.elements[1] += dirVec.elements[1] * amount;
      this.eye.elements[2] += dirVec.elements[2] * amount;
      this.updateView();
    }
  
    moveForward (sign) { this.translate(this.forward(), sign * 0.5); }
    strafe      (sign) { this.translate(this.right()  , sign * 0.5); }
  
    panYaw   (deg) { this.yaw   += deg; this.updateView(); }
    panPitch (deg) {
      this.pitch = Math.max(-89, Math.min(89, this.pitch + deg));
      this.updateView();
    }
  }
  
/**
 * HubControls Three.js Adapter
 * Bridges HubControls input state to Three.js games
 * 
 * Usage:
 * 
 *   import { HubThreeAdapter } from 'https://www.dreamdealer.dev/adapters/three-adapter.js';
 *   
 *   // In your game setup
 *   const hubInput = new HubThreeAdapter();
 *   
 *   // In your animation loop
 *   function animate() {
 *     const input = hubInput.getInput();
 *     
 *     // Character movement
 *     const moveSpeed = 5;
 *     player.position.x += input.direction.x * moveSpeed * delta;
 *     player.position.z += input.direction.y * moveSpeed * delta;
 *     
 *     // Camera with right stick
 *     if (input.hasGamepad) {
 *       camera.rotation.y -= input.rightStick.x * 2 * delta;
 *     }
 *     
 *     // Actions
 *     if (input.a) player.jump();
 *     if (input.b) player.roll();
 *   }
 */

export class HubThreeAdapter {
  /**
   * @param {Object} options - Configuration options
   * @param {number} options.deadzone - Stick deadzone (default: 0.15)
   * @param {boolean} options.setupKeyboard - Setup keyboard listeners (default: true)
   */
  constructor(options = {}) {
    this.options = {
      deadzone: 0.15,
      setupKeyboard: true,
      ...options
    };

    this.keys = {};
    this._prevButtons = {};

    if (this.options.setupKeyboard) {
      this.setupKeyboard();
    }

    console.log('🎮 HubThreeAdapter: Initialized');
  }

  /**
   * Setup keyboard listeners as fallback
   */
  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  /**
   * Get unified input state
   * @returns {Object} Input state with directions, buttons, and raw gamepad data
   */
  getInput() {
    const hub = window.HubControls?.enabled ? window.HubControls.getState() : null;
    const dz = this.options.deadzone;

    // Direction from HubControls or keyboard
    let dirX = 0, dirY = 0;
    
    // Keyboard fallback
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dirX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dirX += 1;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dirY -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dirY += 1;

    // HubControls overrides keyboard if active
    if (hub) {
      if (Math.abs(hub.direction.x) > 0.1 || Math.abs(hub.direction.y) > 0.1) {
        dirX = hub.direction.x;
        dirY = hub.direction.y;
      }
    }

    // Right stick (camera control) - only from gamepad
    let rightX = 0, rightY = 0;
    if (hub?.gamepad?.connected) {
      rightX = Math.abs(hub.gamepad.axes[2]) > dz ? hub.gamepad.axes[2] : 0;
      rightY = Math.abs(hub.gamepad.axes[3]) > dz ? hub.gamepad.axes[3] : 0;
    }

    // Buttons
    const a = (hub?.buttons.a) || this.keys['Space'] || this.keys['Enter'] || this.keys['KeyU'];
    const b = (hub?.buttons.b) || this.keys['Escape'] || this.keys['KeyI'];
    const x = hub?.buttons.x || this.keys['KeyJ'];
    const y = hub?.buttons.y || this.keys['KeyK'];
    const start = hub?.buttons.start || this.keys['Tab'];
    const lb = hub?.buttons.lb || this.keys['KeyQ'];
    const rb = hub?.buttons.rb || this.keys['KeyE'];
    const lt = hub?.buttons.lt || false;
    const rt = hub?.buttons.rt || false;

    return {
      // Movement direction (left stick / WASD / D-pad)
      direction: { x: dirX, y: dirY },
      
      // Camera direction (right stick)
      rightStick: { x: rightX, y: rightY },
      
      // Digital direction booleans
      left: dirX < -dz,
      right: dirX > dz,
      up: dirY < -dz,
      down: dirY > dz,

      // Action buttons
      a,
      b,
      x,
      y,
      start,
      select: hub?.buttons.select || false,
      lb,
      rb,
      lt,
      rt,

      // Common aliases
      jump: a,
      attack: x,
      interact: a,
      dodge: b,
      sprint: rb || this.keys['ShiftLeft'],
      pause: start,

      // Triggers (analog values if available)
      leftTrigger: hub?.gamepad?.buttons.lt ? 1 : 0,
      rightTrigger: hub?.gamepad?.buttons.rt ? 1 : 0,

      // Source info
      hasGamepad: hub?.source?.gamepad || false,
      hasTouch: hub?.source?.touch || false,
      
      // Raw gamepad data for advanced usage
      gamepad: hub?.gamepad || null
    };
  }

  /**
   * Check if a button was just pressed this frame
   */
  justPressed(button) {
    const current = this.getInput()[button];
    const prev = this._prevButtons[button] || false;
    return current && !prev;
  }

  /**
   * Check if a button was just released
   */
  justReleased(button) {
    const current = this.getInput()[button];
    const prev = this._prevButtons[button] || false;
    return !current && prev;
  }

  /**
   * Call at end of frame to track previous states
   */
  endFrame() {
    const input = this.getInput();
    ['a', 'b', 'x', 'y', 'start', 'lb', 'rb', 'jump', 'attack', 'interact'].forEach(btn => {
      this._prevButtons[btn] = input[btn];
    });
  }

  /**
   * Get movement vector for 3D character controllers
   * Returns a normalized {x, z} suitable for Three.js coordinate system
   * @param {THREE.Camera} camera - Optional camera for camera-relative movement
   * @returns {{x: number, z: number, magnitude: number}}
   */
  getMovementVector(camera = null) {
    const input = this.getInput();
    let x = input.direction.x;
    let z = input.direction.y; // Y input maps to Z in 3D

    // Normalize diagonal movement
    const magnitude = Math.sqrt(x * x + z * z);
    if (magnitude > 1) {
      x /= magnitude;
      z /= magnitude;
    }

    // If camera provided, make movement camera-relative
    if (camera) {
      const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
      const angle = Math.atan2(cameraDirection.x, cameraDirection.z);
      
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      const rotatedX = x * cos - z * sin;
      const rotatedZ = x * sin + z * cos;
      
      return { x: rotatedX, z: rotatedZ, magnitude: Math.min(1, magnitude) };
    }

    return { x, z, magnitude: Math.min(1, magnitude) };
  }

  /**
   * Get camera rotation delta for orbit/FPS cameras
   * @param {number} sensitivity - Rotation sensitivity multiplier
   * @returns {{x: number, y: number}}
   */
  getCameraRotation(sensitivity = 1) {
    const input = this.getInput();
    return {
      x: -input.rightStick.y * sensitivity, // Pitch
      y: -input.rightStick.x * sensitivity  // Yaw
    };
  }

  /**
   * Vibrate gamepad
   */
  vibrate(duration = 100, strongMagnitude = 0.5, weakMagnitude = 0.5) {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0];
    
    if (gp?.vibrationActuator) {
      gp.vibrationActuator.playEffect('dual-rumble', {
        duration,
        strongMagnitude,
        weakMagnitude
      });
    }
  }
}

// Export for ES modules
export default HubThreeAdapter;

// Attach to window for script tag usage
if (typeof window !== 'undefined') {
  window.HubThreeAdapter = HubThreeAdapter;
}

/**
 * HubControls Phaser 3 Adapter  (Layer 2 — per-game)
 * Bridges HubControls pollable state to Phaser's input system.
 * 
 * This is the canonical Layer 2 adapter for Phaser 3 games:
 *   • Reads HubControls.getState() for touch D-pad / action buttons / gamepad
 *   • Adds game-specific Phaser keyboard bindings
 *   • Merges both sources with OR logic each frame
 *   • Provides justPressed / justReleased for edge detection
 * 
 * Usage in your Phaser scene:
 * 
 *   import { HubPhaserAdapter } from 'https://www.dreamdealer.dev/adapters/phaser-adapter.js';
 *   
 *   class GameScene extends Phaser.Scene {
 *     create() {
 *       this.hubInput = new HubPhaserAdapter(this);
 *     }
 *     
 *     update() {
 *       const input = this.hubInput.getInput();
 *       if (input.left) this.player.moveLeft();
 *       if (input.right) this.player.moveRight();
 *       if (this.hubInput.justPressed('a')) this.player.jump();
 *       if (this.hubInput.justPressed('start')) this.togglePause();
 *       this.hubInput.endFrame();
 *     }
 *   }
 */

export class HubPhaserAdapter {
  /**
   * @param {Phaser.Scene} scene - The Phaser scene to attach to
   * @param {Object} options - Configuration options
   * @param {boolean} options.disableNativeTouch - Disable Phaser's native touch/pointer (default: true on touch devices)
   * @param {Object} options.keyMapping - Custom key mappings
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = {
      disableNativeTouch: true,
      keyMapping: {
        confirm: ['J'],           // J = Confirm (A button)
        cancel: ['K'],            // K = Cancel (B button)
        start: ['I'],             // I = Start / Pause
        select: ['L'],            // L = Select / Menu
        up: ['W', 'UP'],
        down: ['S', 'DOWN'],
        left: ['A', 'LEFT'],
        right: ['D', 'RIGHT']
      },
      ...options
    };

    // Track previous button states for justPressed detection
    this._prevButtons = {};
    
    // Setup keyboard as fallback (works when HubControls not loaded)
    this.setupKeyboard();
    
    // Disable native Phaser touch on mobile if HubControls is active
    if (this.options.disableNativeTouch && window.HubControls?.hasTouch?.()) {
      this.disableNativeTouch();
    }

    console.log('🎮 HubPhaserAdapter: Initialized for scene', scene.scene.key);
  }

  /**
   * Setup Phaser keyboard input as fallback
   */
  setupKeyboard() {
    const keys = this.options.keyMapping;
    this.keys = {};
    
    // Flatten all keys into a single object
    Object.entries(keys).forEach(([action, keyCodes]) => {
      keyCodes.forEach(code => {
        if (!this.keys[action]) this.keys[action] = [];
        const key = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[code]);
        this.keys[action].push(key);
      });
    });

    // Create cursors for convenience
    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.wasd = this.scene.input.keyboard.addKeys('W,A,S,D');
  }

  /**
   * Disable Phaser's native touch/pointer to prevent conflicts
   */
  disableNativeTouch() {
    // Don't disable on desktop
    if (!window.HubControls?.hasTouch?.()) return;
    
    this.scene.input.mouse?.disableContextMenu();
    
    // Prevent Phaser from processing touch on game objects
    // but keep it enabled for UI elements that need it
    console.log('🎮 HubPhaserAdapter: Native touch input delegated to HubControls');
  }

  /**
   * Get unified input state
   * Combines HubControls (touch/gamepad) with Phaser keyboard
   * @returns {Object} Input state
   */
  getInput() {
    const hub = window.HubControls?.enabled ? window.HubControls.getState() : null;
    const deadzone = 0.3; // Higher deadzone for digital-style input

    // Direction from HubControls
    let left = false, right = false, up = false, down = false;
    
    if (hub) {
      left = hub.direction.x < -deadzone;
      right = hub.direction.x > deadzone;
      up = hub.direction.y < -deadzone;
      down = hub.direction.y > deadzone;
    }

    // Merge with Phaser keyboard (OR logic - either source triggers)
    left = left || this.cursors.left.isDown || this.wasd.A.isDown;
    right = right || this.cursors.right.isDown || this.wasd.D.isDown;
    up = up || this.cursors.up.isDown || this.wasd.W.isDown;
    down = down || this.cursors.down.isDown || this.wasd.S.isDown;

    // Buttons
    const a = (hub?.buttons.a) || this.keys.confirm?.some(k => k.isDown);
    const b = (hub?.buttons.b) || this.keys.cancel?.some(k => k.isDown);
    const start = hub?.buttons.start || false;
    const x = hub?.buttons.x || false;
    const y = hub?.buttons.y || false;
    const lb = hub?.buttons.lb || false;
    const rb = hub?.buttons.rb || false;

    return {
      // Directions
      left,
      right,
      up,
      down,
      
      // Normalized direction vector (-1 to 1)
      direction: hub?.direction || { 
        x: (left ? -1 : 0) + (right ? 1 : 0),
        y: (up ? -1 : 0) + (down ? 1 : 0)
      },

      // Action buttons
      a,
      b,
      x,
      y,
      start,
      select: hub?.buttons.select || false,
      lb,
      rb,
      lt: hub?.buttons.lt || false,
      rt: hub?.buttons.rt || false,

      // Aliases for common Phaser patterns
      jump: a,
      attack: a,
      confirm: a,
      cancel: b,
      interact: a,
      pause: start,

      // Raw data
      gamepad: hub?.gamepad || null,
      hasGamepad: hub?.source?.gamepad || false,
      hasTouch: hub?.source?.touch || false
    };
  }

  /**
   * Check if a button was just pressed this frame
   * @param {string} button - Button name (a, b, x, y, start, etc.)
   * @returns {boolean}
   */
  justPressed(button) {
    const current = this.getInput()[button];
    const prev = this._prevButtons[button] || false;
    return current && !prev;
  }

  /**
   * Check if a button was just released this frame
   * @param {string} button - Button name
   * @returns {boolean}
   */
  justReleased(button) {
    const current = this.getInput()[button];
    const prev = this._prevButtons[button] || false;
    return !current && prev;
  }

  /**
   * Call at end of update() to track previous button states
   */
  endFrame() {
    const input = this.getInput();
    ['a', 'b', 'x', 'y', 'start', 'select', 'lb', 'rb', 'left', 'right', 'up', 'down'].forEach(btn => {
      this._prevButtons[btn] = input[btn];
    });
  }

  /**
   * Get analog stick values (for smooth movement)
   * @returns {{x: number, y: number}} Values from -1 to 1
   */
  getAnalog() {
    const hub = window.HubControls?.enabled ? window.HubControls.getState() : null;
    
    if (hub?.gamepad?.connected) {
      return {
        x: hub.gamepad.axes[0],
        y: hub.gamepad.axes[1],
        rightX: hub.gamepad.axes[2] || 0,
        rightY: hub.gamepad.axes[3] || 0
      };
    }

    // Fallback to digital input
    const input = this.getInput();
    return {
      x: (input.left ? -1 : 0) + (input.right ? 1 : 0),
      y: (input.up ? -1 : 0) + (input.down ? 1 : 0),
      rightX: 0,
      rightY: 0
    };
  }

  /**
   * Vibrate gamepad if supported
   * @param {number} duration - Duration in ms
   * @param {number} strongMagnitude - 0-1
   * @param {number} weakMagnitude - 0-1
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

// Also export as default for ES modules
export default HubPhaserAdapter;

// Attach to window for script tag usage
if (typeof window !== 'undefined') {
  window.HubPhaserAdapter = HubPhaserAdapter;
}

/**
 * Unified Input Manager
 * Handles keyboard, gamepad, and touch input with a unified API
 */
export class InputManager {
  constructor() {
    this.keys = {};
    this.prevKeys = {};
    this.gamepadState = {
      connected: false,
      axes: [0, 0, 0, 0],
      buttons: {}
    };
    this.prevGamepadButtons = {};
    this.touchState = {
      direction: { x: 0, y: 0 },
      buttons: { a: false, b: false }
    };
    
    this.deadzone = 0.15;
    this.setupKeyboard();
    this.setupGamepad();
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      // Prevent default for game keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 
           'Space', 'Enter', 'Escape', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  setupGamepad() {
    window.addEventListener('gamepadconnected', (e) => {
      console.log('🎮 Gamepad connected:', e.gamepad.id);
      this.gamepadState.connected = true;
    });

    window.addEventListener('gamepaddisconnected', () => {
      console.log('🎮 Gamepad disconnected');
      this.gamepadState.connected = false;
    });
  }

  pollGamepad() {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0];
    
    if (!gp) {
      this.gamepadState.connected = false;
      return;
    }

    this.gamepadState.connected = true;
    this.gamepadState.axes = [...gp.axes];
    
    // Store previous state for justPressed detection
    this.prevGamepadButtons = { ...this.gamepadState.buttons };
    
    // Map buttons (Xbox layout)
    this.gamepadState.buttons = {
      a: gp.buttons[0]?.pressed || false,      // A / Cross
      b: gp.buttons[1]?.pressed || false,      // B / Circle
      x: gp.buttons[2]?.pressed || false,      // X / Square
      y: gp.buttons[3]?.pressed || false,      // Y / Triangle
      lb: gp.buttons[4]?.pressed || false,     // LB / L1
      rb: gp.buttons[5]?.pressed || false,     // RB / R1
      lt: gp.buttons[6]?.pressed || false,     // LT / L2
      rt: gp.buttons[7]?.pressed || false,     // RT / R2
      select: gp.buttons[8]?.pressed || false, // Select / Share
      start: gp.buttons[9]?.pressed || false,  // Start / Options
      l3: gp.buttons[10]?.pressed || false,    // L3
      r3: gp.buttons[11]?.pressed || false,    // R3
      up: gp.buttons[12]?.pressed || false,    // D-pad Up
      down: gp.buttons[13]?.pressed || false,  // D-pad Down
      left: gp.buttons[14]?.pressed || false,  // D-pad Left
      right: gp.buttons[15]?.pressed || false  // D-pad Right
    };
  }

  /**
   * Set touch input state (called from VirtualControls)
   */
  setTouchDirection(x, y) {
    this.touchState.direction.x = x;
    this.touchState.direction.y = y;
  }

  setTouchButton(button, pressed) {
    this.touchState.buttons[button] = pressed;
  }

  /**
   * Get normalized movement direction from all input sources
   * @returns {{x: number, y: number}} Direction vector (-1 to 1)
   */
  getDirection() {
    let x = 0, y = 0;

    // Keyboard
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) y -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) y += 1;

    // Gamepad left stick
    if (this.gamepadState.connected) {
      const gpX = this.gamepadState.axes[0] || 0;
      const gpY = this.gamepadState.axes[1] || 0;
      
      if (Math.abs(gpX) > this.deadzone) x = gpX;
      if (Math.abs(gpY) > this.deadzone) y = gpY;

      // D-pad
      if (this.gamepadState.buttons.left) x = -1;
      if (this.gamepadState.buttons.right) x = 1;
      if (this.gamepadState.buttons.up) y = -1;
      if (this.gamepadState.buttons.down) y = 1;
    }

    // Touch
    if (this.touchState.direction.x !== 0 || this.touchState.direction.y !== 0) {
      x = this.touchState.direction.x;
      y = this.touchState.direction.y;
    }

    // Clamp
    x = Math.max(-1, Math.min(1, x));
    y = Math.max(-1, Math.min(1, y));

    return { x, y };
  }

  /**
   * Check if an action is currently pressed
   * @param {'confirm'|'cancel'|'menu'|'up'|'down'|'left'|'right'} action
   */
  isPressed(action) {
    switch (action) {
      case 'confirm':
        return this.keys['Enter'] || this.keys['Space'] || this.keys['KeyU'] ||
               this.gamepadState.buttons.a || this.touchState.buttons.a;
      case 'cancel':
        return this.keys['Escape'] || this.keys['KeyI'] || this.keys['Backspace'] ||
               this.gamepadState.buttons.b || this.touchState.buttons.b;
      case 'menu':
        return this.keys['Tab'] || this.keys['KeyM'] ||
               this.gamepadState.buttons.start;
      case 'up':
        return this.keys['KeyW'] || this.keys['ArrowUp'] ||
               this.gamepadState.buttons.up || (this.gamepadState.axes[1] < -this.deadzone) ||
               this.touchState.direction.y < -0.5;
      case 'down':
        return this.keys['KeyS'] || this.keys['ArrowDown'] ||
               this.gamepadState.buttons.down || (this.gamepadState.axes[1] > this.deadzone) ||
               this.touchState.direction.y > 0.5;
      case 'left':
        return this.keys['KeyA'] || this.keys['ArrowLeft'] ||
               this.gamepadState.buttons.left || (this.gamepadState.axes[0] < -this.deadzone) ||
               this.touchState.direction.x < -0.5;
      case 'right':
        return this.keys['KeyD'] || this.keys['ArrowRight'] ||
               this.gamepadState.buttons.right || (this.gamepadState.axes[0] > this.deadzone) ||
               this.touchState.direction.x > 0.5;
      default:
        return false;
    }
  }

  /**
   * Check if an action was just pressed this frame
   * @param {'confirm'|'cancel'|'menu'|'up'|'down'|'left'|'right'} action
   */
  justPressed(action) {
    const current = this.isPressed(action);
    const prevKey = `_prev_${action}`;
    const was = this[prevKey] || false;
    return current && !was;
  }

  /**
   * Call at START of each frame to poll input and prepare state
   */
  update() {
    // Poll gamepad first to get current state
    this.pollGamepad();
  }

  /**
   * Call at END of each frame to store previous states for next frame
   */
  endFrame() {
    // Store previous key states
    this.prevKeys = { ...this.keys };
    
    // Store previous action states for justPressed
    ['confirm', 'cancel', 'menu', 'up', 'down', 'left', 'right'].forEach(action => {
      this[`_prev_${action}`] = this.isPressed(action);
    });
  }

  /**
   * Check if gamepad is connected
   */
  hasGamepad() {
    return this.gamepadState.connected;
  }

  /**
   * Check if touch is available
   */
  hasTouch() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
}

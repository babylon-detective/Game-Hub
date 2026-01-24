/**
 * Dream Dealer Hub - Universal Virtual Controls v2.0
 * Embeddable mobile controls + gamepad support for all Game Hub projects
 * 
 * Include this script in any game to get consistent controls:
 * <script src="https://www.dreamdealer.dev/hub-controls.js" defer></script>
 * 
 * Features:
 * - Virtual D-pad and buttons for touch devices
 * - Unified gamepad polling (works with any controller)
 * - Keyboard simulation for legacy compatibility
 * - Pollable state API for modern integration
 * 
 * Usage in games:
 *   // Option 1: Just include script - keyboard events auto-dispatched
 *   // Option 2: Poll state directly
 *   const input = HubControls.getState();
 *   if (input.direction.x < -0.5) moveLeft();
 *   if (input.buttons.a) jump();
 */
(function(global) {
  'use strict';

  const HubControls = {
    container: null,
    enabled: false,
    isTouch: false,
    callbacks: {
      onStart: null,
      onStateChange: null
    },
    state: {
      dpad: { up: false, down: false, left: false, right: false },
      a: false,
      b: false,
      start: false
    },
    gamepadState: {
      connected: false,
      axes: [0, 0, 0, 0],
      buttons: {
        a: false, b: false, x: false, y: false,
        lb: false, rb: false, lt: false, rt: false,
        select: false, start: false,
        l3: false, r3: false,
        up: false, down: false, left: false, right: false
      }
    },
    prevGamepadButtons: {},
    deadzone: 0.15,
    // Key mappings for D-pad directions
    keyMap: {
      up: ['ArrowUp', 'KeyW'],
      down: ['ArrowDown', 'KeyS'],
      left: ['ArrowLeft', 'KeyA'],
      right: ['ArrowRight', 'KeyD']
    },

    /**
     * Initialize the virtual controls
     */
    init: function(options = {}) {
      this.callbacks.onStart = options.onStart || null;
      this.callbacks.onStateChange = options.onStateChange || null;
      
      // Detect touch capability
      this.isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

      // Setup gamepad listeners (works on all devices)
      this.setupGamepad();
      
      // Start polling loop for gamepad
      this.startPolling();

      // Only create visual controls on touch devices
      if (!this.isTouch) {
        console.log('🎮 HubControls: Desktop detected, gamepad polling active, no virtual controls');
        this.enabled = true;
        return;
      }

      // Hide existing joystick controls if requested
      if (options.hideExisting !== false) {
        this.hideExistingControls();
      }

      this.createStyles();
      this.createContainer();
      this.createDpad();
      this.createStartButton();
      this.createActionButtons();
      
      this.enabled = true;
      console.log('🎮 HubControls: Virtual controls initialized + gamepad polling active');
    },

    /**
     * Setup gamepad connection listeners
     */
    setupGamepad: function() {
      window.addEventListener('gamepadconnected', (e) => {
        console.log('🎮 HubControls: Gamepad connected -', e.gamepad.id);
        this.gamepadState.connected = true;
      });

      window.addEventListener('gamepaddisconnected', () => {
        console.log('🎮 HubControls: Gamepad disconnected');
        this.gamepadState.connected = false;
      });
    },

    /**
     * Start the polling loop for gamepad state
     */
    startPolling: function() {
      const poll = () => {
        this.pollGamepad();
        requestAnimationFrame(poll);
      };
      requestAnimationFrame(poll);
    },

    /**
     * Poll gamepad and update state
     */
    pollGamepad: function() {
      const gamepads = navigator.getGamepads();
      const gp = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3];
      
      if (!gp) {
        if (this.gamepadState.connected) {
          this.gamepadState.connected = false;
        }
        return;
      }

      this.gamepadState.connected = true;
      this.gamepadState.axes = [
        gp.axes[0] || 0,
        gp.axes[1] || 0,
        gp.axes[2] || 0,
        gp.axes[3] || 0
      ];
      
      // Store previous state
      this.prevGamepadButtons = { ...this.gamepadState.buttons };
      
      // Map buttons (Xbox/standard layout)
      this.gamepadState.buttons = {
        a: gp.buttons[0]?.pressed || false,
        b: gp.buttons[1]?.pressed || false,
        x: gp.buttons[2]?.pressed || false,
        y: gp.buttons[3]?.pressed || false,
        lb: gp.buttons[4]?.pressed || false,
        rb: gp.buttons[5]?.pressed || false,
        lt: gp.buttons[6]?.pressed || false,
        rt: gp.buttons[7]?.pressed || false,
        select: gp.buttons[8]?.pressed || false,
        start: gp.buttons[9]?.pressed || false,
        l3: gp.buttons[10]?.pressed || false,
        r3: gp.buttons[11]?.pressed || false,
        up: gp.buttons[12]?.pressed || false,
        down: gp.buttons[13]?.pressed || false,
        left: gp.buttons[14]?.pressed || false,
        right: gp.buttons[15]?.pressed || false
      };

      // Simulate keyboard events for gamepad buttons (legacy compatibility)
      this.simulateGamepadKeys();
    },

    /**
     * Simulate keyboard events based on gamepad state
     */
    simulateGamepadKeys: function() {
      const gp = this.gamepadState;
      const prev = this.prevGamepadButtons;
      const dz = this.deadzone;

      // D-pad and stick -> Arrow keys
      const leftNow = gp.buttons.left || gp.axes[0] < -dz;
      const rightNow = gp.buttons.right || gp.axes[0] > dz;
      const upNow = gp.buttons.up || gp.axes[1] < -dz;
      const downNow = gp.buttons.down || gp.axes[1] > dz;

      // Track simulated key states to avoid repeated events
      if (!this._simKeys) this._simKeys = {};

      // Helper to fire key event only on state change
      const updateKey = (code, pressed) => {
        if (this._simKeys[code] !== pressed) {
          this._simKeys[code] = pressed;
          this.simulateKey(code, pressed ? 'keydown' : 'keyup');
        }
      };

      updateKey('ArrowLeft', leftNow);
      updateKey('ArrowRight', rightNow);
      updateKey('ArrowUp', upNow);
      updateKey('ArrowDown', downNow);
      updateKey('KeyA', leftNow);
      updateKey('KeyD', rightNow);
      updateKey('KeyW', upNow);
      updateKey('KeyS', downNow);

      // A button -> Confirm/Action (Space, KeyU) - NOT Enter, NOT pause
      if (gp.buttons.a !== prev.a) {
        this.pressKey('Space', gp.buttons.a);
        this.pressKey('KeyU', gp.buttons.a);
      }

      // B button -> Cancel/Back (Escape, KeyI) - for backing out of menus
      if (gp.buttons.b !== prev.b) {
        this.pressKey('Escape', gp.buttons.b);
        this.pressKey('KeyI', gp.buttons.b);
      }

      // Start button -> PAUSE ONLY (KeyP pulse)
      // Single pulse, fires once on press - this is THE pause button
      if (gp.buttons.start && !prev.start) {
        this.simulateKey('KeyP', 'keydown');
        setTimeout(() => this.simulateKey('KeyP', 'keyup'), 50);
        
        // Also fire Enter for menu confirmation (Start often confirms in pause menus)
        this.simulateKey('Enter', 'keydown');
        setTimeout(() => this.simulateKey('Enter', 'keyup'), 50);
        
        if (this.callbacks.onStart) this.callbacks.onStart();
        console.log('🎮 Start pressed - pause (KeyP) pulse sent');
      }

      // Select button -> Tab for menu navigation/inventory
      if (gp.buttons.select && !prev.select) {
        this.simulateKey('Tab', 'keydown');
        setTimeout(() => this.simulateKey('Tab', 'keyup'), 50);
      }
    },

    /**
     * Get unified input state from all sources (touch + gamepad)
     * This is the primary API for games to use
     * @returns {Object} Normalized input state
     */
    getState: function() {
      const gp = this.gamepadState;
      const touch = this.state;
      const dz = this.deadzone;

      // Calculate direction from all sources
      let dirX = 0, dirY = 0;

      // Touch D-pad
      if (touch.dpad.left) dirX -= 1;
      if (touch.dpad.right) dirX += 1;
      if (touch.dpad.up) dirY -= 1;
      if (touch.dpad.down) dirY += 1;

      // Gamepad stick (overrides touch if significant)
      if (gp.connected) {
        if (Math.abs(gp.axes[0]) > dz) dirX = gp.axes[0];
        if (Math.abs(gp.axes[1]) > dz) dirY = gp.axes[1];
        
        // D-pad (overrides stick)
        if (gp.buttons.left) dirX = -1;
        if (gp.buttons.right) dirX = 1;
        if (gp.buttons.up) dirY = -1;
        if (gp.buttons.down) dirY = 1;
      }

      // Clamp
      dirX = Math.max(-1, Math.min(1, dirX));
      dirY = Math.max(-1, Math.min(1, dirY));

      return {
        // Normalized direction vector (-1 to 1)
        direction: { x: dirX, y: dirY },
        
        // Action buttons (merged from all sources)
        buttons: {
          a: touch.a || gp.buttons.a,
          b: touch.b || gp.buttons.b,
          x: gp.buttons.x,
          y: gp.buttons.y,
          start: touch.start || gp.buttons.start,
          select: gp.buttons.select,
          lb: gp.buttons.lb,
          rb: gp.buttons.rb,
          lt: gp.buttons.lt,
          rt: gp.buttons.rt
        },

        // Raw gamepad data for games that need it
        gamepad: gp.connected ? {
          connected: true,
          axes: [...gp.axes],
          buttons: { ...gp.buttons }
        } : null,

        // Input source info
        source: {
          touch: this.isTouch,
          gamepad: gp.connected
        }
      };
    },

    /**
     * Check if a button was just pressed (not held)
     * Call this once per frame
     */
    justPressed: function(button) {
      const current = this.getState().buttons[button];
      const prevKey = `_prev_${button}`;
      const prev = this[prevKey] || false;
      this[prevKey] = current;
      return current && !prev;
    },

    /**
     * Check if a direction was just pressed
     */
    justPressedDirection: function(direction) {
      const state = this.getState();
      const dz = 0.5;
      let current = false;
      
      switch(direction) {
        case 'up': current = state.direction.y < -dz; break;
        case 'down': current = state.direction.y > dz; break;
        case 'left': current = state.direction.x < -dz; break;
        case 'right': current = state.direction.x > dz; break;
      }
      
      const prevKey = `_prev_dir_${direction}`;
      const prev = this[prevKey] || false;
      this[prevKey] = current;
      return current && !prev;
    },

    /**
     * Check if gamepad is connected
     */
    hasGamepad: function() {
      return this.gamepadState.connected;
    },

    /**
     * Check if device has touch capability
     */
    hasTouch: function() {
      return this.isTouch;
    },

    /**
     * Simulate a keyboard event
     */
    simulateKey: function(code, type) {
      const event = new KeyboardEvent(type, {
        code: code,
        key: code.replace('Key', '').replace('Arrow', ''),
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(event);
      window.dispatchEvent(event);
    },

    /**
     * Press/release a key
     */
    pressKey: function(code, pressed) {
      this.simulateKey(code, pressed ? 'keydown' : 'keyup');
    },

    hideExistingControls: function() {
      const selectors = [
        '.virtual-joystick',
        '.joystick-container',
        '#joystick',
        '#virtual-joystick',
        '[class*="joystick"]',
        '[id*="joystick"]',
        '.phaser-virtual-joystick',
        '#virtual-controls:not(#hub-virtual-controls)'
      ];

      // Wait for DOM to be ready then hide
      const hideElements = () => {
        selectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            if (el.id !== 'hub-virtual-controls') {
              el.style.display = 'none';
              el.style.visibility = 'hidden';
              el.style.pointerEvents = 'none';
            }
          });
        });
      };
      
      hideElements();
      // Also run after a delay in case elements are created dynamically
      setTimeout(hideElements, 1000);
      setTimeout(hideElements, 3000);
    },

    createStyles: function() {
      if (document.getElementById('hub-controls-styles')) return;

      const style = document.createElement('style');
      style.id = 'hub-controls-styles';
      style.textContent = `
        #hub-virtual-controls {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 200px;
          pointer-events: none;
          z-index: 99999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        }
        #hub-virtual-controls * {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }
        .hub-dpad-container {
          position: absolute;
          left: 20px;
          bottom: 20px;
          width: 140px;
          height: 140px;
          pointer-events: auto;
        }
        .hub-dpad-btn {
          position: absolute;
          width: 50px;
          height: 50px;
          background: rgba(255, 255, 255, 0.15);
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: rgba(255, 255, 255, 0.7);
          transition: background 0.1s, transform 0.1s;
        }
        .hub-dpad-btn.pressed {
          background: rgba(255, 255, 255, 0.35);
        }
        .hub-dpad-up { top: 0; left: 50%; transform: translateX(-50%); }
        .hub-dpad-down { bottom: 0; left: 50%; transform: translateX(-50%); }
        .hub-dpad-left { left: 0; top: 50%; transform: translateY(-50%); }
        .hub-dpad-right { right: 0; top: 50%; transform: translateY(-50%); }
        .hub-dpad-up.pressed { transform: translateX(-50%) scale(0.95); }
        .hub-dpad-down.pressed { transform: translateX(-50%) scale(0.95); }
        .hub-dpad-left.pressed { transform: translateY(-50%) scale(0.95); }
        .hub-dpad-right.pressed { transform: translateY(-50%) scale(0.95); }
        
        .hub-start-btn {
          position: absolute;
          left: 50%;
          bottom: 60px;
          transform: translateX(-50%);
          padding: 8px 20px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
          color: rgba(255, 255, 255, 0.5);
          letter-spacing: 2px;
          transition: background 0.1s, transform 0.1s;
          pointer-events: auto;
        }
        .hub-start-btn.pressed {
          background: rgba(255, 255, 255, 0.25);
          color: rgba(255, 255, 255, 0.8);
          transform: translateX(-50%) scale(0.95);
        }
        
        .hub-action-buttons {
          position: absolute;
          right: 20px;
          bottom: 20px;
          width: 120px;
          height: 120px;
          pointer-events: auto;
        }
        .hub-action-btn {
          position: absolute;
          width: 55px;
          height: 55px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: bold;
          color: white;
          border: 3px solid rgba(255, 255, 255, 0.4);
          transition: transform 0.1s, filter 0.1s;
        }
        .hub-action-btn.pressed {
          filter: brightness(1.3);
        }
        .hub-btn-a {
          background: rgba(76, 175, 80, 0.7);
          right: 0;
          top: 50%;
          transform: translateY(-50%);
        }
        .hub-btn-b {
          background: rgba(244, 67, 54, 0.7);
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
        }
        .hub-btn-a.pressed { transform: translateY(-50%) scale(0.9); }
        .hub-btn-b.pressed { transform: translateX(-50%) scale(0.9); }
        
        @media (hover: hover) and (pointer: fine) {
          #hub-virtual-controls { display: none !important; }
        }
      `;
      document.head.appendChild(style);
    },

    createContainer: function() {
      this.container = document.createElement('div');
      this.container.id = 'hub-virtual-controls';
      document.body.appendChild(this.container);
    },

    createDpad: function() {
      const dpad = document.createElement('div');
      dpad.className = 'hub-dpad-container';

      const directions = [
        { dir: 'up', symbol: '▲' },
        { dir: 'down', symbol: '▼' },
        { dir: 'left', symbol: '◀' },
        { dir: 'right', symbol: '▶' }
      ];

      directions.forEach(({ dir, symbol }) => {
        const btn = document.createElement('div');
        btn.className = `hub-dpad-btn hub-dpad-${dir}`;
        btn.textContent = symbol;

        btn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.state.dpad[dir] = true;
          btn.classList.add('pressed');
          // Simulate Arrow key press
          this.pressKey('Arrow' + dir.charAt(0).toUpperCase() + dir.slice(1), true);
          // Also simulate WASD for games that use it
          const wasdMap = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' };
          this.pressKey(wasdMap[dir], true);
        }, { passive: false });

        btn.addEventListener('touchend', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.state.dpad[dir] = false;
          btn.classList.remove('pressed');
          // Release Arrow key
          this.pressKey('Arrow' + dir.charAt(0).toUpperCase() + dir.slice(1), false);
          // Release WASD
          const wasdMap = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' };
          this.pressKey(wasdMap[dir], false);
        }, { passive: false });

        btn.addEventListener('touchcancel', () => {
          this.state.dpad[dir] = false;
          btn.classList.remove('pressed');
          this.pressKey('Arrow' + dir.charAt(0).toUpperCase() + dir.slice(1), false);
          const wasdMap = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' };
          this.pressKey(wasdMap[dir], false);
        });

        dpad.appendChild(btn);
      });

      this.container.appendChild(dpad);
    },

    createStartButton: function() {
      const btn = document.createElement('div');
      btn.className = 'hub-start-btn';
      btn.textContent = 'START';

      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.state.start = true;
        btn.classList.add('pressed');
      }, { passive: false });

      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.state.start = false;
        btn.classList.remove('pressed');
        
        // Call the onStart callback for pause functionality
        if (this.callbacks.onStart) this.callbacks.onStart();
        
        // PAUSE ONLY - KeyP pulse (same as gamepad Start)
        this.simulateKey('KeyP', 'keydown');
        setTimeout(() => this.simulateKey('KeyP', 'keyup'), 50);
        
        // Also Enter for confirming in pause menus
        this.simulateKey('Enter', 'keydown');
        setTimeout(() => this.simulateKey('Enter', 'keyup'), 50);
        
        console.log('🎮 Touch Start pressed - pause (KeyP) pulse sent');
      }, { passive: false });

      btn.addEventListener('touchcancel', () => {
        this.state.start = false;
        btn.classList.remove('pressed');
      });

      this.container.appendChild(btn);
    },

    createActionButtons: function() {
      const container = document.createElement('div');
      container.className = 'hub-action-buttons';

      // A button - Confirm/Action (Space, KeyU) - NOT Enter, NOT pause
      const btnA = document.createElement('div');
      btnA.className = 'hub-action-btn hub-btn-a';
      btnA.textContent = 'A';

      btnA.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.state.a = true;
        btnA.classList.add('pressed');
        // Confirm/Action keys only - NOT Enter (Enter is for Start/menus)
        this.pressKey('Space', true);
        this.pressKey('KeyU', true);
      }, { passive: false });

      btnA.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.state.a = false;
        btnA.classList.remove('pressed');
        this.pressKey('Space', false);
        this.pressKey('KeyU', false);
      }, { passive: false });

      btnA.addEventListener('touchcancel', () => {
        this.state.a = false;
        btnA.classList.remove('pressed');
        this.pressKey('Space', false);
        this.pressKey('KeyU', false);
      });

      // B button - Cancel/Back (Escape, KeyI)
      const btnB = document.createElement('div');
      btnB.className = 'hub-action-btn hub-btn-b';
      btnB.textContent = 'B';

      btnB.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.state.b = true;
        btnB.classList.add('pressed');
        this.pressKey('Escape', true);
        this.pressKey('KeyI', true); // Used by some games
        this.pressKey('Backspace', true);
      }, { passive: false });

      btnB.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.state.b = false;
        btnB.classList.remove('pressed');
        this.pressKey('Escape', false);
        this.pressKey('KeyI', false);
        this.pressKey('Backspace', false);
      }, { passive: false });

      btnB.addEventListener('touchcancel', () => {
        this.state.b = false;
        btnB.classList.remove('pressed');
        this.pressKey('Escape', false);
        this.pressKey('KeyI', false);
        this.pressKey('Backspace', false);
      });

      container.appendChild(btnA);
      container.appendChild(btnB);
      this.container.appendChild(container);
    },

    getState: function() {
      return { ...this.state };
    },

    show: function() {
      if (this.container) {
        this.container.style.display = '';
      }
    },

    hide: function() {
      if (this.container) {
        this.container.style.display = 'none';
      }
    },

    destroy: function() {
      if (this.container) {
        this.container.remove();
        this.container = null;
      }
      const styles = document.getElementById('hub-controls-styles');
      if (styles) styles.remove();
      this.enabled = false;
    }
  };

  // Export to global
  global.HubControls = HubControls;

  // Auto-initialize when DOM is ready if data attribute is present
  if (document.currentScript?.hasAttribute('data-auto-init')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => HubControls.init());
    } else {
      HubControls.init();
    }
  }

})(typeof window !== 'undefined' ? window : this);

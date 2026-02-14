/**
 * Dream Dealer Hub - Universal Virtual Controls v4.0  (Layer 1)
 * Embeddable mobile controls + gamepad support for all Game Hub projects
 * 
 * Include this script in any game to get consistent controls:
 * <script src="https://www.dreamdealer.dev/hub-controls.js" defer></script>
 * 
 * === TWO-LAYER ARCHITECTURE ===
 * 
 * Layer 1  (THIS FILE — hub-controls.js, lives in Game-Hub)
 *   • Sole owner of hardware access: gamepad polling, touch virtual controls
 *   • Exposes a pollable state API ONLY — NO synthetic keyboard events
 *   • Defines the universal button vocabulary:
 *       direction, a, b, x, y, start, select, lb, rb, lt, rt
 *   • Does NOT call game callbacks or dispatch keyboard events
 * 
 * Layer 2  (Per-game adapter / InputManager, lives in each game)
 *   • Reads from HubControls.getState() + adds game-specific keyboard bindings
 *   • Maps universal vocabulary to game-specific actions
 *   • Owns all game logic (pause, jump, attack, etc.)
 * 
 * Usage in games:
 *   // Poll state every frame in your game loop:
 *   const state = HubControls.getState();
 *   if (state.direction.x < -0.5) moveLeft();
 *   if (state.direction.x > 0.5) moveRight();
 *   if (state.buttons.a) jump();
 *   if (HubControls.justPressed('start')) togglePause();
 * 
 * For keyboard input, use your game's native keyboard handling.
 * HubControls ONLY handles: touch virtual controls + gamepad polling.
 */
(function(global) {
  'use strict';

  const HubControls = {
    container: null,
    enabled: false,
    isTouch: false,
    
    // Internal touch state
    state: {
      dpad: { up: false, down: false, left: false, right: false },
      a: false,
      b: false,
      start: false
    },
    
    // Internal gamepad state
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
    
    // Previous state for justPressed detection
    prevGamepadButtons: {},
    prevTouchState: {},
    
    deadzone: 0.15,

    /**
     * Initialize the virtual controls
     * @param {Object} options - Configuration options
     * @param {boolean} options.hideExisting - Hide existing joystick controls (default: true)
     */
    init: function(options = {}) {
      // Detect touch capability
      this.isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

      // Setup gamepad listeners (works on all devices)
      this.setupGamepad();
      
      // Start polling loop for gamepad
      this.startPolling();

      // Only create visual controls on touch devices
      if (!this.isTouch) {
        console.log('🎮 HubControls v4: Desktop mode — gamepad polling active, no virtual controls');
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
      console.log('🎮 HubControls v4: Touch mode — virtual controls + gamepad polling active');
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
     * Poll gamepad and update internal state (no side effects)
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
      
      // Store previous state for edge detection
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
      
      // Pure state update — no synthetic keyboard events, no callbacks
    },

    /**
     * Get unified input state from all sources (touch + gamepad)
     * This is the PRIMARY API for games to use
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

      // Clamp direction values
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
          rt: gp.buttons.rt,
          l3: gp.buttons.l3,
          r3: gp.buttons.r3
        },

        // Raw gamepad data for games that need analog values
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
     * Check if a button was just pressed (rising edge detection)
     * Call this once per frame per button
     * @param {string} button - Button name: a, b, x, y, start, select, lb, rb, lt, rt
     * @returns {boolean} True only on the frame the button was first pressed
     */
    justPressed: function(button) {
      const current = this.getState().buttons[button];
      const prevKey = '_prev_' + button;
      const prev = this[prevKey] || false;
      this[prevKey] = current;
      return current && !prev;
    },

    /**
     * Check if a button was just released (falling edge detection)
     * @param {string} button - Button name
     * @returns {boolean} True only on the frame the button was released
     */
    justReleased: function(button) {
      const current = this.getState().buttons[button];
      const prevKey = '_prev_' + button;
      const prev = this[prevKey] || false;
      this[prevKey] = current;
      return !current && prev;
    },

    /**
     * Check if a direction was just pressed
     * @param {string} direction - Direction: up, down, left, right
     * @returns {boolean}
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
      
      const prevKey = '_prev_dir_' + direction;
      const prev = this[prevKey] || false;
      this[prevKey] = current;
      return current && !prev;
    },

    /**
     * Check if gamepad is connected
     * @returns {boolean}
     */
    hasGamepad: function() {
      return this.gamepadState.connected;
    },

    /**
     * Check if device has touch capability
     * @returns {boolean}
     */
    hasTouch: function() {
      return this.isTouch;
    },

    // ========================================
    // UI Creation (touch controls only)
    // ========================================

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
      setTimeout(hideElements, 1000);
      setTimeout(hideElements, 3000);
    },

    createStyles: function() {
      if (document.getElementById('hub-controls-styles')) return;

      const style = document.createElement('style');
      style.id = 'hub-controls-styles';
      style.textContent = '\
        #hub-virtual-controls {\
          position: fixed;\
          bottom: 0;\
          left: 0;\
          right: 0;\
          height: 200px;\
          pointer-events: none;\
          z-index: 99999;\
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;\
        }\
        #hub-virtual-controls * {\
          -webkit-tap-highlight-color: transparent;\
          -webkit-touch-callout: none;\
          -webkit-user-select: none;\
          user-select: none;\
        }\
        .hub-dpad-container {\
          position: absolute;\
          left: 20px;\
          bottom: 20px;\
          width: 140px;\
          height: 140px;\
          pointer-events: auto;\
        }\
        .hub-dpad-btn {\
          position: absolute;\
          width: 50px;\
          height: 50px;\
          background: rgba(255, 255, 255, 0.15);\
          border: 2px solid rgba(255, 255, 255, 0.3);\
          border-radius: 8px;\
          display: flex;\
          align-items: center;\
          justify-content: center;\
          font-size: 20px;\
          color: rgba(255, 255, 255, 0.7);\
          transition: background 0.1s, transform 0.1s;\
        }\
        .hub-dpad-btn.pressed {\
          background: rgba(255, 255, 255, 0.35);\
        }\
        .hub-dpad-up { top: 0; left: 50%; transform: translateX(-50%); }\
        .hub-dpad-down { bottom: 0; left: 50%; transform: translateX(-50%); }\
        .hub-dpad-left { left: 0; top: 50%; transform: translateY(-50%); }\
        .hub-dpad-right { right: 0; top: 50%; transform: translateY(-50%); }\
        .hub-dpad-up.pressed { transform: translateX(-50%) scale(0.95); }\
        .hub-dpad-down.pressed { transform: translateX(-50%) scale(0.95); }\
        .hub-dpad-left.pressed { transform: translateY(-50%) scale(0.95); }\
        .hub-dpad-right.pressed { transform: translateY(-50%) scale(0.95); }\
        \
        .hub-start-btn {\
          position: absolute;\
          left: 50%;\
          bottom: 60px;\
          transform: translateX(-50%);\
          padding: 8px 20px;\
          background: rgba(255, 255, 255, 0.1);\
          border: 1px solid rgba(255, 255, 255, 0.25);\
          border-radius: 12px;\
          font-size: 10px;\
          font-weight: bold;\
          color: rgba(255, 255, 255, 0.5);\
          letter-spacing: 2px;\
          transition: background 0.1s, transform 0.1s;\
          pointer-events: auto;\
        }\
        .hub-start-btn.pressed {\
          background: rgba(255, 255, 255, 0.25);\
          color: rgba(255, 255, 255, 0.8);\
          transform: translateX(-50%) scale(0.95);\
        }\
        \
        .hub-action-buttons {\
          position: absolute;\
          right: 20px;\
          bottom: 20px;\
          width: 120px;\
          height: 120px;\
          pointer-events: auto;\
        }\
        .hub-action-btn {\
          position: absolute;\
          width: 55px;\
          height: 55px;\
          border-radius: 50%;\
          display: flex;\
          align-items: center;\
          justify-content: center;\
          font-size: 18px;\
          font-weight: bold;\
          color: white;\
          border: 3px solid rgba(255, 255, 255, 0.4);\
          transition: transform 0.1s, filter 0.1s;\
        }\
        .hub-action-btn.pressed {\
          filter: brightness(1.3);\
        }\
        .hub-btn-a {\
          background: rgba(76, 175, 80, 0.7);\
          right: 0;\
          top: 50%;\
          transform: translateY(-50%);\
        }\
        .hub-btn-b {\
          background: rgba(244, 67, 54, 0.7);\
          bottom: 0;\
          left: 50%;\
          transform: translateX(-50%);\
        }\
        .hub-btn-a.pressed { transform: translateY(-50%) scale(0.9); }\
        .hub-btn-b.pressed { transform: translateX(-50%) scale(0.9); }\
        \
        @media (hover: hover) and (pointer: fine) {\
          #hub-virtual-controls { display: none !important; }\
        }\
      ';
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
        btn.className = 'hub-dpad-btn hub-dpad-' + dir;
        btn.textContent = symbol;

        btn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.state.dpad[dir] = true;
          btn.classList.add('pressed');
          // State update only — no synthetic keyboard events
        }, { passive: false });

        btn.addEventListener('touchend', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.state.dpad[dir] = false;
          btn.classList.remove('pressed');
        }, { passive: false });

        btn.addEventListener('touchcancel', () => {
          this.state.dpad[dir] = false;
          btn.classList.remove('pressed');
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
        // State update only — games poll justPressed('start')
      }, { passive: false });

      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.state.start = false;
        btn.classList.remove('pressed');
        // No callbacks, no synthetic keys — games poll justPressed('start')
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

      // A button - Primary action
      const btnA = document.createElement('div');
      btnA.className = 'hub-action-btn hub-btn-a';
      btnA.textContent = 'A';

      btnA.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.state.a = true;
        btnA.classList.add('pressed');
      }, { passive: false });

      btnA.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.state.a = false;
        btnA.classList.remove('pressed');
      }, { passive: false });

      btnA.addEventListener('touchcancel', () => {
        this.state.a = false;
        btnA.classList.remove('pressed');
      });

      // B button - Secondary action / Cancel
      const btnB = document.createElement('div');
      btnB.className = 'hub-action-btn hub-btn-b';
      btnB.textContent = 'B';

      btnB.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.state.b = true;
        btnB.classList.add('pressed');
      }, { passive: false });

      btnB.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.state.b = false;
        btnB.classList.remove('pressed');
      }, { passive: false });

      btnB.addEventListener('touchcancel', () => {
        this.state.b = false;
        btnB.classList.remove('pressed');
      });

      container.appendChild(btnA);
      container.appendChild(btnB);
      this.container.appendChild(container);
    },

    // ========================================
    // Visibility control
    // ========================================

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

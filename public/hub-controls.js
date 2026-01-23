/**
 * Dream Dealer Hub - Universal Virtual Controls
 * Embeddable mobile controls for all Game Hub projects
 * 
 * Include this script in any game to get consistent mobile controls:
 * <script src="https://www.dreamdealer.dev/hub-controls.js" defer></script>
 * 
 * Controls simulate keyboard input so they work with any game:
 * - D-pad: Arrow keys (or WASD)
 * - A button: Enter/Space (confirm)
 * - B button: Escape (cancel/back)
 * - Start: Calls custom onStart callback for pause
 */
(function(global) {
  'use strict';

  const HubControls = {
    container: null,
    enabled: false,
    callbacks: {
      onStart: null
    },
    state: {
      dpad: { up: false, down: false, left: false, right: false },
      a: false,
      b: false,
      start: false
    },
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
      // Only run on touch devices
      if (!('ontouchstart' in window) && navigator.maxTouchPoints <= 0) {
        console.log('🎮 HubControls: Desktop detected, skipping virtual controls');
        return;
      }

      this.callbacks.onStart = options.onStart || null;

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
      console.log('🎮 HubControls: Virtual controls initialized (simulating keyboard input)');
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
        // Also simulate Enter key for games that use it for pause
        this.pressKey('Enter', true);
        setTimeout(() => this.pressKey('Enter', false), 50);
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

      // A button - confirms/interacts (Enter, Space, U key for some games)
      const btnA = document.createElement('div');
      btnA.className = 'hub-action-btn hub-btn-a';
      btnA.textContent = 'A';

      btnA.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.state.a = true;
        btnA.classList.add('pressed');
        // Simulate multiple confirm keys for broad compatibility
        this.pressKey('Space', true);
        this.pressKey('Enter', true);
        this.pressKey('KeyU', true); // Used by Nageex
      }, { passive: false });

      btnA.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.state.a = false;
        btnA.classList.remove('pressed');
        this.pressKey('Space', false);
        this.pressKey('Enter', false);
        this.pressKey('KeyU', false);
      }, { passive: false });

      btnA.addEventListener('touchcancel', () => {
        this.state.a = false;
        btnA.classList.remove('pressed');
        this.pressKey('Space', false);
        this.pressKey('Enter', false);
        this.pressKey('KeyU', false);
      });

      // B button - cancel/back (Escape, I key for some games)
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

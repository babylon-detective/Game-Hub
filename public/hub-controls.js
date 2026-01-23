/**
 * Dream Dealer Hub - Universal Virtual Controls
 * Embeddable mobile controls for all Game Hub projects
 * 
 * Include this script in any game to get consistent mobile controls:
 * <script src="https://www.dreamdealer.dev/hub-controls.js"></script>
 * 
 * Then call: HubControls.init({ onStart: () => togglePause() })
 */
(function(global) {
  'use strict';

  const HubControls = {
    container: null,
    enabled: false,
    callbacks: {
      onDpad: null,
      onA: null,
      onB: null,
      onStart: null
    },
    state: {
      dpad: { up: false, down: false, left: false, right: false },
      a: false,
      b: false,
      start: false
    },

    /**
     * Initialize the virtual controls
     * @param {Object} options
     * @param {Function} options.onDpad - Callback for D-pad: (direction, pressed) => {}
     * @param {Function} options.onA - Callback for A button: (pressed) => {}
     * @param {Function} options.onB - Callback for B button: (pressed) => {}
     * @param {Function} options.onStart - Callback for Start button: () => {}
     * @param {boolean} options.hideExisting - Hide existing joystick controls (default: true)
     */
    init: function(options = {}) {
      // Only run on touch devices
      if (!('ontouchstart' in window) && navigator.maxTouchPoints <= 0) {
        console.log('🎮 HubControls: Desktop detected, skipping virtual controls');
        return;
      }

      this.callbacks = {
        onDpad: options.onDpad || null,
        onA: options.onA || null,
        onB: options.onB || null,
        onStart: options.onStart || null
      };

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
      console.log('🎮 HubControls: Virtual controls initialized');
    },

    hideExistingControls: function() {
      // Common selectors for virtual joysticks in Phaser games
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

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          if (el.id !== 'hub-virtual-controls') {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.pointerEvents = 'none';
            console.log('🎮 HubControls: Hidden existing control:', selector);
          }
        });
      });
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
          transform: scale(0.95);
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
          transform: scale(0.9);
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
          this.state.dpad[dir] = true;
          btn.classList.add('pressed');
          if (this.callbacks.onDpad) this.callbacks.onDpad(dir, true);
        }, { passive: false });

        btn.addEventListener('touchend', (e) => {
          e.preventDefault();
          this.state.dpad[dir] = false;
          btn.classList.remove('pressed');
          if (this.callbacks.onDpad) this.callbacks.onDpad(dir, false);
        }, { passive: false });

        btn.addEventListener('touchcancel', () => {
          this.state.dpad[dir] = false;
          btn.classList.remove('pressed');
          if (this.callbacks.onDpad) this.callbacks.onDpad(dir, false);
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
        this.state.start = true;
        btn.classList.add('pressed');
      }, { passive: false });

      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.state.start = false;
        btn.classList.remove('pressed');
        if (this.callbacks.onStart) this.callbacks.onStart();
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

      const buttons = [
        { id: 'a', label: 'A', callback: 'onA' },
        { id: 'b', label: 'B', callback: 'onB' }
      ];

      buttons.forEach(({ id, label, callback }) => {
        const btn = document.createElement('div');
        btn.className = `hub-action-btn hub-btn-${id}`;
        btn.textContent = label;

        btn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          this.state[id] = true;
          btn.classList.add('pressed');
          if (this.callbacks[callback]) this.callbacks[callback](true);
        }, { passive: false });

        btn.addEventListener('touchend', (e) => {
          e.preventDefault();
          this.state[id] = false;
          btn.classList.remove('pressed');
          if (this.callbacks[callback]) this.callbacks[callback](false);
        }, { passive: false });

        btn.addEventListener('touchcancel', () => {
          this.state[id] = false;
          btn.classList.remove('pressed');
          if (this.callbacks[callback]) this.callbacks[callback](false);
        });

        container.appendChild(btn);
      });

      this.container.appendChild(container);
    },

    /**
     * Get current state of all controls
     */
    getState: function() {
      return { ...this.state };
    },

    /**
     * Show the controls
     */
    show: function() {
      if (this.container) {
        this.container.style.display = '';
      }
    },

    /**
     * Hide the controls
     */
    hide: function() {
      if (this.container) {
        this.container.style.display = 'none';
      }
    },

    /**
     * Destroy and cleanup
     */
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

  // Auto-initialize if data attribute is present
  if (document.currentScript?.hasAttribute('data-auto-init')) {
    document.addEventListener('DOMContentLoaded', () => HubControls.init());
  }

})(typeof window !== 'undefined' ? window : this);

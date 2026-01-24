/**
 * HubControls Adapter Loader
 * Auto-detects game framework and loads appropriate adapter
 * 
 * Usage (simplest):
 *   <script src="https://www.dreamdealer.dev/hub-controls.js" defer></script>
 *   <script src="https://www.dreamdealer.dev/adapters/index.js" defer></script>
 *   
 *   // Then in your game:
 *   const input = window.HubAdapter.getInput();
 * 
 * Usage (explicit):
 *   import { loadAdapter } from 'https://www.dreamdealer.dev/adapters/index.js';
 *   const adapter = await loadAdapter('phaser'); // or 'three'
 */

(function(global) {
  'use strict';

  const AdapterLoader = {
    adapter: null,
    type: null,

    /**
     * Detect which game framework is being used
     */
    detectFramework: function() {
      // Check for Phaser
      if (typeof Phaser !== 'undefined') {
        return 'phaser';
      }
      
      // Check for Three.js
      if (typeof THREE !== 'undefined') {
        return 'three';
      }

      // Check for Babylon.js
      if (typeof BABYLON !== 'undefined') {
        return 'babylon';
      }

      // Check for PixiJS
      if (typeof PIXI !== 'undefined') {
        return 'pixi';
      }

      return 'generic';
    },

    /**
     * Load the appropriate adapter
     */
    load: async function(framework = null) {
      const type = framework || this.detectFramework();
      this.type = type;

      console.log(`🎮 AdapterLoader: Detected framework "${type}"`);

      const baseUrl = this.getBaseUrl();

      switch (type) {
        case 'phaser':
          const { HubPhaserAdapter } = await import(`${baseUrl}/adapters/phaser-adapter.js`);
          return HubPhaserAdapter;
          
        case 'three':
        case 'babylon':
          const { HubThreeAdapter } = await import(`${baseUrl}/adapters/three-adapter.js`);
          return HubThreeAdapter;
          
        default:
          // Return a generic adapter that wraps HubControls directly
          return this.createGenericAdapter();
      }
    },

    /**
     * Get the base URL for loading adapters
     */
    getBaseUrl: function() {
      // Try to detect from script tag
      const scripts = document.querySelectorAll('script[src*="hub-controls"], script[src*="adapters"]');
      for (const script of scripts) {
        const src = script.src;
        if (src.includes('dreamdealer.dev')) {
          return 'https://www.dreamdealer.dev';
        }
        if (src.includes('localhost')) {
          const url = new URL(src);
          return url.origin;
        }
      }
      // Fallback
      return 'https://www.dreamdealer.dev';
    },

    /**
     * Create a generic adapter for vanilla JS games
     */
    createGenericAdapter: function() {
      return class GenericAdapter {
        constructor() {
          this._prevButtons = {};
          this.keys = {};
          this.setupKeyboard();
        }

        setupKeyboard() {
          window.addEventListener('keydown', (e) => this.keys[e.code] = true);
          window.addEventListener('keyup', (e) => this.keys[e.code] = false);
        }

        getInput() {
          const hub = window.HubControls?.enabled ? window.HubControls.getState() : null;
          const dz = 0.3;

          let left = this.keys['KeyA'] || this.keys['ArrowLeft'];
          let right = this.keys['KeyD'] || this.keys['ArrowRight'];
          let up = this.keys['KeyW'] || this.keys['ArrowUp'];
          let down = this.keys['KeyS'] || this.keys['ArrowDown'];

          if (hub) {
            left = left || hub.direction.x < -dz;
            right = right || hub.direction.x > dz;
            up = up || hub.direction.y < -dz;
            down = down || hub.direction.y > dz;
          }

          const a = hub?.buttons.a || this.keys['Space'] || this.keys['Enter'];
          const b = hub?.buttons.b || this.keys['Escape'];

          return {
            left, right, up, down,
            direction: hub?.direction || {
              x: (left ? -1 : 0) + (right ? 1 : 0),
              y: (up ? -1 : 0) + (down ? 1 : 0)
            },
            a, b,
            x: hub?.buttons.x || false,
            y: hub?.buttons.y || false,
            start: hub?.buttons.start || this.keys['Tab'],
            jump: a,
            confirm: a,
            cancel: b,
            hasGamepad: hub?.source?.gamepad || false,
            hasTouch: hub?.source?.touch || false
          };
        }

        justPressed(button) {
          const current = this.getInput()[button];
          const prev = this._prevButtons[button] || false;
          return current && !prev;
        }

        endFrame() {
          const input = this.getInput();
          ['a', 'b', 'x', 'y', 'start', 'left', 'right', 'up', 'down'].forEach(btn => {
            this._prevButtons[btn] = input[btn];
          });
        }
      };
    },

    /**
     * Initialize with auto-detection
     * Creates a global HubAdapter instance
     */
    autoInit: async function(scene = null) {
      // Wait for HubControls to be ready
      if (!window.HubControls?.enabled) {
        await new Promise(resolve => {
          const check = setInterval(() => {
            if (window.HubControls?.enabled) {
              clearInterval(check);
              resolve();
            }
          }, 50);
          // Timeout after 2 seconds
          setTimeout(() => {
            clearInterval(check);
            resolve();
          }, 2000);
        });
      }

      const AdapterClass = await this.load();
      
      // For Phaser, scene is required
      if (this.type === 'phaser' && scene) {
        this.adapter = new AdapterClass(scene);
      } else {
        this.adapter = new AdapterClass();
      }

      global.HubAdapter = this.adapter;
      console.log('🎮 AdapterLoader: HubAdapter ready as window.HubAdapter');
      
      return this.adapter;
    }
  };

  // Export
  global.AdapterLoader = AdapterLoader;

  // ES Module export helper
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdapterLoader, loadAdapter: AdapterLoader.load.bind(AdapterLoader) };
  }

})(typeof window !== 'undefined' ? window : this);

// ES Module exports
export const loadAdapter = (framework) => window.AdapterLoader.load(framework);
export const autoInit = (scene) => window.AdapterLoader.autoInit(scene);
export default window.AdapterLoader;

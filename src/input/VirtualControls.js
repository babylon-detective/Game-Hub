/**
 * Virtual Controls for touch devices
 * Creates D-pad, Start button, and action buttons overlay
 * This module is designed to be used across all Game Hub projects
 */
export class VirtualControls {
  constructor(inputManager) {
    this.input = inputManager;
    this.container = document.getElementById('virtual-controls');
    this.enabled = false;
    
    this.dpadState = { up: false, down: false, left: false, right: false };
    this.buttonState = { a: false, b: false, start: false };
    
    this.init();
  }

  init() {
    // Only show on touch devices
    if (!this.input.hasTouch()) {
      return;
    }

    this.enabled = true;
    this.container.classList.add('active');
    this.createDpad();
    this.createStartButton();
    this.createActionButtons();
  }

  createDpad() {
    const dpad = document.createElement('div');
    dpad.className = 'dpad-container';
    
    const directions = [
      { dir: 'up', symbol: '▲' },
      { dir: 'down', symbol: '▼' },
      { dir: 'left', symbol: '◀' },
      { dir: 'right', symbol: '▶' }
    ];

    directions.forEach(({ dir, symbol }) => {
      const btn = document.createElement('div');
      btn.className = `dpad-btn dpad-${dir}`;
      btn.textContent = symbol;
      btn.dataset.direction = dir;
      
      // Touch events
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.handleDpadPress(dir, true);
        btn.classList.add('pressed');
      }, { passive: false });

      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.handleDpadPress(dir, false);
        btn.classList.remove('pressed');
      }, { passive: false });

      btn.addEventListener('touchcancel', () => {
        this.handleDpadPress(dir, false);
        btn.classList.remove('pressed');
      });

      dpad.appendChild(btn);
    });

    this.container.appendChild(dpad);
  }

  createStartButton() {
    const startBtn = document.createElement('div');
    startBtn.className = 'start-btn';
    startBtn.textContent = 'START';
    startBtn.dataset.button = 'start';

    startBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleButtonPress('start', true);
      startBtn.classList.add('pressed');
    }, { passive: false });

    startBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.handleButtonPress('start', false);
      startBtn.classList.remove('pressed');
    }, { passive: false });

    startBtn.addEventListener('touchcancel', () => {
      this.handleButtonPress('start', false);
      startBtn.classList.remove('pressed');
    });

    this.container.appendChild(startBtn);
  }

  createActionButtons() {
    const actions = document.createElement('div');
    actions.className = 'action-buttons';
    
    const buttons = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' }
    ];

    buttons.forEach(({ id, label }) => {
      const btn = document.createElement('div');
      btn.className = `action-btn btn-${id}`;
      btn.textContent = label;
      btn.dataset.button = id;

      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.handleButtonPress(id, true);
        btn.classList.add('pressed');
      }, { passive: false });

      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.handleButtonPress(id, false);
        btn.classList.remove('pressed');
      }, { passive: false });

      btn.addEventListener('touchcancel', () => {
        this.handleButtonPress(id, false);
        btn.classList.remove('pressed');
      });

      actions.appendChild(btn);
    });

    this.container.appendChild(actions);
  }

  handleDpadPress(direction, pressed) {
    this.dpadState[direction] = pressed;
    this.updateInputDirection();
  }

  handleButtonPress(button, pressed) {
    this.buttonState[button] = pressed;
    this.input.setTouchButton(button, pressed);
  }

  updateInputDirection() {
    let x = 0, y = 0;
    
    if (this.dpadState.left) x -= 1;
    if (this.dpadState.right) x += 1;
    if (this.dpadState.up) y -= 1;
    if (this.dpadState.down) y += 1;
    
    this.input.setTouchDirection(x, y);
  }

  show() {
    if (this.enabled) {
      this.container.classList.add('active');
    }
  }

  hide() {
    this.container.classList.remove('active');
  }
}

import { InputManager } from './input/InputManager.js';
import { VirtualControls } from './input/VirtualControls.js';
import { HubScene } from './hub/HubScene.js';

// Initialize
const canvas = document.getElementById('hub-canvas');
const input = new InputManager();
const virtualControls = new VirtualControls(input);
const hub = new HubScene(canvas, input);

// Game loop
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  // Update input state (poll gamepad, etc.)
  input.update();
  
  // Update and render
  hub.update(dt);
  hub.render();

  // Store previous input state for next frame's justPressed detection
  input.endFrame();

  requestAnimationFrame(gameLoop);
}

// Start
requestAnimationFrame(gameLoop);

console.log('🎮 Game Hub initialized');
console.log('Touch support:', input.hasTouch());

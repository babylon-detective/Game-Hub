# Game Hub Input System - Integration Guide

## Overview

The Game Hub provides a unified input system that works across all platforms:
- **Touch devices**: Virtual D-pad + A/B buttons
- **Gamepads**: Full controller support (Xbox, PlayStation, generic)
- **Keyboard**: WASD/Arrow keys + action keys

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    hub-controls.js                          │
│  ├─ Virtual touch controls (D-pad, A, B, Start)            │
│  ├─ Gamepad polling (all 4 controller slots)               │
│  ├─ Keyboard event simulation (legacy compatibility)        │
│  └─ Unified state API: HubControls.getState()              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Framework Adapters                        │
│  ├─ phaser-adapter.js  (Phaser 3 games)                    │
│  ├─ three-adapter.js   (Three.js / Babylon.js games)       │
│  └─ index.js           (Auto-detection & generic adapter)  │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration by Game

### 1. Phaser-Nageex (Phaser 3 RPG)

**File to modify**: `src/scenes/GameScene.js` (or main gameplay scene)

```javascript
// At the top of your scene file
import { HubPhaserAdapter } from 'https://www.dreamdealer.dev/adapters/phaser-adapter.js';

// In your scene's create() method:
create() {
  // ... existing code ...
  
  // Initialize Hub input adapter
  this.hubInput = new HubPhaserAdapter(this);
}

// In your scene's update() method:
update(time, delta) {
  const input = this.hubInput.getInput();
  
  // Movement (replaces this.cursors checks)
  if (input.left) this.player.setVelocityX(-160);
  else if (input.right) this.player.setVelocityX(160);
  else this.player.setVelocityX(0);
  
  if (input.up) this.player.setVelocityY(-160);
  else if (input.down) this.player.setVelocityY(160);
  else this.player.setVelocityY(0);
  
  // Interaction (replaces keyboard checks)
  if (this.hubInput.justPressed('a')) {
    this.interact();
  }
  
  if (this.hubInput.justPressed('b')) {
    this.openMenu();
  }
  
  // Track previous state for justPressed detection
  this.hubInput.endFrame();
}
```

**Add to index.html** (before game script):
```html
<script src="https://www.dreamdealer.dev/hub-controls.js" defer></script>
```

---

### 2. Island_crisis_three.js (Three.js Action)

**File to modify**: `src/game.js` or wherever your game loop is

```javascript
// At the top
import { HubThreeAdapter } from 'https://www.dreamdealer.dev/adapters/three-adapter.js';

// Initialize (after HubControls is ready)
const hubInput = new HubThreeAdapter();

// In your animation loop:
function animate(time) {
  const delta = clock.getDelta();
  const input = hubInput.getInput();
  
  // Character movement
  const moveSpeed = 10;
  player.position.x += input.direction.x * moveSpeed * delta;
  player.position.z += input.direction.y * moveSpeed * delta;
  
  // Camera rotation (right stick)
  if (input.hasGamepad) {
    camera.rotation.y -= input.rightStick.x * 2 * delta;
    camera.rotation.x -= input.rightStick.y * 1 * delta;
  }
  
  // Actions
  if (hubInput.justPressed('a')) {
    player.jump();
  }
  
  if (input.rb || input.sprint) {
    player.sprint = true;
  }
  
  // End frame for justPressed tracking
  hubInput.endFrame();
  
  requestAnimationFrame(animate);
}
```

---

### 3. Phaser-IslandCrisis (Phaser 3 Platformer)

**File to modify**: Main game scene

```javascript
import { HubPhaserAdapter } from 'https://www.dreamdealer.dev/adapters/phaser-adapter.js';

class GameScene extends Phaser.Scene {
  create() {
    this.hubInput = new HubPhaserAdapter(this);
  }
  
  update() {
    const input = this.hubInput.getInput();
    
    // Platformer movement
    if (input.left) {
      this.player.setVelocityX(-200);
      this.player.flipX = true;
    } else if (input.right) {
      this.player.setVelocityX(200);
      this.player.flipX = false;
    } else {
      this.player.setVelocityX(0);
    }
    
    // Jump (with ground check)
    if (this.hubInput.justPressed('a') && this.player.body.onFloor()) {
      this.player.setVelocityY(-400);
    }
    
    this.hubInput.endFrame();
  }
}
```

---

### 4. Phaser-Wario-Clone (Phaser 3 Microgames)

**File to modify**: Each microgame scene

```javascript
import { HubPhaserAdapter } from 'https://www.dreamdealer.dev/adapters/phaser-adapter.js';

class MicrogameScene extends Phaser.Scene {
  create() {
    this.hubInput = new HubPhaserAdapter(this);
  }
  
  update() {
    const input = this.hubInput.getInput();
    
    // Microgames typically use simple input
    // A button for action
    if (this.hubInput.justPressed('a')) {
      this.doAction();
    }
    
    // Direction for movement/aiming
    if (input.left) this.moveLeft();
    if (input.right) this.moveRight();
    
    this.hubInput.endFrame();
  }
}
```

---

### 5. Thumb-Game (Phaser 3 Multiplayer)

**File to modify**: Player controller scene

```javascript
import { HubPhaserAdapter } from 'https://www.dreamdealer.dev/adapters/phaser-adapter.js';

class GameScene extends Phaser.Scene {
  create() {
    this.hubInput = new HubPhaserAdapter(this);
  }
  
  update() {
    const input = this.hubInput.getInput();
    
    // Use analog values for smooth movement if available
    const analog = this.hubInput.getAnalog();
    
    // Apply to player
    this.player.setVelocity(
      analog.x * this.moveSpeed,
      analog.y * this.moveSpeed
    );
    
    if (this.hubInput.justPressed('a')) {
      this.attack();
    }
    
    this.hubInput.endFrame();
  }
}
```

---

## Quick Reference: Input State

```javascript
const input = hubInput.getInput();

// Directions (boolean)
input.left      // D-pad/stick left
input.right     // D-pad/stick right  
input.up        // D-pad/stick up
input.down      // D-pad/stick down

// Direction vector (analog, -1 to 1)
input.direction.x
input.direction.y

// Buttons
input.a         // A / Cross / Space / Enter
input.b         // B / Circle / Escape
input.x         // X / Square
input.y         // Y / Triangle
input.start     // Start / Options
input.select    // Select / Share
input.lb        // Left bumper / L1
input.rb        // Right bumper / R1
input.lt        // Left trigger / L2
input.rt        // Right trigger / R2

// Aliases
input.jump      // Same as A
input.confirm   // Same as A
input.cancel    // Same as B
input.interact  // Same as A
input.pause     // Same as Start

// Source detection
input.hasGamepad  // true if gamepad connected
input.hasTouch    // true if touch device
```

---

## Button Detection

```javascript
// Currently pressed (held down)
if (input.a) { ... }

// Just pressed this frame (for single actions)
if (hubInput.justPressed('a')) { ... }

// Just released this frame
if (hubInput.justReleased('a')) { ... }

// IMPORTANT: Call at end of update() for justPressed to work
hubInput.endFrame();
```

---

## Removing Old Input Code

When integrating, you can typically **remove**:

```javascript
// REMOVE these Phaser patterns:
this.cursors = this.input.keyboard.createCursorKeys();
this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
if (this.cursors.left.isDown) { ... }

// REMOVE custom touch/joystick code:
this.joystick = this.plugins.get('rexvirtualjoystickplugin')...
document.getElementById('touch-controls')...

// REMOVE manual gamepad polling:
const gamepads = navigator.getGamepads();
```

**Replace with**:
```javascript
this.hubInput = new HubPhaserAdapter(this);
const input = this.hubInput.getInput();
```

---

## Hosting the Scripts

The adapters are hosted at:
- `https://www.dreamdealer.dev/hub-controls.js`
- `https://www.dreamdealer.dev/adapters/phaser-adapter.js`
- `https://www.dreamdealer.dev/adapters/three-adapter.js`
- `https://www.dreamdealer.dev/adapters/index.js`

Or for local development, they're in `Game-Hub/public/`.

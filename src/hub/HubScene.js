/**
 * Game Hub Scene
 * Canvas-based game selection menu
 */
export class HubScene {
  constructor(canvas, inputManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = inputManager;
    
    this.selectedIndex = 0;
    this.games = [
      {
        id: 'nageex',
        title: 'Nageex RPG',
        subtitle: 'Phaser 3 • Adventure RPG',
        url: 'https://nageex.vercel.app/',
        color: '#4fc3f7',
        thumbnail: null
      },
      {
        id: 'island-crisis-3d',
        title: 'Island Crisis 3D',
        subtitle: 'Three.js • Action Adventure',
        url: 'https://island-crisis.vercel.app/',
        color: '#81c784',
        thumbnail: null
      },
      {
        id: 'island-crisis-2d',
        title: 'Island Crisis 2D',
        subtitle: 'Phaser 3 • Platformer',
        url: 'https://phaser-island-crisis.vercel.app/',
        color: '#ffb74d',
        thumbnail: null
      },
      {
        id: 'thumb-game',
        title: 'Thumb Game',
        subtitle: 'Phaser 3 • Multiplayer',
        url: 'https://thumb-game.vercel.app/',
        color: '#f06292',
        thumbnail: null
      },
      {
        id: 'wario-clone',
        title: 'Wario Clone',
        subtitle: 'Phaser 3 • Microgames',
        url: 'https://wario-clone.vercel.app/',
        color: '#ba68c8',
        thumbnail: null
      }
    ];

    // Animation state
    this.time = 0;
    this.selectCooldown = 0;
    this.transitionAlpha = 0;
    this.isTransitioning = false;
    
    // Layout
    this.cardWidth = 200;
    this.cardHeight = 150;
    this.cardGap = 20;
    this.scrollX = 0;
    this.targetScrollX = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.scale(dpr, dpr);
    
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    // Adjust card size for mobile
    if (this.width < 600) {
      this.cardWidth = 140;
      this.cardHeight = 110;
      this.cardGap = 15;
    } else {
      this.cardWidth = 200;
      this.cardHeight = 150;
      this.cardGap = 20;
    }
  }

  update(dt) {
    this.time += dt;
    
    if (this.isTransitioning) {
      this.transitionAlpha = Math.min(1, this.transitionAlpha + dt * 2);
      if (this.transitionAlpha >= 1) {
        window.location.href = this.games[this.selectedIndex].url;
      }
      return;
    }

    // Navigation cooldown
    if (this.selectCooldown > 0) {
      this.selectCooldown -= dt;
    }

    // Handle input
    if (this.selectCooldown <= 0) {
      if (this.input.justPressed('left') || this.input.justPressed('up')) {
        this.selectedIndex = (this.selectedIndex - 1 + this.games.length) % this.games.length;
        this.selectCooldown = 0.2;
      }
      if (this.input.justPressed('right') || this.input.justPressed('down')) {
        this.selectedIndex = (this.selectedIndex + 1) % this.games.length;
        this.selectCooldown = 0.2;
      }
    }

    if (this.input.justPressed('confirm')) {
      this.launchGame();
    }

    // Smooth scroll to selected
    const cardsPerRow = Math.floor((this.width - 100) / (this.cardWidth + this.cardGap)) || 1;
    const row = Math.floor(this.selectedIndex / cardsPerRow);
    const targetY = row * (this.cardHeight + this.cardGap + 40);
    
    this.targetScrollX = this.selectedIndex * (this.cardWidth + this.cardGap);
    this.scrollX += (this.targetScrollX - this.scrollX) * 0.1;
  }

  launchGame() {
    this.isTransitioning = true;
    this.transitionAlpha = 0;
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Animated background particles
    this.renderParticles(ctx);

    // Title
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Segoe UI", system-ui, sans-serif';
    ctx.shadowColor = 'rgba(79, 195, 247, 0.5)';
    ctx.shadowBlur = 20;
    ctx.fillText('🎮 GAME HUB', w / 2, 60);
    ctx.restore();

    // Subtitle
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '16px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Use D-pad or Arrow Keys to navigate • Press A or Enter to play', w / 2, 90);

    // Game cards
    this.renderGameCards(ctx);

    // Controls hint at bottom
    this.renderControlsHint(ctx);

    // Transition overlay
    if (this.isTransitioning) {
      ctx.fillStyle = `rgba(0, 0, 0, ${this.transitionAlpha})`;
      ctx.fillRect(0, 0, w, h);
      
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(255, 255, 255, ${this.transitionAlpha})`;
      ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
      ctx.fillText('Loading ' + this.games[this.selectedIndex].title + '...', w / 2, h / 2);
    }
  }

  renderParticles(ctx) {
    const count = 50;
    ctx.fillStyle = 'rgba(79, 195, 247, 0.3)';
    
    for (let i = 0; i < count; i++) {
      const seed = i * 1234.5678;
      const x = ((seed + this.time * 20) % this.width);
      const y = ((seed * 0.7 + this.time * 10) % this.height);
      const size = 2 + Math.sin(seed) * 1.5;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderGameCards(ctx) {
    const startY = 140;
    const cardsPerRow = Math.max(1, Math.floor((this.width - 60) / (this.cardWidth + this.cardGap)));
    const totalWidth = Math.min(this.games.length, cardsPerRow) * (this.cardWidth + this.cardGap) - this.cardGap;
    const startX = (this.width - totalWidth) / 2;

    this.games.forEach((game, i) => {
      const row = Math.floor(i / cardsPerRow);
      const col = i % cardsPerRow;
      
      const x = startX + col * (this.cardWidth + this.cardGap);
      const y = startY + row * (this.cardHeight + this.cardGap + 30);
      
      const isSelected = i === this.selectedIndex;
      const scale = isSelected ? 1.05 : 1;
      const glow = isSelected ? 0.8 : 0;

      ctx.save();
      
      // Transform for scale
      const cx = x + this.cardWidth / 2;
      const cy = y + this.cardHeight / 2;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);

      // Glow effect
      if (isSelected) {
        ctx.shadowColor = game.color;
        ctx.shadowBlur = 30;
      }

      // Card background
      const cardGradient = ctx.createLinearGradient(x, y, x, y + this.cardHeight);
      cardGradient.addColorStop(0, isSelected ? game.color + '40' : 'rgba(255,255,255,0.1)');
      cardGradient.addColorStop(1, isSelected ? game.color + '20' : 'rgba(255,255,255,0.05)');
      
      ctx.fillStyle = cardGradient;
      this.roundRect(ctx, x, y, this.cardWidth, this.cardHeight, 12);
      ctx.fill();

      // Border
      ctx.strokeStyle = isSelected ? game.color : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = isSelected ? 3 : 1;
      this.roundRect(ctx, x, y, this.cardWidth, this.cardHeight, 12);
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Game icon placeholder
      ctx.fillStyle = game.color + '60';
      ctx.beginPath();
      ctx.arc(x + this.cardWidth / 2, y + this.cardHeight / 2 - 10, 30, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#fff';
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎮', x + this.cardWidth / 2, y + this.cardHeight / 2 - 2);

      // Title
      ctx.fillStyle = isSelected ? '#fff' : 'rgba(255,255,255,0.8)';
      ctx.font = `bold ${this.cardWidth < 160 ? 12 : 14}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(game.title, x + this.cardWidth / 2, y + this.cardHeight - 25);

      // Subtitle
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = `${this.cardWidth < 160 ? 9 : 11}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillText(game.subtitle, x + this.cardWidth / 2, y + this.cardHeight - 10);

      ctx.restore();
    });
  }

  renderControlsHint(ctx) {
    const y = this.height - 40;
    
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '14px "Segoe UI", system-ui, sans-serif';
    
    if (this.input.hasGamepad()) {
      ctx.fillText('🎮 Gamepad Connected', this.width / 2, y);
    } else if (this.input.hasTouch()) {
      ctx.fillText('Use virtual buttons below to navigate', this.width / 2, y);
    } else {
      ctx.fillText('Arrow Keys / WASD to navigate • Enter to select', this.width / 2, y);
    }
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

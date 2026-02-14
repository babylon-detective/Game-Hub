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
        thumbnail: null,
        lastUpdate: null // Will be fetched from API
      },
      {
        id: 'island-crisis-3d',
        title: 'Island Crisis 3D',
        subtitle: 'Three.js • Action Adventure',
        url: 'https://island-crisis.vercel.app/',
        color: '#81c784',
        thumbnail: null,
        lastUpdate: null
      },
      {
        id: 'island-crisis-2d',
        title: 'Island Crisis 2D',
        subtitle: 'Phaser 3 • Platformer',
        url: 'https://phaser-island-crisis.vercel.app/',
        color: '#ffb74d',
        thumbnail: null,
        lastUpdate: null
      },
      {
        id: 'thumb-game',
        title: 'Thumb Game',
        subtitle: 'Phaser 3 • Multiplayer',
        url: 'https://thumb-game.vercel.app/',
        color: '#f06292',
        thumbnail: null,
        lastUpdate: null
      },
      {
        id: 'wario-clone',
        title: 'Wario Clone',
        subtitle: 'Phaser 3 • Microgames',
        url: 'https://wario-clone.vercel.app/',
        color: '#ba68c8',
        thumbnail: null,
        lastUpdate: null
      }
    ];
    
    // Fetch deployment dates from API
    this.fetchDeploymentDates();

    // Animation state
    this.time = 0;
    this.selectCooldown = 0;
    this.transitionAlpha = 0;
    this.isTransitioning = false;
    
    // Layout
    this.cardWidth = 600;
    this.cardHeight = 450;
    this.cardGap = 40;
    this.scrollY = 0;
    this.targetScrollY = 0;
    this.startY = 140;

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
    
    // Responsive card sizing
    const horizontalPadding = this.width < 500 ? 24 : 40;
    const maxCardWidth = Math.min(600, this.width - horizontalPadding);
    const minCardWidth = 300;
    this.cardWidth = Math.max(minCardWidth, maxCardWidth);
    this.cardHeight = Math.round(this.cardWidth * 0.75);
    this.cardGap = this.width < 600 ? 20 : 40;
    this.startY = this.width < 600 ? 110 : 140;
  }

  update(dt) {
    this.time += dt;
    
    if (this.isTransitioning) {
      this.transitionAlpha = Math.min(1, this.transitionAlpha + dt * 2);
      // Don't keep trying to redirect - it's already in progress
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

    // Smooth vertical scroll to keep selected card in view
    const startY = this.startY;
    const rowHeight = this.cardHeight + this.cardGap + 30;
    const selectedCenterY = startY + this.selectedIndex * rowHeight + this.cardHeight / 2;
    const viewportCenterY = this.height / 2;

    // Center selected card, but never scroll above top
    this.targetScrollY = Math.max(0, selectedCenterY - viewportCenterY);
    this.scrollY += (this.targetScrollY - this.scrollY) * 0.12;
  }

  launchGame() {
    if (this.isTransitioning) return; // Prevent double-tap
    
    this.isTransitioning = true;
    this.transitionAlpha = 0;
    
    const url = this.games[this.selectedIndex].url;
    
    // Redirect after short animation delay - more reliable on iOS
    setTimeout(() => {
      window.location.assign(url);
    }, 500);
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
    ctx.fillText('DREAM DEALER', w / 2, 60);
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
    const startY = this.startY;
    const x = (this.width - this.cardWidth) / 2;

    this.games.forEach((game, i) => {
      const y = startY + i * (this.cardHeight + this.cardGap + 30) - this.scrollY;
      
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

      const sizeScale = Math.max(0.75, Math.min(1, this.cardWidth / 600));
      const titleSize = Math.round(42 * sizeScale);
      const subtitleSize = Math.round(33 * sizeScale);
      const dateSize = Math.round(30 * sizeScale);

      // Title
      ctx.fillStyle = isSelected ? '#fff' : 'rgba(255,255,255,0.8)';
      ctx.font = `bold ${titleSize}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(game.title, x + this.cardWidth / 2, y + this.cardHeight / 2 - Math.round(10 * sizeScale));

      // Subtitle
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = `${subtitleSize}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillText(game.subtitle, x + this.cardWidth / 2, y + this.cardHeight / 2 + Math.round(30 * sizeScale));

      // Last Update date
      const dateStr = this.formatDate(game.lastUpdate);
      ctx.fillStyle = isSelected ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)';
      ctx.font = `${dateSize}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillText(`Last Update: ${dateStr}`, x + this.cardWidth / 2, y + this.cardHeight / 2 + Math.round(70 * sizeScale));

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

  formatDate(date) {
    if (!date) return 'Loading...';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }

  async fetchDeploymentDates() {
    try {
      const response = await fetch(`/api/deployments?t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (!response.ok) throw new Error('API request failed');
      
      const data = await response.json();
      
      // Update games with fetched dates
      data.deployments.forEach(deployment => {
        const game = this.games.find(g => g.id === deployment.id);
        if (game && deployment.lastUpdate) {
          game.lastUpdate = new Date(deployment.lastUpdate);
        }
      });
      
      // Sort games by last update (most recent first)
      this.games.sort((a, b) => {
        if (!a.lastUpdate) return 1;
        if (!b.lastUpdate) return -1;
        return b.lastUpdate - a.lastUpdate;
      });
      
      console.log('✅ Deployment dates loaded');
    } catch (error) {
      console.warn('⚠️ Could not fetch deployment dates:', error.message);
      // Games will show "Loading..." for dates
    }
  }
}

(() => {
  const STARTING_LIFE = 20;

  const lifeTopEl = document.getElementById('life-top');
  const lifeBotEl = document.getElementById('life-bottom');
  const cardTopEl = document.getElementById('card-top');
  const cardBotEl = document.getElementById('card-bottom');
  const diceLayerTop = document.getElementById('dice-top');
  const diceLayerBot = document.getElementById('dice-bottom');
  const rollBtn = document.getElementById('roll');
  const resetBtn = document.getElementById('reset');

  const life = { top: STARTING_LIFE, bottom: STARTING_LIFE };

  function render() {
    lifeTopEl.textContent = life.top;
    lifeBotEl.textContent = life.bottom;
  }

  function bump(el) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 200);
  }

  function flash(cardEl) {
    cardEl.classList.remove('flash');
    void cardEl.offsetWidth;
    cardEl.classList.add('flash');
    setTimeout(() => cardEl.classList.remove('flash'), 360);
  }

  function changeLife(player, delta) {
    if (rolling) return;
    life[player] += delta;
    render();
    bump(player === 'top' ? lifeTopEl : lifeBotEl);
    flash(player === 'top' ? cardTopEl : cardBotEl);
  }

  document.querySelectorAll('.tap-zone').forEach(zone => {
    zone.addEventListener('click', e => {
      e.preventDefault();
      changeLife(zone.dataset.player, parseInt(zone.dataset.delta, 10));
    });
  });

  resetBtn.addEventListener('click', () => {
    if (rolling) return;
    life.top = STARTING_LIFE;
    life.bottom = STARTING_LIFE;
    render();
    bump(lifeTopEl);
    bump(lifeBotEl);
  });

  // --- Dice rendering ---
  const PIPS = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]]
  };
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function buildDieSvg() {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', '6');
    rect.setAttribute('y', '6');
    rect.setAttribute('width', '88');
    rect.setAttribute('height', '88');
    rect.setAttribute('rx', '18');
    rect.setAttribute('class', 'die-face');
    svg.appendChild(rect);
    const pipGroup = document.createElementNS(SVG_NS, 'g');
    pipGroup.setAttribute('class', 'pips');
    svg.appendChild(pipGroup);
    return { svg, pipGroup };
  }

  function setDieFace(pipGroup, value) {
    while (pipGroup.firstChild) pipGroup.removeChild(pipGroup.firstChild);
    PIPS[value].forEach(([cx, cy]) => {
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', cx);
      c.setAttribute('cy', cy);
      c.setAttribute('r', '7');
      c.setAttribute('class', 'die-pip');
      pipGroup.appendChild(c);
    });
  }

  // --- Physics ---
  class Die {
    constructor(layer, finalValue) {
      this.layer = layer;
      this.finalValue = finalValue;
      this.face = 1 + Math.floor(Math.random() * 6);
      this.el = document.createElement('div');
      this.el.className = 'die';
      const { svg, pipGroup } = buildDieSvg();
      this.pipGroup = pipGroup;
      this.el.appendChild(svg);
      setDieFace(this.pipGroup, this.face);
      layer.appendChild(this.el);
      this.settled = false;
      this.faceTimer = 0;
    }

    init() {
      const rect = this.layer.getBoundingClientRect();
      this.cw = rect.width;
      this.ch = rect.height;
      this.size = Math.min(140, Math.max(70, this.cw * 0.22));
      this.el.style.width = this.size + 'px';
      this.el.style.height = this.size + 'px';
      // Random starting position (kept inside bounds)
      this.x = this.size / 2 + Math.random() * Math.max(1, this.cw - this.size);
      this.y = this.size / 2 + Math.random() * Math.max(1, this.ch - this.size);
      // Random initial velocity (px/s) and angular velocity (rad/s)
      const ang = Math.random() * Math.PI * 2;
      const speed = 720 + Math.random() * 380;
      this.vx = Math.cos(ang) * speed;
      this.vy = Math.sin(ang) * speed;
      this.rot = Math.random() * Math.PI * 2;
      this.vrot = (Math.random() - 0.5) * 26; // ±13 rad/s
      this.applyTransform();
      // Reveal next frame so the position takes effect first
      requestAnimationFrame(() => this.el.classList.add('show'));
    }

    step(dt) {
      if (this.settled) return false;
      // Air drag
      this.vx *= 0.987;
      this.vy *= 0.987;
      this.vrot *= 0.99;

      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.rot += this.vrot * dt;

      const r = this.size / 2;
      const bounce = 0.78;
      if (this.x - r < 0)        { this.x = r;          this.vx = -this.vx * bounce; this.vrot += this.vy * 0.002; }
      if (this.x + r > this.cw)  { this.x = this.cw - r; this.vx = -this.vx * bounce; this.vrot -= this.vy * 0.002; }
      if (this.y - r < 0)        { this.y = r;          this.vy = -this.vy * bounce; this.vrot -= this.vx * 0.002; }
      if (this.y + r > this.ch)  { this.y = this.ch - r; this.vy = -this.vy * bounce; this.vrot += this.vx * 0.002; }

      const speed = Math.hypot(this.vx, this.vy);
      this.faceTimer += dt;
      if (speed > 60 && this.faceTimer > 0.06) {
        this.face = 1 + Math.floor(Math.random() * 6);
        setDieFace(this.pipGroup, this.face);
        this.faceTimer = 0;
      } else if (speed <= 60 && this.face !== this.finalValue) {
        this.face = this.finalValue;
        setDieFace(this.pipGroup, this.face);
      }

      if (speed < 6 && Math.abs(this.vrot) < 0.4) {
        this.vx = 0; this.vy = 0; this.vrot = 0;
        if (this.face !== this.finalValue) {
          this.face = this.finalValue;
          setDieFace(this.pipGroup, this.face);
        }
        this.settled = true;
      }

      this.applyTransform();
      return !this.settled;
    }

    applyTransform() {
      const r = this.size / 2;
      this.el.style.transform = `translate(${this.x - r}px, ${this.y - r}px) rotate(${this.rot}rad)`;
    }

    markWinner() { this.el.classList.add('winner'); }

    fadeOutAndRemove(delay = 1700) {
      setTimeout(() => {
        this.el.classList.remove('show');
        setTimeout(() => this.el.remove(), 260);
      }, delay);
    }
  }

  // --- Roll ---
  let rolling = false;

  function rigged() {
    const bottom = 2 + Math.floor(Math.random() * 5);  // 2..6
    const top = 1 + Math.floor(Math.random() * (bottom - 1)); // 1..bottom-1
    return { top, bottom };
  }

  rollBtn.addEventListener('click', () => {
    if (rolling) return;
    rolling = true;
    rollBtn.disabled = true;
    resetBtn.disabled = true;

    diceLayerTop.replaceChildren();
    diceLayerBot.replaceChildren();

    const { top, bottom } = rigged();
    const dieTop = new Die(diceLayerTop, top);
    const dieBot = new Die(diceLayerBot, bottom);

    requestAnimationFrame(() => {
      dieTop.init();
      dieBot.init();
      let last = performance.now();
      function tick(now) {
        const dt = Math.min(0.04, (now - last) / 1000);
        last = now;
        const a = dieTop.step(dt);
        const b = dieBot.step(dt);
        if (a || b) {
          requestAnimationFrame(tick);
        } else {
          dieBot.markWinner();
          dieTop.fadeOutAndRemove(1700);
          dieBot.fadeOutAndRemove(1700);
          setTimeout(() => {
            rolling = false;
            rollBtn.disabled = false;
            resetBtn.disabled = false;
          }, 2100);
        }
      }
      requestAnimationFrame(tick);
    });
  });

  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
  render();
})();

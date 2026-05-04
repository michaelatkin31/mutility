(() => {
  const STARTING_LIFE = 20;

  const lifeTopEl = document.getElementById('life-top');
  const lifeBotEl = document.getElementById('life-bottom');
  const playerTopEl = document.getElementById('player-top');
  const playerBotEl = document.getElementById('player-bottom');
  const middleEl = document.getElementById('middle');
  const gearBtn = document.getElementById('gear');
  const resetBtn = document.getElementById('reset');
  const rollBtn = document.getElementById('roll');
  const dieTopEl = document.getElementById('die-top');
  const dieBotEl = document.getElementById('die-bottom');

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

  function flash(playerEl) {
    playerEl.classList.remove('flash');
    void playerEl.offsetWidth;
    playerEl.classList.add('flash');
    setTimeout(() => playerEl.classList.remove('flash'), 360);
  }

  function changeLife(player, delta) {
    life[player] += delta;
    render();
    bump(player === 'top' ? lifeTopEl : lifeBotEl);
    flash(player === 'top' ? playerTopEl : playerBotEl);
  }

  document.querySelectorAll('.tap-zone').forEach(zone => {
    const handler = e => {
      e.preventDefault();
      const player = zone.dataset.player;
      const delta = parseInt(zone.dataset.delta, 10);
      changeLife(player, delta);
    };
    zone.addEventListener('click', handler);
  });

  gearBtn.addEventListener('click', () => {
    middleEl.classList.toggle('open');
  });

  resetBtn.addEventListener('click', () => {
    life.top = STARTING_LIFE;
    life.bottom = STARTING_LIFE;
    render();
    bump(lifeTopEl);
    bump(lifeBotEl);
  });

  // --- Dice ---
  const PIPS = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]]
  };

  function renderDieFace(el, value) {
    const SVG_NS = 'http://www.w3.org/2000/svg';
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
    PIPS[value].forEach(([cx, cy]) => {
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', cx);
      c.setAttribute('cy', cy);
      c.setAttribute('r', '7');
      c.setAttribute('class', 'die-pip');
      svg.appendChild(c);
    });
    el.replaceChildren(svg);
  }

  // Rigged: bottom always wins. Bottom rolls 2..6, top rolls 1..bottom-1.
  function riggedRoll() {
    const bottom = 2 + Math.floor(Math.random() * 5);
    const top = 1 + Math.floor(Math.random() * (bottom - 1));
    return { top, bottom };
  }

  function rollAnimation(targets, durationMs = 950) {
    return new Promise(resolve => {
      const start = performance.now();
      let lastFaceChange = 0;
      targets.forEach(([el]) => {
        el.classList.add('show', 'rolling');
        renderDieFace(el, 1 + Math.floor(Math.random() * 6));
      });
      function tick(now) {
        const elapsed = now - start;
        if (elapsed >= durationMs) {
          targets.forEach(([el, finalVal]) => {
            renderDieFace(el, finalVal);
            el.classList.remove('rolling');
          });
          resolve();
          return;
        }
        const t = elapsed / durationMs;
        const interval = 55 + 220 * t * t;
        if (elapsed - lastFaceChange >= interval) {
          lastFaceChange = elapsed;
          targets.forEach(([el]) => renderDieFace(el, 1 + Math.floor(Math.random() * 6)));
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  rollBtn.addEventListener('click', async () => {
    if (rollBtn.disabled) return;
    rollBtn.disabled = true;
    resetBtn.disabled = true;

    const { top, bottom } = riggedRoll();
    await rollAnimation([
      [dieTopEl, top],
      [dieBotEl, bottom]
    ]);

    dieBotEl.classList.add('winner');

    setTimeout(() => {
      dieTopEl.classList.remove('show');
      dieBotEl.classList.remove('show', 'winner');
      rollBtn.disabled = false;
      resetBtn.disabled = false;
    }, 2200);
  });

  // Prevent double-tap zoom on iOS for tap zones / buttons
  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });

  render();
})();

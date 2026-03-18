(function () {
  'use strict';

  /* ─── Slide order ──────────────────────────────────────────────────── */
  const LINEAR = ['s1', 's3', 's4', 's5'];
  const DEMO_SLIDES = { 1: 'd1', 2: 'd2', 3: 'd3' };

  let currentId = 's1';
  let inDemoDetail = false;

  /* ─── Ring state ───────────────────────────────────────────────────── */
  const RING_EL = document.getElementById('ring');
  const RITEMS = Array.from(document.querySelectorAll('.ritem'));
  const N = RITEMS.length;    // 3
  const STEP_DEG = 360 / N;         // 120°
  const RADIUS_Z = 250;             // px
  let ringIndex = 0;             // which item is front (logical)
  let ringAngle = 0;             // cumulative rotation angle (visual)

  const DEMO_META = [
    {
      name: 'System 2 Prompting',
      desc: 'Activating deliberative reasoning — specificity determines whether the model thinks or just reacts',
      color: 'var(--cyan)'
    },
    {
      name: 'Claude Cowork',
      desc: 'The Agent Action Loop made visible — observe, generate sub-programs, execute, evaluate',
      color: 'var(--purple)'
    },
    {
      name: 'OpenClaw',
      desc: 'Delegation Architecture in practice — one instruction, distributed execution, no human bottleneck',
      color: 'var(--amber)'
    }
  ];

  /* ── Initialise ring item positions ──────────────────────────────────── */
  RITEMS.forEach(function (el, i) {
    el.style.transform =
      'rotateY(' + (i * STEP_DEG) + 'deg) translateZ(' + RADIUS_Z + 'px)';
  });

  /* ── Ring rotation ────────────────────────────────────────────────────  */
  function spinRing(delta) {
    ringIndex = ((ringIndex + delta) % N + N) % N;
    ringAngle -= delta * STEP_DEG;   // accumulate — never resets, so no wrap-snap
    RING_EL.style.transform = 'rotateY(' + ringAngle + 'deg)';
    updateRingState();
  }

  function updateRingState() {
    RITEMS.forEach(function (el, i) {
      var pos = ((i - ringIndex) % N + N) % N;
      el.classList.remove('front', 'side', 'back');
      if (pos === 0) el.classList.add('front');
      else if (pos === 1 || pos === N - 1) el.classList.add('side');
      else el.classList.add('back');
    });

    var meta = DEMO_META[ringIndex];
    var nameEl = document.getElementById('rinfo-name');
    var descEl = document.getElementById('rinfo-desc');

    nameEl.style.opacity = '0';
    descEl.style.opacity = '0';
    setTimeout(function () {
      nameEl.textContent = meta.name;
      nameEl.style.color = meta.color;
      descEl.textContent = meta.desc;
      nameEl.style.opacity = '1';
      descEl.style.opacity = '1';
    }, 180);
  }

  /* ── Slide engine ─────────────────────────────────────────────────────  */
  function goTo(id) {
    if (id === currentId) return;
    var from = document.getElementById(currentId);
    var to = document.getElementById(id);
    if (!from || !to) return;

    from.classList.remove('active');
    to.classList.add('active');
    currentId = id;
    updateCounter();
  }

  function updateCounter() {
    var el = document.getElementById('counter');
    var idx = LINEAR.indexOf(currentId);
    el.textContent = inDemoDetail
      ? '\u2014\u2009/\u20094'
      : (idx + 1) + '\u2009/\u20094';
  }

  function next() {
    if (inDemoDetail) return;
    var idx = LINEAR.indexOf(currentId);
    if (idx < LINEAR.length - 1) goTo(LINEAR[idx + 1]);
  }

  function prev() {
    if (inDemoDetail) { backToRing(); return; }
    var idx = LINEAR.indexOf(currentId);
    if (idx > 0) goTo(LINEAR[idx - 1]);
  }

  function backToRing() {
    inDemoDetail = false;
    goTo('s4');
  }

  /* Exposed to inline onclick attributes in HTML */
  window.prev = prev;
  window.next = next;
  window.backToRing = backToRing;

  /* ── Ring item clicks ─────────────────────────────────────────────────  */
  RITEMS.forEach(function (el, i) {
    el.addEventListener('click', function () {
      var diff = ((i - ringIndex) % N + N) % N;
      if (diff === 0) {
        inDemoDetail = true;
        goTo(DEMO_SLIDES[ringIndex + 1]);
      } else if (diff === 1 || diff <= N / 2) {
        spinRing(1);
      } else {
        spinRing(-1);
      }
    });
  });

  /* ── Keyboard ─────────────────────────────────────────────────────────  */
  document.addEventListener('keydown', function (e) {
    if (currentId === 's4' && !inDemoDetail) {
      if (e.key === 'ArrowLeft') { spinRing(-1); return; }
      if (e.key === 'ArrowRight') { spinRing(1); return; }
      if (e.key === 'Enter' || e.key === ' ') {
        inDemoDetail = true;
        goTo(DEMO_SLIDES[ringIndex + 1]);
        return;
      }
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
    if (e.key === 'Escape' && inDemoDetail) backToRing();
  });

  /* ── Set initial ring info colour ────────────────────────────────────  */
  document.getElementById('rinfo-name').style.color = DEMO_META[0].color;

}());

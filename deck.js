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
      name: 'Delegation Architecture',
      desc: 'One instruction — parallel agents — finished output. Then: the questions that follow',
      color: 'var(--amber)'
    }
  ];

  /* ── Initialise ring item positions ──────────────────────────────────── */
  RITEMS.forEach(function (el, i) {
    el.style.transform =
      'rotateY(' + (i * STEP_DEG) + 'deg) translateZ(' + RADIUS_Z + 'px)';
  });

  /* ── Ring sound ───────────────────────────────────────────────────────  */
  var audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playRingClick(direction) {
    try {
      var ctx = getAudioCtx();
      var now = ctx.currentTime;

      // ── 1. Click transient — broadband noise burst shaped by a bandpass
      //       around ~900 Hz to give that physical "stop" sensation ──
      var bufSamples = Math.floor(ctx.sampleRate * 0.028);
      var buf = ctx.createBuffer(1, bufSamples, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < bufSamples; i++) {
        data[i] = (Math.random() * 2 - 1);
      }
      var noise = ctx.createBufferSource();
      noise.buffer = buf;

      var nf = ctx.createBiquadFilter();
      nf.type = 'bandpass';
      nf.frequency.value = 900;
      nf.Q.value = 0.9;

      var ng = ctx.createGain();
      ng.gain.setValueAtTime(0.28, now);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);

      noise.connect(nf);
      nf.connect(ng);
      ng.connect(ctx.destination);
      noise.start(now);

      // ── 2. Low sub-thud — sine wave around 80 Hz, decays in ~60 ms,
      //       gives the heavy mechanical "clunk" bottom end ──
      var sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(80, now);
      sub.frequency.exponentialRampToValueAtTime(40, now + 0.06);

      var subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.35, now);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

      sub.connect(subGain);
      subGain.connect(ctx.destination);
      sub.start(now);
      sub.stop(now + 0.08);

      // ── 3. Mid tonal sweep — sawtooth descending from ~380→140 Hz over
      //       ~130 ms; the "whomp" body of the ratchet step ──
      var freqStart = direction >= 0 ? 380 : 300;
      var freqEnd   = direction >= 0 ? 120 : 100;

      var osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freqStart, now);
      osc.frequency.exponentialRampToValueAtTime(freqEnd, now + 0.13);

      // lowpass to tame the sawtooth harshness
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 600;
      lp.Q.value = 0.5;

      var og = ctx.createGain();
      og.gain.setValueAtTime(0.12, now);
      og.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

      osc.connect(lp);
      lp.connect(og);
      og.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);

    } catch (e) { /* audio not available — silent fallback */ }
  }

  /* ── Demo 1 · Interactive prompt comparison ──────────────────────────  */
  var D1_RESP = {
    a: 'Yes, this looks like a reasonable exam question. It asks students to demonstrate their knowledge of an important historical event and encourages them to consider the contributing factors. You might want to add a suggested word count, or clarify whether students should focus on particular themes — nationalism, the alliance system, the assassination of Archduke Franz Ferdinand. Overall it gives students good scope to show what they know.',

    b: 'Step 1 \u2014 Bloom\'s level\n"Explain" targets Level 2 (Understanding). It asks students to demonstrate comprehension of a topic, not to analyse relationships, evaluate competing arguments, or construct an original historical claim.\n\nStep 2 \u2014 Design weaknesses\n\u2460 No cognitive scaffolding. "Explain the causes" is broad enough for two students to receive equal marks despite answers of very different analytical depth.\n\u2461 No success criteria visible to the student. Without knowing whether one cause or five are expected, or whether a causal chain is required, self-regulation before writing is not possible.\n\nStep 3 \u2014 Improved version\n"Select two structural causes of World War 1. Construct a causal argument showing how each made large-scale conflict more probable, and evaluate which carried the greater long-term weight. Support each claim with at least two pieces of historical evidence."\n\nStep 4 \u2014 Higher-order alignment: 2\u202f/\u202f5\nThe original rewards recall and surface comprehension. It does not require students to argue, weigh competing evidence, or synthesise across sources. The revised version targets Level 4\u20135 (Analyse\u202f/\u202fEvaluate) and makes the quality criteria legible to the student before they begin.'
  };

  var d1Timers = {};

  window.d1Run = function (panel) {
    var btn = document.getElementById('d1-run-' + panel);
    var box = document.getElementById('d1-resp-' + panel);
    if (!btn || !box || btn.disabled) return;
    if (d1Timers[panel]) clearInterval(d1Timers[panel]);
    btn.disabled = true;
    var text = D1_RESP[panel];
    var i = 0;
    box.innerHTML = '';
    d1Timers[panel] = setInterval(function () {
      if (i < text.length) {
        box.innerHTML += text[i] === '\n' ? '<br>' : text[i];
        i++;
        box.scrollTop = box.scrollHeight;
      } else {
        clearInterval(d1Timers[panel]);
      }
    }, 10);
  };

  function d1Reset() {
    ['a', 'b'].forEach(function (p) {
      if (d1Timers[p]) clearInterval(d1Timers[p]);
      var btn = document.getElementById('d1-run-' + p);
      var box = document.getElementById('d1-resp-' + p);
      if (btn) btn.disabled = false;
      if (box) box.innerHTML = '<span style="opacity:0.32;font-style:italic">Response will appear here\u2026</span>';
    });
  }

  /* ── Ring rotation ────────────────────────────────────────────────────  */
  function spinRing(delta) {
    ringIndex = ((ringIndex + delta) % N + N) % N;
    ringAngle -= delta * STEP_DEG;   // accumulate — never resets, so no wrap-snap
    RING_EL.style.transform = 'rotateY(' + ringAngle + 'deg)';
    playRingClick(delta);
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
    if (id === 'd1') d1Reset();
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

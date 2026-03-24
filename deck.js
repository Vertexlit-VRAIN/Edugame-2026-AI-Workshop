(function () {
  'use strict';

  /* ─── Slide order ──────────────────────────────────────────────────── */
  const LINEAR = ['s1', 's3', 's4', 's5', 's6'];
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
  var D1_THINKING = 'The paragraph says "AI is important" \u2014 but that is just restating the premise. Circular.\n\nIs there a main claim anywhere? No. The student describes adoption without positioning an argument. The reader finishes with no idea what the essay will defend.\n\nTwo weaknesses are obvious. First: "some people think it is good, some bad" \u2014 avoidance, not analysis. No position taken, nothing added analytically. Second: every statement is unanchored. "Many fields", "more and more" \u2014 impressionistic, not evidential.\n\nFor the revision I need data that grounds the argument and a tension worth naming. The HEPI 2025 figure \u2014 92% of UK undergraduates using AI for academic work \u2014 is precise and sourced. The tension: adoption is happening without a guidance framework.\n\nArgumentative strength: has to be 1 out of 5. No claim, no evidence, no direction. The gap between this and a strong paragraph is not vocabulary \u2014 it is specificity of thought.';

  var D1_RESP = {
    a: 'This is a reasonable start! You cover a broad topic and give a sense of how widely AI is being adopted. To improve it, try adding more specific examples or evidence to support your points. It would also help to clarify your main argument \u2014 what exactly are you trying to say about AI in education? Overall you have a good foundation to build on.',

    b: 'Step 1 \u2014 Main claim\nThere is no identifiable claim. The paragraph ends with "This shows that AI is important" but this is not an argument \u2014 it restates the premise. The reader has no idea what position this essay will defend or why it matters.\n\nStep 2 \u2014 Argumentation weaknesses\n\u2460 Passive attribution. "Some people think it is good and some think it is bad" avoids taking any position and contributes nothing analytically to the paragraph.\n\u2461 No evidence. Every statement is asserted without data, citation, or example. "Used in many fields" and "students are using it more and more" are unanchored claims the reader cannot evaluate.\n\nStep 3 \u2014 Suggested revision\n"The rapid adoption of AI in higher education \u2014 with 92% of UK undergraduates now using it for academic work (HEPI, 2025) \u2014 demands that universities address a growing gap: students are acquiring a powerful tool without guidance on how to use it responsibly."\n\nStep 4 \u2014 Argumentative strength: 1\u202f/\u202f5\nThe original has no claim, no evidence, and no analytical direction. The revised version opens with concrete data, names a tension, and signals an argument the reader can engage with. The difference is not vocabulary \u2014 it is specificity of thought.'
  };

  var d1Timers = {};

  window.d1Run = function (panel) {
    var btn = document.getElementById('d1-run-' + panel);
    var box = document.getElementById('d1-resp-' + panel);
    if (!btn || !box || btn.disabled) return;
    if (d1Timers[panel]) clearInterval(d1Timers[panel]);
    btn.disabled = true;
    box.innerHTML = '';

    if (panel === 'b') {
      /* Collapse the prompt box to free vertical space for the response */
      var promptB = document.getElementById('d1-prompt-b');
      if (promptB) promptB.classList.add('collapsed');

      /* Phase 1 — thinking block */
      var thinkWrap = document.createElement('div');
      thinkWrap.className = 'd1-think';
      thinkWrap.innerHTML =
        '<div class="d1-think-label"><span class="d1-think-dot"></span>Thinking</div>' +
        '<div class="d1-think-body"></div>';
      box.appendChild(thinkWrap);
      var thinkBody = thinkWrap.querySelector('.d1-think-body');
      var thinkDot  = thinkWrap.querySelector('.d1-think-dot');
      var ti = 0;
      var thinking = D1_THINKING;

      d1Timers[panel] = setInterval(function () {
        if (ti < thinking.length) {
          thinkBody.innerHTML += thinking[ti] === '\n' ? '<br>' : thinking[ti];
          ti++;
          box.scrollTop = box.scrollHeight;
        } else {
          clearInterval(d1Timers[panel]);
          thinkDot.classList.add('done');

          /* Phase 2 — pause then type the structured answer */
          d1Timers[panel] = setTimeout(function () {
            var answerEl = document.createElement('div');
            box.appendChild(answerEl);
            var text = D1_RESP[panel];
            var i = 0;
            d1Timers[panel] = setInterval(function () {
              if (i < text.length) {
                answerEl.innerHTML += text[i] === '\n' ? '<br>' : text[i];
                i++;
                box.scrollTop = box.scrollHeight;
              } else {
                clearInterval(d1Timers[panel]);
              }
            }, 10);
          }, 480);
        }
      }, 4);

    } else {
      /* Panel A — direct response, no thinking phase */
      var text = D1_RESP[panel];
      var i = 0;
      d1Timers[panel] = setInterval(function () {
        if (i < text.length) {
          box.innerHTML += text[i] === '\n' ? '<br>' : text[i];
          i++;
          box.scrollTop = box.scrollHeight;
        } else {
          clearInterval(d1Timers[panel]);
        }
      }, 10);
    }
  };

  function d1Reset() {
    ['a', 'b'].forEach(function (p) {
      if (d1Timers[p]) clearInterval(d1Timers[p]);
      var btn = document.getElementById('d1-run-' + p);
      var box = document.getElementById('d1-resp-' + p);
      if (btn) btn.disabled = false;
      if (box) box.innerHTML = '<span style="opacity:0.32;font-style:italic">Response will appear here\u2026</span>';
    });
    var promptB = document.getElementById('d1-prompt-b');
    if (promptB) promptB.classList.remove('collapsed');
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

  /* ── Slide 5 (s5) hook reveal state ──────────────────────────────────  */
  var s5Revealed = false;

  function revealS5() {
    s5Revealed = true;
    var hook = document.getElementById('s5-hook');
    var data = document.getElementById('s5-data');
    if (hook) hook.classList.add('hidden');
    if (data) data.classList.add('revealed');
  }

  function resetS5() {
    s5Revealed = false;
    var hook = document.getElementById('s5-hook');
    var data = document.getElementById('s5-data');
    if (hook) hook.classList.remove('hidden');
    if (data) data.classList.remove('revealed');
  }

  // click on slide s5 while hook is showing also triggers reveal
  document.getElementById('s5').addEventListener('click', function () {
    if (currentId === 's5' && !s5Revealed) revealS5();
  });

  /* ── Slide 2 (s3) hook reveal state ──────────────────────────────────  */
  var s3Revealed = false;

  function revealS3() {
    s3Revealed = true;
    var hook = document.getElementById('s3-hook');
    var data = document.getElementById('s3-data');
    var chart = document.querySelector('.hepi-chart');
    if (hook) hook.classList.add('hidden');
    if (data) data.classList.add('revealed');
    if (chart) {
      // small delay so the data fade-in starts before bars animate
      setTimeout(function () { chart.classList.remove('bars-hidden'); }, 220);
    }
  }

  function resetS3() {
    s3Revealed = false;
    var hook = document.getElementById('s3-hook');
    var data = document.getElementById('s3-data');
    var chart = document.querySelector('.hepi-chart');
    if (hook) hook.classList.remove('hidden');
    if (data) data.classList.remove('revealed');
    if (chart) chart.classList.add('bars-hidden');
  }

  // click on slide s3 while hook is showing also triggers reveal
  document.getElementById('s3').addEventListener('click', function () {
    if (currentId === 's3' && !s3Revealed) revealS3();
  });

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
    if (id === 's3') resetS3();
    if (id === 's5') resetS5();
  }

  function updateCounter() {
    var el = document.getElementById('counter');
    var idx = LINEAR.indexOf(currentId);
    el.textContent = inDemoDetail
      ? '\u2014\u2009/\u20095'
      : (idx + 1) + '\u2009/\u20095';
  }

  function next() {
    if (inDemoDetail) return;
    if (currentId === 's3' && !s3Revealed) { revealS3(); return; }
    if (currentId === 's5' && !s5Revealed) { revealS5(); return; }
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
    RITEMS.forEach(function (r) { r.style.opacity = ''; r.style.transition = ''; });
    goTo('s4');
  }

  /* Exposed to inline onclick attributes in HTML */
  window.prev = prev;
  window.next = next;
  window.backToRing = backToRing;

  window.d1TogglePrompt = function () {
    var promptB = document.getElementById('d1-prompt-b');
    if (promptB) promptB.classList.toggle('collapsed');
  };

  /* ── Ring item clicks ─────────────────────────────────────────────────  */
  function selectFrontItem(el) {
    var rect    = el.getBoundingClientRect();
    var vw      = window.innerWidth;
    var vh      = window.innerHeight;
    var cx      = rect.left + rect.width  / 2;
    var cy      = rect.top  + rect.height / 2;

    /* CSS layout size (pre-perspective), used as the clone's natural dimensions */
    var cssW    = el.offsetWidth;
    var cssH    = el.offsetHeight;

    /* How much the perspective container is zooming the card visually */
    var perspFactor = rect.width / cssW;

    /* Scale to cover every viewport corner, measured in CSS units */
    var finalScale = Math.ceil(Math.max(
      2 * cx        / cssW,
      2 * (vw - cx) / cssW,
      2 * cy        / cssH,
      2 * (vh - cy) / cssH
    )) + 1;

    /* Clone first, before touching the original */
    var clone = el.cloneNode(true);

    /* Hide the original instantly — suppress the CSS opacity transition first */
    el.style.transition = 'none';
    el.style.opacity    = '0';

    /* Clear any inherited inline opacity/transition from the original */
    clone.style.opacity   = '';
    clone.style.transition = '';

    /* Clone keeps its natural CSS size; start transform matches the perspective zoom
       so it looks pixel-identical to the original card from frame one */
    clone.style.position        = 'fixed';
    clone.style.left            = (cx - cssW / 2) + 'px';
    clone.style.top             = (cy - cssH / 2) + 'px';
    clone.style.width           = cssW + 'px';
    clone.style.height          = cssH + 'px';
    clone.style.margin          = '0';
    clone.style.transform       = 'scale(' + perspFactor + ')';
    clone.style.animation       = 'none';
    clone.style.zIndex          = '500';
    clone.style.pointerEvents   = 'none';
    clone.style.transformOrigin = 'center center';
    clone.style.transition      = [
      'transform 0.42s cubic-bezier(0.55, 0, 1, 0.7)',
      'opacity 0.38s cubic-bezier(0.4, 0, 1, 1)',
      'border-radius 0.16s linear'
    ].join(', ');

    /* Blur backdrop — sits behind the clone, blurs everything else out */
    var backdrop = document.createElement('div');
    backdrop.style.position       = 'fixed';
    backdrop.style.inset          = '0';
    backdrop.style.zIndex         = '499';
    backdrop.style.pointerEvents  = 'none';
    backdrop.style.backdropFilter = 'blur(0px)';
    backdrop.style.transition     = 'backdrop-filter 0.38s ease';

    document.body.appendChild(backdrop);
    document.body.appendChild(clone);

    /* Force reflow so the browser registers the start states */
    clone.getBoundingClientRect();

    clone.style.transform         = 'scale(' + finalScale + ')';
    clone.style.opacity           = '0';
    clone.style.borderRadius      = '0px';
    backdrop.style.backdropFilter = 'blur(14px)';

    setTimeout(function () {
      inDemoDetail = true;
      goTo(DEMO_SLIDES[ringIndex + 1]);
      clone.remove();
      backdrop.remove();
    }, 420);
  }

  RITEMS.forEach(function (el, i) {
    el.addEventListener('click', function () {
      var diff = ((i - ringIndex) % N + N) % N;
      if (diff === 0) {
        selectFrontItem(el);
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
        e.preventDefault();
        var frontEl = RITEMS.find(function (r) { return r.classList.contains('front'); });
        if (frontEl) selectFrontItem(frontEl);
        return;
      }
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
    if (e.key === 'Escape' && inDemoDetail) backToRing();
  });

  /* ── Set initial ring info colour ────────────────────────────────────  */
  document.getElementById('rinfo-name').style.color = DEMO_META[0].color;

  /* ── Resizable panel divider factory ─────────────────────────────────  */
  function makeDivider(id, minA, minB) {
    var divider = document.getElementById(id);
    if (!divider) return;
    var container = divider.parentElement;
    var panelA    = container.children[0];
    var panelB    = container.children[2];
    var dragging  = false;
    var startX, startAW, startBW;

    divider.addEventListener('mousedown', function (e) {
      dragging = true;
      startX   = e.clientX;
      startAW  = panelA.getBoundingClientRect().width;
      startBW  = panelB.getBoundingClientRect().width;
      divider.classList.add('is-dragging');
      document.body.style.cursor     = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var dx    = e.clientX - startX;
      var total = startAW + startBW;
      var newA  = Math.max(minA, Math.min(total - minB, startAW + dx));
      var newB  = total - newA;
      panelA.style.flex = '0 0 ' + newA + 'px';
      panelB.style.flex = '0 0 ' + newB + 'px';
    });

    document.addEventListener('mouseup', function () {
      if (!dragging) return;
      dragging = false;
      divider.classList.remove('is-dragging');
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
    });
  }

  makeDivider('d1-divider', 180, 240);
  makeDivider('d2-divider', 180, 260);

  /* ── Dark / light theme toggle ───────────────────────────────────────  */
  (function () {
    var btn = document.getElementById('btn-theme');
    function syncIcon() {
      var dark = document.documentElement.getAttribute('data-theme') === 'dark';
      btn.innerHTML = dark ? '&#9728;' : '&#9790;';
      btn.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    }
    syncIcon();
    window.toggleTheme = function () {
      var dark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (dark) {
        document.documentElement.removeAttribute('data-theme');
        try { localStorage.setItem('theme', 'light'); } catch (e) {}
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        try { localStorage.setItem('theme', 'dark'); } catch (e) {}
      }
      syncIcon();
    };
  }());

}());

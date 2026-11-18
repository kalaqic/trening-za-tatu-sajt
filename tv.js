(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(location.search);
  var TEST = params.has('test'); // /tv?test=1 → kratke vježbe za brzu probu

  var S = {
    room: null, phones: 0, summary: null, plan: null, screen: 'home',
    i: 0, phase: null, remaining: 0, phaseDur: 0, paused: false,
    skippedIdx: {}, doneIdx: {}, extraRest: 0, activeSec: 0, result: null,
    lastSec: null, finishing: false
  };
  var likMain, likNext, net = null, lastSent = 0, wakeLock = null, homeTimer = null;
  var P = window.Program;
  var data = window.Net.loadData();
  function save() { window.Net.saveData(data); if (net) net.broadcast({ t: 'backup', data: data }); }
  var TAGS = { zagrijavanje: 'Zagrijavanje', glavna: 'Glavni dio', proba: 'Nova vježba — samo probaj', smirivanje: 'Smirivanje' };
  var CHECK = '<svg aria-hidden="true"><use href="#i-check"/></svg>';

  // ---------- pomoćne ----------
  function fmt(sec) { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function kg() {
    var w = S.summary && S.summary.weight;
    return (w && (w.today || (w.last && w.last.kg))) || 100;
  }
  function sekundi(n) { var a = n % 10, b = n % 100; return a === 1 && b !== 11 ? 'sekunda' : (a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'sekunde' : 'sekundi'); }
  function streakText(n) { return n + (n % 10 === 1 && n % 100 !== 11 ? ' dan' : ' dana') + ' zaredom'; }
  var toastT;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.add('hidden'); }, 2600);
  }

  // ---------- skaliranje na veličinu TV-a ----------
  // TV-i često odsijeku rubove slike (overscan), pa ostavljamo sigurnosni okvir.
  // Veličina se mijenja sa ?okvir=90 (posto ekrana) i pamti se na TV-u.
  var SAFE = (function () {
    var q = parseInt(params.get('okvir'), 10);
    if (q >= 70 && q <= 100) { window.Net.lsSet('tata-okvir', String(q)); return q / 100; }
    var saved = parseInt(window.Net.lsGet('tata-okvir'), 10);
    return saved >= 70 && saved <= 100 ? saved / 100 : 0.94;
  })();
  function fit() {
    var vv = window.visualViewport;
    var de = document.documentElement;
    var w = (vv && vv.width) || de.clientWidth || window.innerWidth;
    var h = (vv && vv.height) || de.clientHeight || window.innerHeight;
    var s = Math.min(w / 1280, h / 720) * SAFE;
    var x = (w - 1280 * s) / 2 + (vv ? vv.offsetLeft : 0);
    var y = (h - 720 * s) / 2 + (vv ? vv.offsetTop : 0);
    $('stage').style.transform = 'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px) scale(' + s.toFixed(4) + ')';
    if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
  }
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  window.addEventListener('load', fit);
  if (window.visualViewport) { window.visualViewport.addEventListener('resize', fit); window.visualViewport.addEventListener('scroll', fit); }
  // neki TV browseri sami pomjere stranicu (npr. kad dugme dobije fokus) — vrati je nazad
  window.addEventListener('scroll', function () { if (window.scrollX || window.scrollY) window.scrollTo(0, 0); });
  document.addEventListener('scroll', function () { document.documentElement.scrollLeft = 0; document.documentElement.scrollTop = 0; document.body.scrollLeft = 0; document.body.scrollTop = 0; }, true);
  setInterval(fit, 2000);
  function focusNoScroll(el) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } fit(); }

  // ---------- zvuk ----------
  var actx = null;
  function audio() {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
    } catch (e) { actx = null; }
    return actx;
  }
  function beep(freq, ms, vol) {
    var a = audio(); if (!a) return;
    try {
      var o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
      o.type = 'sine'; o.frequency.value = freq || 880;
      g.gain.setValueAtTime(vol || 0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (ms || 150) / 1000);
      o.connect(g); g.connect(a.destination);
      o.start(t); o.stop(t + (ms || 150) / 1000 + 0.05);
    } catch (e) { /* bez zvuka */ }
  }
  function fanfare() { beep(660, 160); setTimeout(function () { beep(880, 160); }, 170); setTimeout(function () { beep(1100, 320); }, 340); }
  ['click', 'keydown', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, audio, { passive: true }); });

  // ---------- muzika: tiho na početnom ekranu, glasnije dok traje trening ----------
  var Music = (function () {
    var QUIET = 0.15, LOUD = 0.7;
    var a = null, target = QUIET, started = false, blocked = false, missing = false, timer = null;
    function hint(show) { var h = $('music-hint'); if (h) h.classList.toggle('hidden', !show); }
    function el() {
      if (a || missing) return a;
      a = document.createElement('audio');
      a.loop = true; a.preload = 'auto'; a.volume = 0;
      ['workout-music-mala.mp3', 'workout-music.mp3'].forEach(function (src) {
        var s = document.createElement('source'); s.src = src; s.type = 'audio/mpeg'; a.appendChild(s);
      });
      a.lastChild.addEventListener('error', function () { missing = true; a = null; hint(false); });
      document.body.appendChild(a);
      return a;
    }
    function ramp() {
      clearInterval(timer);
      timer = setInterval(function () {
        if (!a) { clearInterval(timer); return; }
        var v = a.volume, d = target - v;
        if (Math.abs(d) <= 0.02) { a.volume = target; clearInterval(timer); return; }
        a.volume = Math.max(0, Math.min(1, v + (d > 0 ? 0.02 : -0.02)));
      }, 60);
    }
    function play() {
      var x = el(); if (!x) return;
      var p;
      try { p = x.play(); } catch (e) { blocked = true; hint(true); return; }
      if (p && p.then) p.then(function () { started = true; blocked = false; hint(false); ramp(); }).catch(function () { blocked = true; hint(true); });
      else { started = true; ramp(); }
    }
    return {
      set: function (level) { target = level === 'loud' ? LOUD : QUIET; if (!started) play(); else ramp(); },
      unlock: function () { if (!started && !missing) play(); },
      waiting: function () { return blocked && !started && !missing; }
    };
  })();
  document.addEventListener('click', function () { Music.unlock(); }, true);
  document.addEventListener('touchstart', function () { Music.unlock(); }, { passive: true, capture: true });

  // ---------- ekran ne smije zaspati ----------
  function keepAwake() {
    try { if (navigator.wakeLock && !wakeLock) navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; l.addEventListener('release', function () { wakeLock = null; }); }).catch(function () {}); } catch (e) { /* nema */ }
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && S.screen !== 'home') keepAwake(); });

  // ---------- ekrani ----------
  function show(name) {
    S.screen = name;
    ['home', 'ex', 'rest', 'done'].forEach(function (n) { $('s-' + n).classList.toggle('active', n === name); });
    if (name === 'home') setTimeout(function () { focusNoScroll($('btn-start')); }, 50);
    if (name === 'done') setTimeout(function () { focusNoScroll($('btn-home')); }, 50);
  }

  function renderWeek(el, week) {
    el.innerHTML = (week || []).map(function (d) {
      return '<div class="day' + (d.done ? ' done' : '') + (d.today ? ' today' : '') + '"><div class="c">' + (d.done ? CHECK : '') + '</div><div class="l">' + esc(d.label) + '</div></div>';
    }).join('');
  }

  function renderHome() {
    var s = S.summary; if (!s) return;
    var h = new Date().getHours();
    $('greet').textContent = h < 11 ? 'Dobro jutro!' : (h < 18 ? 'Dobar dan!' : 'Dobro veče!');
    $('home-title').textContent = s.todayDone ? 'Danas si već vježbao. Bravo!' : 'Spreman za današnji trening?';
    $('chips').innerHTML =
      '<div class="chip lvl">Nivo ' + s.level + ' od 5</div>' +
      '<div class="chip">' + s.plan.count + ' vježbi</div>' +
      '<div class="chip">oko ' + s.plan.minutes + ' min</div>' +
      '<div class="chip">sve sjedeći na stolici</div>';
    $('home-streak').textContent = s.streak;
    $('home-record').textContent = 'Rekord: ' + s.record;
    renderWeek($('home-week'), s.week);
    $('btn-start').textContent = s.todayDone ? 'Vježbaj ponovo' : 'Pokreni bez telefona';
  }

  function renderPhoneStatus() {
    var el = $('phone-status');
    var on = S.phones > 0;
    el.classList.toggle('ok', on);
    el.querySelector('.dot').classList.toggle('pulse', !on);
    var txt = on ? 'Telefon povezan — pokreni trening sa telefona' : 'Čekam telefon…';
    if (!on && S.netStatus === 'nocdn') txt = 'Nema interneta — provjeri vezu';
    else if (!on && S.netStatus === 'reconnecting') txt = 'Povezujem se…';
    $('phone-status-text').textContent = txt;
  }

  function loadSummary() {
    S.summary = P.summary(data, P.dayKey());
    renderHome();
    if (likMain) likMain.setWeight(kg());
    if (likNext) likNext.setWeight(kg());
    if (net) net.broadcast({ t: 'summary', summary: S.summary });
    broadcast(true);
    return Promise.resolve(S.summary);
  }

  // ---------- veza sa telefonom ----------
  function phoneUrl(code) {
    return location.origin + location.pathname.replace(/[^/]*$/, '') + 'p.html#' + code;
  }
  function showCode(code) {
    S.room = code;
    var url = phoneUrl(code);
    $('qr').innerHTML = window.makeQrSvg(url);
    $('code').textContent = code.slice(0, 3) + ' ' + code.slice(3);
    $('short-url').textContent = url.replace(/^https?:\/\//, '').replace(/#.*$/, '');
  }
  function setupRoom() {
    showCode(window.Net.tvCode());
    net = window.Net.host(S.room, {
      onStatus: function (st) {
        S.netStatus = st;
        renderPhoneStatus();
      },
      onNewCode: function (code) { showCode(code); },
      onConn: function (count) {
        var before = S.phones; S.phones = count; renderPhoneStatus();
        if (count > before) {
          if (S.screen === 'home') toast('Telefon povezan');
          net.broadcast({ t: 'summary', summary: S.summary });
          broadcast(true);
        }
      },
      onMsg: function (msg, conn) { handleMsg(msg, conn); }
    });
  }

  function handleMsg(msg, conn) {
    if (msg.t === 'hello') {
      // telefon čuva kopiju podataka; ako je TV izgubio svoje, vrati ih sa telefona
      if (msg.backup) {
        var b = window.Net.normalize(msg.backup);
        if (window.Net.richness(b) > window.Net.richness(data)) { data = b; window.Net.saveData(data); loadSummary(); toast('Podaci vraćeni sa telefona'); }
      }
      net.send(conn, { t: 'summary', summary: S.summary });
      net.send(conn, { t: 'backup', data: data });
      net.send(conn, { t: 'state', state: stateForPhone() });
    } else if (msg.t === 'cmd') command(String(msg.cmd || ''));
    else if (msg.t === 'weight') {
      var v = Math.round(Number(String(msg.kg).replace(',', '.')) * 10) / 10;
      if (v >= 30 && v <= 300) { data.weights[P.dayKey()] = v; save(); loadSummary(); }
    } else if (msg.t === 'getSummary') net.send(conn, { t: 'summary', summary: S.summary });
    else if (msg.t === 'admin') {
      if (msg.action === 'level') {
        data.prog.level = Math.max(1, Math.min(5, Number(msg.level) || 1)); data.prog.cleanAtLevel = 0; data.prog.abortStreak = 0;
      } else if (msg.action === 'reset') data = window.Net.fresh();
      save(); loadSummary();
    }
  }

  function stateForPhone() {
    var plan = S.plan, it = plan && plan.items[S.i], nx = plan && plan.items[S.i + 1];
    return {
      screen: S.screen, phase: S.phase, paused: S.paused,
      i: S.i, total: plan ? plan.items.length : 0,
      name: it ? it.name : '', nextName: nx ? nx.name : '', firstName: plan ? plan.items[0].name : '',
      remaining: Math.max(0, S.remaining), phaseDur: S.phaseDur, rest: plan ? plan.rest : 0,
      streak: S.summary ? S.summary.streak : 0, result: S.screen === 'done' ? S.result : null
    };
  }
  function broadcast(force) {
    if (!net) return;
    var now = Date.now();
    if (!force && now - lastSent < 1000) return;
    lastSent = now;
    net.broadcast({ t: 'state', state: stateForPhone() });
  }

  // ---------- trening ----------
  function segs(el, doneUpTo, cur) {
    var n = S.plan.items.length, html = '';
    for (var k = 0; k < n; k++) html += '<div class="seg' + (k < doneUpTo ? ' done' : (k === cur ? ' cur' : '')) + '"></div>';
    el.innerHTML = html;
  }

  function startWorkout() {
    if (S.starting) return;
    S.starting = true;
    clearTimeout(homeTimer);
    Promise.resolve(P.makePlan(data, P.dayKey())).then(function (plan) {
      S.starting = false;
      if (TEST) { plan.items.forEach(function (it) { it.dur = 8; }); plan.rest = 4; }
      Music.set('loud');
      S.plan = plan; S.i = 0; S.skippedIdx = {}; S.doneIdx = {}; S.extraRest = 0; S.activeSec = 0; S.result = null; S.paused = false; S.finishing = false;
      $('pause').classList.add('hidden');
      keepAwake();
      beginCountdown();
    }).catch(function () { S.starting = false; toast('Ne mogu učitati trening. Provjeri da li server radi.'); });
  }

  function beginCountdown() {
    S.phase = 'countdown';
    S.remaining = S.phaseDur = TEST ? 3 : 5;
    S.lastSec = null;
    var first = S.plan.items[0];
    $('s-rest').classList.add('countdown');
    $('rest-done-lbl').textContent = 'VJEŽBI DANAS';
    $('rest-i').textContent = S.plan.items.length; $('rest-n').parentNode.style.display = 'none';
    segs($('rest-segs'), 0, -1);
    $('rest-title').textContent = 'PRIPREMI SE';
    $('rest-text').innerHTML = 'Sjedni udobno na stolicu,<br>stopala na pod.';
    $('rest-hint').classList.add('hidden');
    $('rest-next').textContent = first.name;
    $('rest-next-dur').textContent = first.dur + ' ' + sekundi(first.dur);
    $('rest-streak').textContent = streakText(S.summary ? S.summary.streak : 0);
    likNext.setExercise(first.id); likNext.setWeight(kg()); likNext.play();
    show('rest');
    updateTimers();
    broadcast(true);
  }

  function beginExercise(i) {
    S.i = i; S.phase = 'exercise';
    var it = S.plan.items[i], nx = S.plan.items[i + 1], n = S.plan.items.length;
    S.remaining = S.phaseDur = it.dur;
    S.lastSec = null;
    $('ex-i').textContent = i + 1; $('ex-n').textContent = n;
    segs($('ex-segs'), i, i);
    $('ex-name').textContent = it.name;
    $('ex-how').textContent = it.how;
    $('ex-tag').textContent = TAGS[it.tag] || '';
    $('ex-tag').classList.toggle('proba', it.tag === 'proba');
    $('ex-level').textContent = S.plan.level;
    $('ex-levelname').textContent = S.plan.levelName;
    $('ex-next').textContent = nx ? nx.name + ' · ' + nx.dur + ' s' : 'Kraj treninga';
    $('ex-restinfo').textContent = nx ? 'Zatim odmor ' + S.plan.rest + ' s' : 'Posljednja vježba!';
    $('ex-streak').textContent = streakText(S.summary ? S.summary.streak : 0);
    likNext.pause();
    likMain.setWeight(kg()); likMain.setExercise(it.id);
    if (!S.paused) likMain.play();
    show('ex');
    beep(990, 350);
    updateTimers();
    broadcast(true);
  }

  function beginRest() {
    S.phase = 'rest';
    var nx = S.plan.items[S.i + 1];
    S.remaining = S.phaseDur = S.plan.rest;
    S.lastSec = null;
    $('s-rest').classList.remove('countdown');
    $('rest-done-lbl').textContent = 'ZAVRŠENO';
    $('rest-n').parentNode.style.display = '';
    $('rest-i').textContent = S.i + 1; $('rest-n').textContent = S.plan.items.length;
    segs($('rest-segs'), S.i + 1, -1);
    $('rest-title').textContent = 'ODMOR';
    $('rest-text').innerHTML = 'Popij gutljaj vode<br>i diši polako.';
    $('rest-hint').classList.remove('hidden');
    $('rest-next').textContent = nx.name;
    $('rest-next-dur').textContent = nx.dur + ' ' + sekundi(nx.dur);
    $('rest-streak').textContent = streakText(S.summary ? S.summary.streak : 0);
    likMain.pause();
    likNext.setWeight(kg()); likNext.setExercise(nx.id);
    if (!S.paused) likNext.play();
    show('rest');
    beep(520, 300);
    updateTimers();
    broadcast(true);
  }

  function markDone(i) { S.doneIdx[i] = true; delete S.skippedIdx[i]; }

  function phaseEnd() {
    if (S.phase === 'countdown') return beginExercise(0);
    if (S.phase === 'exercise') {
      markDone(S.i);
      if (S.i >= S.plan.items.length - 1) return finish(true);
      return beginRest();
    }
    if (S.phase === 'rest') return beginExercise(S.i + 1);
  }

  function next() {
    if (S.phase === 'countdown') return beginExercise(0);
    if (S.phase === 'exercise') {
      if (!S.doneIdx[S.i]) S.skippedIdx[S.i] = true;
      if (S.i >= S.plan.items.length - 1) return finish(true);
      toast('Preskočeno');
      return beginRest();
    }
    if (S.phase === 'rest') return beginExercise(S.i + 1);
  }

  function prev() {
    if (S.phase === 'exercise') {
      var elapsed = S.phaseDur - S.remaining;
      if (elapsed > 3 || S.i === 0) return beginExercise(S.i);
      return beginExercise(S.i - 1);
    }
    if (S.phase === 'rest') return beginExercise(S.i);
  }

  function setPaused(p) {
    if (S.screen !== 'ex' && S.screen !== 'rest') return;
    S.paused = p;
    Music.set(p ? 'quiet' : 'loud');
    $('pause').classList.toggle('hidden', !p);
    if (p) { likMain.pause(); likNext.pause(); }
    else if (S.screen === 'ex') likMain.play();
    else likNext.play();
    broadcast(true);
  }

  function finish(reachedEnd) {
    if (S.finishing) return;
    S.finishing = true;
    var total = S.plan.items.length;
    var done = Object.keys(S.doneIdx).length;
    var skipped = Object.keys(S.skippedIdx).map(function (k) { return S.plan.items[k].id; });
    S.phase = null; S.paused = false;
    $('pause').classList.add('hidden');
    likMain.pause(); likNext.pause();
    if (!reachedEnd && done === 0) { S.finishing = false; goHome(); return; }
    var payload = { reachedEnd: reachedEnd, done: done, total: total, skipped: skipped, extraRest: S.extraRest, seconds: Math.round(S.activeSec) };
    var res;
    if (TEST) res = fakeResult(payload);
    else { res = P.finishSession(data, payload, P.dayKey()); save(); }
    showDone(res);
  }

  function fakeResult(p) {
    var s = S.summary || { streak: 0, record: 0, week: [], level: 1, levelName: '' };
    return { counts: true, done: p.done, total: p.total, seconds: p.seconds, streak: s.streak, record: s.record, newRecord: false, levelChange: 0, level: s.level, levelName: s.levelName, week: s.week, test: true };
  }

  function showDone(res) {
    S.result = res;
    Music.set('quiet');
    $('done-title').textContent = res.counts ? 'Bravo! Trening završen.' : 'Danas je bilo kraće. Sutra novi pokušaj!';
    $('done-check').classList.toggle('soft', !res.counts);
    $('done-time').textContent = fmt(res.seconds);
    $('done-ex').textContent = res.done + ' / ' + res.total;
    $('done-ex-sub').textContent = res.done === res.total ? 'sve urađeno' : 'urađeno';
    $('done-streak').textContent = res.streak;
    $('done-record').classList.toggle('hidden', !res.newRecord);
    var b = $('level-banner');
    b.classList.toggle('hidden', !res.levelChange);
    b.classList.toggle('down', res.levelChange < 0);
    if (res.levelChange > 0) b.textContent = 'Napredak! Od sljedećeg treninga: Nivo ' + res.level + ' — ' + res.levelName;
    if (res.levelChange < 0) b.textContent = 'Malo smo olakšali: sad je Nivo ' + res.level;
    renderWeek($('done-week'), res.week);
    show('done');
    if (res.counts) fanfare();
    S.finishing = false;
    broadcast(true);
    loadSummary();
    clearTimeout(homeTimer);
    homeTimer = setTimeout(goHome, 5 * 60 * 1000);
  }

  function goHome() {
    clearTimeout(homeTimer);
    Music.set('quiet');
    S.phase = null; S.paused = false; S.plan = S.plan || null;
    $('pause').classList.add('hidden');
    if (likMain) likMain.pause();
    if (likNext) likNext.pause();
    show('home');
    loadSummary();
    broadcast(true);
  }

  function command(cmd) {
    if (cmd === 'start') {
      if (S.screen === 'home' || S.screen === 'done') startWorkout();
      else if (S.paused) setPaused(false);
      return;
    }
    if (cmd === 'home') { if (S.screen === 'done') goHome(); return; }
    if (S.screen !== 'ex' && S.screen !== 'rest') return;
    if (cmd === 'pause') setPaused(true);
    else if (cmd === 'resume') setPaused(false);
    else if (cmd === 'toggle') setPaused(!S.paused);
    else if (cmd === 'next') { if (S.paused) setPaused(false); next(); }
    else if (cmd === 'prev') { if (S.paused) setPaused(false); prev(); }
    else if (cmd === 'addRest') {
      if (S.phase === 'rest') { S.remaining += 15; S.phaseDur += 15; S.extraRest++; toast('+15 sekundi odmora'); updateTimers(); }
    } else if (cmd === 'skipRest') {
      if (S.phase === 'rest') beginExercise(S.i + 1);
      else if (S.phase === 'countdown') beginExercise(0);
    } else if (cmd === 'end') finish(false);
    broadcast(true);
  }

  // ---------- sat ----------
  function updateTimers() {
    var t = fmt(S.remaining);
    if (S.screen === 'ex') {
      $('ex-timer').textContent = t;
      $('ex-timer').classList.toggle('last', S.remaining <= 3.0001);
      $('ex-progress').style.width = (100 * (1 - S.remaining / S.phaseDur)).toFixed(1) + '%';
    } else if (S.screen === 'rest') {
      var rs = Math.max(0, Math.ceil(S.remaining));
      $('rest-timer').textContent = rs;
      $('rest-sub').textContent = sekundi(rs);
      $('ring-fg').style.strokeDashoffset = (942.5 * (1 - S.remaining / S.phaseDur)).toFixed(1);
    }
  }

  var lastTick = performance.now();
  setInterval(function () {
    var now = performance.now(), dt = Math.min(1, (now - lastTick) / 1000);
    lastTick = now;
    if (!S.phase || S.paused || S.finishing) return;
    S.remaining -= dt;
    if (S.phase === 'exercise') S.activeSec += dt;
    var sec = Math.ceil(S.remaining);
    if (sec !== S.lastSec) {
      S.lastSec = sec;
      if (sec >= 1 && sec <= 3) beep(660, 120, 0.18);
      broadcast(false);
    }
    updateTimers();
    if (S.remaining <= 0) phaseEnd();
  }, 200);

  // ---------- daljinski TV-a (tastatura) ----------
  document.addEventListener('keydown', function (e) {
    var k = e.key, code = e.keyCode;
    if (Music.waiting()) {
      // prvi pritisak na daljinskom samo pusti muziku (TV ne da zvuk bez pritiska)
      Music.unlock();
      if (S.screen === 'home') { e.preventDefault(); return; }
    }
    var ok = k === 'Enter' || k === ' ' || code === 13 || k === 'MediaPlayPause' || code === 179 || code === 415 || code === 19;
    if (ok) {
      if (S.screen === 'home' && document.activeElement && document.activeElement.tagName === 'BUTTON') return; // dugme samo radi
      if (S.screen === 'done' && document.activeElement === $('btn-home')) return;
      e.preventDefault();
      if (S.screen === 'home' || S.screen === 'done') command('start');
      else command('toggle');
    } else if ((k === 'ArrowRight' || code === 39) && (S.screen === 'ex' || S.screen === 'rest')) { e.preventDefault(); command('next'); }
    else if ((k === 'ArrowLeft' || code === 37) && (S.screen === 'ex' || S.screen === 'rest')) { e.preventDefault(); command('prev'); }
    else if (k === 'f' || k === 'F') toggleFs();
  });

  function toggleFs() {
    try {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    } catch (e) { /* TV možda ne podržava */ }
  }

  // ---------- start ----------
  $('btn-start').addEventListener('click', function () { command('start'); });
  $('btn-fs').addEventListener('click', toggleFs);
  $('btn-home').addEventListener('click', goHome);

  fit();
  likMain = new window.LikPlayer($('lik-main'), { showCue: true, ex: 'ruke', kg: 100 });
  likNext = new window.LikPlayer($('lik-next'), { showCue: false, ex: 'marsiranje', kg: 100 });
  show('home');
  Music.set('quiet');
  if (TEST) toast('Probni način: vježbe traju 8 s i ne upisuju se');
  loadSummary();
  setupRoom();
})();

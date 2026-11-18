(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var S = { room: null, tvOnline: false, tv: null, summary: null, base: null, kg: null, kgTouched: false, lastPhase: null };
  var net = null, lik, wakeLock = null;

  function fmt(sec) { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
  function fmtKg(v) { return (Math.round(v * 10) / 10).toFixed(1).replace('.', ','); }
  function parseKg(s) { var v = parseFloat(String(s).replace(',', '.')); return isFinite(v) ? v : null; }
  function view(name) {
    ['code', 'home', 'remote', 'done'].forEach(function (n) { $('v-' + n).classList.toggle('hidden', n !== name); });
  }
  function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ } }

  // ---------- veza ----------
  function setConn() {
    var c = $('conn');
    if (S.room && !S.tvOnline && !S.everOnline) {
      c.classList.remove('on', 'off');
      $('conn-text').textContent = 'Tražim TV… (TV mora imati otvoren trening)';
      $('tv-off').classList.add('hidden');
      $('btn-go').disabled = true; $('btn-noweigh').disabled = true;
      return;
    }
    if (S.tvOnline) S.everOnline = true;
    c.classList.toggle('on', !!(S.room && S.tvOnline));
    c.classList.toggle('off', !!(S.room && !S.tvOnline));
    $('conn-text').textContent = !S.room ? 'Nije povezano' : (S.tvOnline ? 'Povezano sa TV-om' : 'TV nije uključen');
    $('tv-off').classList.toggle('hidden', !S.room || S.tvOnline);
    $('btn-go').disabled = !S.tvOnline;
    $('btn-noweigh').disabled = !S.tvOnline;
    if (S.summary) {
      $('conn-streak').classList.remove('hidden');
      $('conn-streak-n').textContent = S.summary.streak;
    }
  }

  function codeFromUrl() {
    var m = (location.hash || '').match(/(\d{6})/);
    return m ? m[1] : null;
  }

  function join(code) {
    S.room = code;
    window.Net.lsSet('tata-room', code);
    if (location.hash !== '#' + code) history.replaceState(null, '', location.pathname + '#' + code);
    $('conn-text').textContent = 'Povezujem se sa TV-om…';
    net = window.Net.client(code, {
      onOpenChange: function (open) { S.tvOnline = open; setConn(); },
      onOpen: function () {
        var backup = null;
        try { backup = JSON.parse(window.Net.lsGet('tata-backup') || 'null'); } catch (e) { backup = null; }
        net.send({ t: 'hello', backup: backup });
      },
      onTvMissing: function () { S.tvOnline = false; setConn(); },
      onNoCdn: function () { $('conn-text').textContent = 'Nema interneta'; },
      onMsg: function (msg) {
        if (msg.t === 'summary' && msg.summary) {
          S.summary = msg.summary;
          if (!S.kgTouched) {
            var w = S.summary.weight;
            S.kg = w.today || (w.last && w.last.kg) || 100;
            $('kg-input').value = fmtKg(S.kg);
          }
          renderHome(); setConn();
        } else if (msg.t === 'backup' && msg.data) {
          window.Net.lsSet('tata-backup', JSON.stringify(msg.data));
        } else if (msg.t === 'state' && msg.state) {
          S.tv = msg.state;
          S.base = { remaining: msg.state.remaining, at: performance.now() };
          if (msg.state.phase !== S.lastPhase) { if (S.lastPhase && msg.state.phase) vibrate(200); S.lastPhase = msg.state.phase; }
          route();
        }
      }
    });
    route();
  }

  function loadSummary() { if (net) net.send({ t: 'getSummary' }); }

  // ---------- početna ----------
  function renderHome() {
    var s = S.summary; if (!s) return;
    var h = new Date().getHours();
    $('hello').textContent = h < 11 ? 'Dobro jutro!' : (h < 18 ? 'Dobar dan!' : 'Dobro veče!');
    renderDelta();
    if (s.todayDone) {
      $('today-main').textContent = 'Danas si već vježbao. Bravo!';
      $('today-sub').textContent = 'Možeš još jedan kratki trening: Dan ' + s.day + ' · ' + s.plan.typeName;
    } else {
      $('today-main').textContent = 'Dan ' + s.day + (s.inPlan ? ' od ' + s.planDays : '') + ' · ' + s.plan.typeName;
      $('today-sub').textContent = s.plan.count + ' vježbi · oko ' + s.plan.minutes + ' min · sedmica ' + s.planWeek + ': ' + s.weekName;
    }
    $('btn-go').querySelector('span').textContent = s.weight.today && !S.kgTouched ? 'Pokreni na TV-u' : 'Spremi i pokreni na TV-u';
  }

  function renderDelta() {
    var s = S.summary, el = $('kg-delta');
    if (!s) return;
    var w = s.weight, ref = w.prev || (w.last && w.last.date !== s.today ? w.last : null);
    el.classList.remove('down', 'up');
    if (w.today && !S.kgTouched) { el.textContent = 'Danas već upisano. Možeš ispraviti.'; }
    else if (!ref || S.kg == null) { el.textContent = 'Prvo vaganje — samo upiši koliko si.'; }
    else {
      var d = Math.round((S.kg - ref.kg) * 10) / 10;
      if (d < 0) { el.textContent = '−' + fmtKg(-d) + ' kg od prošlog puta. Bravo!'; el.classList.add('down'); }
      else if (d > 0) { el.textContent = '+' + fmtKg(d) + ' kg od prošlog puta'; el.classList.add('up'); }
      else el.textContent = 'Isto kao prošli put (' + fmtKg(ref.kg) + ' kg)';
    }
    if (lik && S.kg) lik.setWeight(S.kg);
  }

  function setKg(v) {
    v = Math.max(30, Math.min(300, Math.round(v * 2) / 2));
    S.kg = v; S.kgTouched = true;
    $('kg-input').value = fmtKg(v);
    renderDelta();
    renderHome();
  }

  // ---------- rute ----------
  function route() {
    if (!S.room) { view('code'); return; }
    if (!S.summary && !S.tv) { view('home'); return; }
    var st = S.tv;
    if (st && (st.screen === 'ex' || st.screen === 'rest')) { view('remote'); renderRemote(); keepAwake(); }
    else if (st && st.screen === 'done' && st.result) { view('done'); renderDone(st.result); }
    else { view('home'); renderHome(); }
  }

  function renderRemote() {
    var st = S.tv; if (!st) return;
    var card = document.querySelector('.now');
    var isRest = st.phase === 'rest', isCd = st.phase === 'countdown';
    card.classList.toggle('rest', isRest);
    $('r-phase').textContent = isCd ? 'PRIPREMI SE' : (isRest ? 'ODMOR' : 'VJEŽBA ' + (st.i + 1) + ' OD ' + st.total);
    $('r-name').textContent = isCd ? 'Prva: ' + st.firstName : (isRest ? 'Sljedeće: ' + st.nextName : st.name);
    $('r-sub').textContent = isRest || isCd ? '' : (!st.nextName ? 'posljednja vježba' : (st.rest ? 'zatim odmor ' + st.rest + ' s' : 'odmah sljedeća'));
    $('btn-pp').classList.toggle('paused', !!st.paused);
    $('btn-pp').setAttribute('aria-label', st.paused ? 'Nastavi' : 'Pauza');
    $('pp-icon').setAttribute('href', st.paused ? '#i-play' : '#i-pause');
    $('pp-label').textContent = st.paused ? 'Nastavi' : 'Pauza';
    $('btn-add').disabled = !isRest;
    $('btn-skip').disabled = !(isRest || isCd);
    $('btn-skip').textContent = isCd ? 'Kreni odmah' : 'Preskoči odmor';
    $('btn-prev').disabled = isCd;
    tickRemote();
  }

  function tickRemote() {
    var st = S.tv; if (!st || !S.base) return;
    var rem = st.paused ? S.base.remaining : S.base.remaining - (performance.now() - S.base.at) / 1000;
    rem = Math.max(0, rem);
    $('r-timer').textContent = fmt(rem);
    $('r-bar').style.width = st.phaseDur ? (100 * (1 - rem / st.phaseDur)).toFixed(1) + '%' : '0%';
  }
  setInterval(function () { if (!$('v-remote').classList.contains('hidden')) tickRemote(); }, 250);

  function renderDone(res) {
    $('d-title').textContent = res.counts ? 'Bravo! Trening završen.' : 'Danas je bilo kraće. Sutra novi pokušaj!';
    $('d-check').classList.toggle('soft', !res.counts);
    $('d-streak').textContent = res.streak;
    $('d-record').classList.toggle('hidden', !res.newRecord);
    var msg = res.planFinished ? 'Plan od 28 dana završen!' : (res.newWeek ? 'Nova sedmica ' + res.nextWeek + ': ' + res.nextWeekName : (res.advanced ? 'Sljedeći put: Dan ' + res.nextDay : (!res.counts ? 'Sljedeći put ponavljamo Dan ' + res.nextDay : '')));
    $('d-level').textContent = msg + (res.tip ? (msg ? ' · ' : '') + 'Za danas: ' + res.tip : '');
  }

  function keepAwake() {
    try { if (navigator.wakeLock && !wakeLock) navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; l.addEventListener('release', function () { wakeLock = null; }); }).catch(function () {}); } catch (e) { /* nema */ }
  }

  // ---------- komande ----------
  var toastT;
  function note(msg) {
    var c = $('conn'), t = $('conn-text'), old = t.textContent;
    t.textContent = msg; c.classList.add('off');
    clearTimeout(toastT); toastT = setTimeout(function () { setConn(); }, 2500);
  }
  function cmd(name, btn) {
    if (btn) { btn.disabled = true; setTimeout(function () { btn.disabled = false; renderRemote(); }, 600); }
    var ok = net && net.send({ t: 'cmd', cmd: name });
    if (!ok) note('TV nije povezan — pokušavam ponovo…');
    return Promise.resolve(ok);
  }

  $('code-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var c = $('code-input').value.replace(/\D/g, '');
    if (c.length !== 6) { $('code-err').textContent = 'Kod ima 6 brojeva.'; $('code-err').classList.remove('hidden'); return; }
    $('code-err').classList.add('hidden');
    join(c);
  });
  $('kg-minus').addEventListener('click', function () { setKg((S.kg || 100) - 0.5); });
  $('kg-plus').addEventListener('click', function () { setKg((S.kg || 100) + 0.5); });
  $('kg-input').addEventListener('input', function () {
    var v = parseKg(this.value);
    S.kgTouched = true;
    if (v && v >= 30 && v <= 300) { S.kg = v; renderDelta(); renderHome(); }
  });
  $('kg-input').addEventListener('blur', function () { if (S.kg) this.value = fmtKg(S.kg); });

  $('btn-go').addEventListener('click', function () {
    var btn = this;
    var needSave = S.kgTouched || !(S.summary && S.summary.weight.today);
    btn.disabled = true;
    if (needSave && S.kg && net) { net.send({ t: 'weight', kg: S.kg }); S.kgTouched = false; }
    cmd('start').then(function () { setTimeout(function () { btn.disabled = !S.tvOnline; }, 800); });
  });
  $('btn-noweigh').addEventListener('click', function () { cmd('start', this); });
  $('btn-pp').addEventListener('click', function () { cmd(S.tv && S.tv.paused ? 'resume' : 'pause'); });
  $('btn-prev').addEventListener('click', function () { cmd('prev', this); });
  $('btn-next').addEventListener('click', function () { cmd('next', this); });
  $('btn-add').addEventListener('click', function () { cmd('addRest', this); });
  $('btn-skip').addEventListener('click', function () { cmd('skipRest', this); });
  $('btn-end').addEventListener('click', function () { $('sheet').classList.remove('hidden'); $('sheet-no').focus(); });
  $('sheet-no').addEventListener('click', function () { $('sheet').classList.add('hidden'); });
  $('sheet-yes').addEventListener('click', function () { $('sheet').classList.add('hidden'); cmd('end'); });
  $('btn-home').addEventListener('click', function () { cmd('home'); loadSummary(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { loadSummary(); if (S.tv && (S.tv.screen === 'ex' || S.tv.screen === 'rest')) keepAwake(); } });

  // ---------- start ----------
  lik = new window.LikPlayer($('lik-thumb'), { ex: 'ruke', kg: 100, showCue: false, ghost: false });
  var code = codeFromUrl() || window.Net.lsGet('tata-room');
  if (code && /^\d{6}$/.test(code)) join(code); else { setConn(); view('code'); }
  window.addEventListener('hashchange', function () { var c = codeFromUrl(); if (c && c !== S.room) location.reload(); });
})();

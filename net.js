/* Veza TV ↔ telefon bez servera: WebRTC preko PeerJS (javni PeerJS server samo upoznaje uređaje,
   podaci idu direktno između TV-a i telefona). Plus čuvanje podataka u browseru (localStorage). */
(function () {
  'use strict';
  var PREFIX = 'trening-za-tatu-v1-';
  var CDNS = ['https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js', 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'];

  var loading = null;
  function loadPeer() {
    if (window.Peer) return Promise.resolve(window.Peer);
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var i = 0;
      (function next() {
        if (i >= CDNS.length) { loading = null; reject(new Error('Ne mogu učitati PeerJS')); return; }
        var s = document.createElement('script');
        s.src = CDNS[i++];
        s.onload = function () { window.Peer ? resolve(window.Peer) : next(); };
        s.onerror = next;
        document.head.appendChild(s);
      })();
    });
    return loading;
  }

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

  /* ---------- TV: domaćin ---------- */
  function host(code, h) {
    var api = { conns: [], peer: null, code: code, destroyed: false };
    var tries = 0;
    function count() { return api.conns.filter(function (c) { return c.open; }).length; }
    function start() {
      if (api.destroyed) return;
      loadPeer().then(function (Peer) {
        var peer = api.peer = new Peer(PREFIX + api.code, { debug: 0 });
        peer.on('open', function () { tries = 0; h.onStatus && h.onStatus('online'); });
        peer.on('connection', function (conn) {
          conn.on('open', function () {
            api.conns.push(conn);
            h.onConn && h.onConn(count());
          });
          conn.on('data', function (msg) { if (msg && typeof msg === 'object') h.onMsg && h.onMsg(msg, conn); });
          var gone = function () {
            api.conns = api.conns.filter(function (c) { return c !== conn; });
            h.onConn && h.onConn(count());
          };
          conn.on('close', gone);
          conn.on('error', gone);
        });
        peer.on('disconnected', function () {
          h.onStatus && h.onStatus('reconnecting');
          setTimeout(function () { if (!peer.destroyed) { try { peer.reconnect(); } catch (e) { /* ignore */ } } }, 2000);
        });
        peer.on('error', function (err) {
          var type = err && err.type;
          if (type === 'unavailable-id') {
            // isti kod je još zauzet (npr. stari tab). Pokušaj ponovo, a nakon ~30 s uzmi novi kod.
            tries++;
            try { peer.destroy(); } catch (e) { /* ignore */ }
            if (tries > 6) { api.code = newCode(); h.onNewCode && h.onNewCode(api.code); tries = 0; }
            setTimeout(start, 5000);
          } else if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed') {
            h.onStatus && h.onStatus('reconnecting');
            try { peer.destroy(); } catch (e) { /* ignore */ }
            setTimeout(start, 4000);
          }
        });
      }).catch(function () {
        h.onStatus && h.onStatus('nocdn');
        setTimeout(start, 5000);
      });
    }
    api.broadcast = function (msg) {
      api.conns.forEach(function (c) { if (c.open) { try { c.send(msg); } catch (e) { /* ignore */ } } });
    };
    api.send = function (conn, msg) { if (conn && conn.open) { try { conn.send(msg); } catch (e) { /* ignore */ } } };
    api.count = count;
    window.addEventListener('pagehide', function () { api.destroyed = true; try { api.peer && api.peer.destroy(); } catch (e) { /* ignore */ } });
    setInterval(function () { api.broadcast({ t: 'ping' }); }, 10000);
    start();
    return api;
  }

  /* ---------- telefon: klijent ---------- */
  function client(code, h) {
    var api = { open: false, conn: null, peer: null };
    var retry = null;
    function schedule(ms) { clearTimeout(retry); retry = setTimeout(connect, ms); }
    function setOpen(v) { if (api.open !== v) { api.open = v; h.onOpenChange && h.onOpenChange(v); } }
    function connect() {
      loadPeer().then(function (Peer) {
        if (!api.peer || api.peer.destroyed) {
          api.peer = new Peer({ debug: 0 });
          api.peer.on('open', function () { dial(); });
          api.peer.on('disconnected', function () { setTimeout(function () { try { api.peer.reconnect(); } catch (e) { /* ignore */ } }, 2000); });
          api.peer.on('error', function (err) {
            var type = err && err.type;
            if (type === 'peer-unavailable') { setOpen(false); h.onTvMissing && h.onTvMissing(); schedule(4000); }
            else if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed') {
              setOpen(false);
              try { api.peer.destroy(); } catch (e) { /* ignore */ }
              schedule(4000);
            }
          });
        } else if (api.peer.open) dial();
      }).catch(function () { h.onNoCdn && h.onNoCdn(); schedule(5000); });
    }
    function dial() {
      if (api.conn) { try { api.conn.close(); } catch (e) { /* ignore */ } }
      var conn = api.conn = api.peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
      conn.on('open', function () { setOpen(true); h.onOpen && h.onOpen(); });
      conn.on('data', function (msg) { if (msg && typeof msg === 'object') h.onMsg && h.onMsg(msg); });
      var gone = function () { if (api.conn === conn) { setOpen(false); schedule(3000); } };
      conn.on('close', gone);
      conn.on('error', gone);
    }
    api.send = function (msg) {
      if (api.conn && api.conn.open) { try { api.conn.send(msg); return true; } catch (e) { return false; } }
      return false;
    };
    api.reconnectNow = function () { if (!api.open) schedule(0); };
    document.addEventListener('visibilitychange', function () { if (!document.hidden) api.reconnectNow(); });
    connect();
    return api;
  }

  function newCode() {
    var c = String(100000 + Math.floor(Math.random() * 900000));
    lsSet('tata-tv-code', c);
    return c;
  }
  function tvCode() {
    var c = lsGet('tata-tv-code');
    return /^\d{6}$/.test(c || '') ? c : newCode();
  }

  /* ---------- podaci (čuva TV) ---------- */
  function fresh() {
    return { version: 1, weights: {}, sessions: [], record: 0, updated: 0,
      prog: { day: 1, ease: 0, lastAdvance: null, abortStreak: 0, restBonus: 0, skipBlock: {}, sessionsCount: 0 } };
  }
  function normalize(raw) {
    var base = fresh();
    if (!raw || typeof raw !== 'object') return base;
    var out = Object.assign(base, raw);
    out.prog = Object.assign(fresh().prog, raw.prog || {});
    out.weights = raw.weights && typeof raw.weights === 'object' ? raw.weights : {};
    out.sessions = Array.isArray(raw.sessions) ? raw.sessions : [];
    return out;
  }
  function loadData(key) {
    try { return normalize(JSON.parse(lsGet(key || 'tata-data') || 'null')); } catch (e) { return fresh(); }
  }
  function saveData(data, key) { data.updated = Date.now(); return lsSet(key || 'tata-data', JSON.stringify(data)); }
  function richness(d) { return (d.sessions ? d.sessions.length : 0) * 1000 + Object.keys(d.weights || {}).length; }

  window.Net = { host: host, client: client, tvCode: tvCode, newCode: newCode, loadData: loadData, saveData: saveData, normalize: normalize, richness: richness, fresh: fresh, lsGet: lsGet, lsSet: lsSet };
})();

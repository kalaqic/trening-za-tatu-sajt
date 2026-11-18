/* Lik: animirana figura na stolici.
   Debljina: f = (kg − 80) / 20, ograničeno na [−0,5 ; 1,5]  → 80 kg normalan, 100 kg debeo.
   Bočni pogled (lik gleda udesno) za noge/naginjanje, prednji za ruke/istezanje.
   Ruke i noge se crtaju dvozglobnom inverznom kinematikom (lakat, koljeno). */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  var SIDE = { tilt: 0, hip: [0, 0], sh: [0, 0], hN: [45, 72], hF: [41, 74], aN: [0, 0], aF: [-10, 0], tN: [0, 0], tF: [0, 0] };
  var FRONT = { tilt: 0, shift: [0, 0], twist: 0, cross: 0, toHead: 0, hL: [10, 80], hR: [10, 80], kL: 0, kR: 0, oL: 0, oR: 0 };
  var guard = { hN: [26, -14], hF: [24, -12] };
  function standUp(extra) { return Object.assign({ tilt: 4, hip: [52, -72] }, extra || {}); }

  var EX = {
    ramena: { view: 'side', dur: 3, base: { hN: [2, 104], hF: [0, 104] },
      keys: [[0, {}], [0.25, { sh: [2, -13] }], [0.5, { sh: [-9, -6] }], [0.75, { sh: [0, 4] }], [1, {}]],
      ghost: 0.25, split: 0.5, a: 'Ramena gore…', b: '…nazad i dolje' },
    ruke: { view: 'front', dur: 4,
      keys: [[0, {}], [0.1, {}], [0.45, { hL: [22, -108], hR: [22, -108] }], [0.6, { hL: [22, -108], hR: [22, -108] }], [0.95, {}], [1, {}]],
      ghost: 0.5, split: 0.55, a: 'Ruke gore… udahni', b: 'I polako dolje… izdahni' },
    marsiranje: { view: 'side', dur: 1.6,
      keys: [[0, {}], [0.25, { aN: [6, -54], hF: [62, 52], hN: [30, 80] }], [0.5, {}], [0.75, { aF: [-4, -54], hN: [62, 52], hF: [30, 80] }], [1, {}]],
      ghost: 0.25, split: 0.5, a: 'Jedno koljeno gore', b: 'Pa drugo koljeno' },
    prsti: { view: 'side', dur: 2.4,
      keys: [[0, {}], [0.3, { aN: [0, -16], tN: [0, 16], aF: [-10, -16], tF: [0, 16] }], [0.55, { aN: [0, -16], tN: [0, 16], aF: [-10, -16], tF: [0, 16] }], [0.85, {}], [1, {}]],
      ghost: 0.4, split: 0.55, a: 'Pete gore, prsti ostaju', b: 'Polako dolje' },
    koljeno: { view: 'side', dur: 5,
      keys: [[0, {}], [0.15, { aN: [107, -88], tN: [-26, -36] }], [0.35, { aN: [107, -88], tN: [-26, -36] }], [0.5, {}], [0.65, { aF: [97, -88], tF: [-26, -36] }], [0.85, { aF: [97, -88], tF: [-26, -36] }], [1, {}]],
      ghost: 0.25, split: 0.5, a: 'Ispruži nogu… zadrži', b: 'Sad druga noga' },
    boks: { view: 'side', dur: 1.4, base: guard,
      keys: [[0, {}], [0.2, { hN: [108, -12] }], [0.45, {}], [0.7, { hF: [106, -10] }], [0.95, {}], [1, {}]],
      ghost: 0.2, split: 0.45, a: 'Udarac!', b: 'Druga ruka!' },
    okret: { view: 'front', dur: 4, base: { cross: 1 },
      keys: [[0, {}], [0.25, { twist: -1, shift: [-4, 0] }], [0.5, {}], [0.75, { twist: 1, shift: [4, 0] }], [1, {}]],
      ghost: 0.25, split: 0.5, a: 'Okreni se lijevo', b: 'Okreni se desno' },
    bocno: { view: 'front', dur: 5,
      keys: [[0, {}], [0.25, { tilt: 16, hL: [-40, -100], hR: [6, 92] }], [0.5, {}], [0.75, { tilt: -16, hR: [-40, -100], hL: [6, 92] }], [1, {}]],
      ghost: 0.25, split: 0.5, a: 'Ruka gore, nagni se', b: 'Druga strana' },
    ustranu: { view: 'front', dur: 5,
      keys: [[0, {}], [0.3, { hL: [110, 2], hR: [110, 2] }], [0.7, { hL: [110, 2], hR: [110, 2] }], [1, {}]],
      ghost: 0.5, split: 0.7, a: 'Ruke u stranu… zadrži', b: 'Polako dolje' },
    unakrsno: { view: 'front', dur: 2.6, base: { toHead: 1 },
      keys: [[0, {}], [0.25, { kL: 56, tilt: -14, shift: [0, 10] }], [0.5, {}], [0.75, { kR: 56, tilt: 14, shift: [0, 10] }], [1, {}]],
      ghost: 0.25, split: 0.5, a: 'Lakat prema koljenu', b: 'Druga strana' },
    brzo: { view: 'side', dur: 0.9,
      keys: [[0, {}], [0.25, { aN: [8, -62], hF: [72, 36], hN: [26, 84] }], [0.5, {}], [0.75, { aF: [-2, -62], hN: [72, 36], hF: [26, 84] }], [1, {}]],
      ghost: 0.25, split: 2, a: 'Brže, brže!', b: '' },
    jacks: { view: 'front', dur: 1.4,
      keys: [[0, {}], [0.5, { hL: [40, -104], hR: [40, -104], oL: 34, oR: 34 }], [1, {}]],
      ghost: 0.5, split: 0.5, a: 'Ruke gore, noge van', b: 'I nazad' },
    nazad: { view: 'side', dur: 5, base: { hip: [14, 0], hN: [28, 18], hF: [26, 20] },
      keys: [[0, {}], [0.3, { tilt: -18 }], [0.7, { tilt: -18 }], [1, {}]],
      ghost: 0.5, split: 0.7, a: 'Nagni se nazad… zadrži', b: 'Polako naprijed' },
    obje: { view: 'side', dur: 4, base: { hN: [2, 100], hF: [0, 100] },
      keys: [[0, {}], [0.3, { aN: [40, -46], aF: [30, -46], tilt: -6 }], [0.7, { aN: [40, -46], aF: [30, -46], tilt: -6 }], [1, {}]],
      ghost: 0.5, split: 0.7, a: 'Obje noge gore… zadrži', b: 'Polako dolje' },
    ustajanjeRuke: { view: 'side', dur: 5, base: { aN: [-14, 0], aF: [-24, 0], hN: [40, 76], hF: [36, 78] },
      keys: [[0, {}], [0.2, { tilt: 36, hN: [30, 96], hF: [26, 98] }], [0.45, standUp({ hN: [4, 104], hF: [2, 104] })], [0.6, standUp({ hN: [4, 104], hF: [2, 104] })], [0.8, { tilt: 36, hip: [16, -16], hN: [30, 96], hF: [26, 98] }], [1, {}]],
      ghost: 0.5, split: 0.6, a: 'Odgurni se rukama i ustani', b: 'Polako sjedni' },
    ustajanje: { view: 'side', dur: 5, base: { aN: [-14, 0], aF: [-24, 0], hN: [28, 18], hF: [26, 20] },
      keys: [[0, {}], [0.2, { tilt: 36 }], [0.45, standUp()], [0.6, standUp()], [0.8, { tilt: 36, hip: [16, -16] }], [1, {}]],
      ghost: 0.5, split: 0.6, a: 'Nagni se naprijed i ustani', b: 'Polako sjedni' }
  };

  function lerpV(a, b, e) {
    if (Array.isArray(a)) return a.map(function (v, i) { return v + (b[i] - v) * e; });
    return a + (b - a) * e;
  }
  function sample(ex, ph) {
    var def = Object.assign({}, ex.view === 'side' ? SIDE : FRONT, ex.base || {});
    var ks = ex.keys.map(function (k) { return [k[0], Object.assign({}, def, k[1])]; });
    for (var i = 0; i < ks.length - 1; i++) {
      if (ph <= ks[i + 1][0]) {
        var span = ks[i + 1][0] - ks[i][0] || 1;
        var l = Math.max(0, Math.min(1, (ph - ks[i][0]) / span));
        var e = l * l * (3 - 2 * l);
        var out = {};
        Object.keys(def).forEach(function (key) { out[key] = lerpV(ks[i][1][key], ks[i + 1][1][key], e); });
        return out;
      }
    }
    return ks[ks.length - 1][1];
  }

  function n(v) { return Math.round(v * 10) / 10; }
  function pt(p) { return n(p[0]) + ' ' + n(p[1]); }
  function line() { return 'M ' + Array.prototype.map.call(arguments, pt).join(' L '); }
  function dot(p) { return 'M ' + pt(p) + ' l 0.01 0'; }
  function ell(cx, cy, rx, ry) {
    return 'M ' + n(cx - rx) + ' ' + n(cy) + ' a ' + n(rx) + ' ' + n(ry) + ' 0 1 0 ' + n(2 * rx) + ' 0 a ' + n(rx) + ' ' + n(ry) + ' 0 1 0 ' + n(-2 * rx) + ' 0';
  }
  function rr(x, y, w, h, r) {
    return 'M ' + (x + r) + ' ' + y + ' H ' + (x + w - r) + ' Q ' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) +
      ' V ' + (y + h - r) + ' Q ' + (x + w) + ' ' + (y + h) + ' ' + (x + w - r) + ' ' + (y + h) + ' H ' + (x + r) +
      ' Q ' + x + ' ' + (y + h) + ' ' + x + ' ' + (y + h - r) + ' V ' + (y + r) + ' Q ' + x + ' ' + y + ' ' + (x + r) + ' ' + y + ' Z';
  }
  function lerpP(a, b, e) { return [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e]; }
  function ik(A, T, l1, l2, pick) {
    var dx = T[0] - A[0], dy = T[1] - A[1];
    var d = Math.hypot(dx, dy);
    var dd = Math.max(Math.abs(l1 - l2) + 0.5, Math.min(l1 + l2 - 0.5, d));
    var phi = Math.atan2(dy, dx);
    var a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd))));
    var e1 = [A[0] + l1 * Math.cos(phi + a), A[1] + l1 * Math.sin(phi + a)];
    var e2 = [A[0] + l1 * Math.cos(phi - a), A[1] + l1 * Math.sin(phi - a)];
    var E = pick(e1, e2);
    var vx = T[0] - E[0], vy = T[1] - E[1];
    var vl = Math.hypot(vx, vy) || 1;
    return [E, [E[0] + vx / vl * l2, E[1] + vy / vl * l2]];
  }

  function widths(f) {
    return { tw: 56 + 24 * f, legW: 28 + 12 * f, thighW: 36 + 16 * f, armW: 20 + 6 * f, foreW: 16 + 4 * f, handW: 20 + 3 * f, neckW: 20 + 5 * f, shoeW: 16, headR: 25 + 2 * f };
  }

  function buildSide(P, f, W) {
    var r = W.headR, HX = 165, HY = 238;
    var hip = [HX + P.hip[0], HY + P.hip[1]];
    var U = 'translate(' + n(P.hip[0]) + ' ' + n(P.hip[1]) + ') rotate(' + n(P.tilt) + ' ' + HX + ' ' + HY + ')';
    function leg(aOff, tOff, dx) {
      var H = [hip[0] + dx, hip[1]];
      var A = [238 + aOff[0], 350 + aOff[1]];
      var res = ik(H, A, 80, 112, function (e1, e2) { return e2; });
      var K = res[0], A2 = res[1];
      var T = [A2[0] + 30 + tOff[0], A2[1] + 6 + tOff[1]];
      return { thigh: line(H, K), shin: line(K, A2), shoe: line([A2[0] - 6, A2[1] + 3], T) };
    }
    var S = [HX + 4 + P.sh[0], HY - 90 + P.sh[1]];
    function arm(S0, h) {
      var res = ik(S0, [S0[0] + h[0], S0[1] + h[1]], 58, 54, function (e1) { return e1; });
      return { sleeve: line(S0, res[0]) + ' ' + dot(S0), fore: line(res[0], res[1]), hand: dot(res[1]) };
    }
    var near = leg(P.aN, P.tN, 0), far = leg(P.aF, P.tF, -8);
    var aN = arm(S, P.hN), aF = arm([S[0] - 6, S[1] - 2], P.hF);
    var hc = [HX + 9, HY - 102 - r];
    return {
      U: U,
      backThigh: far.thigh, backShin: far.shin, backShoe: far.shoe,
      frontThigh: near.thigh, frontShin: near.shin, frontShoe: near.shoe,
      backSleeve: aF.sleeve, backFore: aF.fore, backHand: aF.hand,
      frontSleeve: aN.sleeve, frontFore: aN.fore, frontHand: aN.hand,
      torsoStroke: line([HX - 2, 248 - W.tw / 2], [HX + 2, 150 + W.tw / 4]),
      torsoFill: '',
      belly: ell(HX - 2 + W.tw / 2 - 12 + 6 * f, 205, Math.max(8, 16 + 20 * f), 30 + 8 * f),
      collar: 'M ' + n(HX - 4) + ' 138 Q ' + n(HX + 8) + ' 146 ' + n(HX + 16) + ' 136',
      neck: line([HX + 4, 140], [HX + 7, 122]),
      ears: '',
      hairBack: ell(hc[0] - 4, hc[1] - 3, r + 1, r - 1),
      head: ell(hc[0], hc[1], r, r),
      earSide: ell(hc[0] - 3, hc[1] + 1, 5, 7),
      hairTop: '',
      eyes: ell(hc[0] + 12, hc[1] - 4, 2.6, 2.8),
      face: 'M ' + n(hc[0] + r - 3) + ' ' + n(hc[1] - 3) + ' L ' + n(hc[0] + r + 3) + ' ' + n(hc[1] + 4) + ' L ' + n(hc[0] + r - 2) + ' ' + n(hc[1] + 6) +
        ' M ' + n(hc[0] + 11) + ' ' + n(hc[1] + 12) + ' Q ' + n(hc[0] + 15) + ' ' + n(hc[1] + 15) + ' ' + n(hc[0] + 20) + ' ' + n(hc[1] + 11) +
        ' M ' + n(hc[0] + 7) + ' ' + n(hc[1] - 11) + ' L ' + n(hc[0] + 16) + ' ' + n(hc[1] - 12),
      chairBack: rr(124, 116, 16, 146, 6),
      chairSeat: rr(122, 246, 140, 16, 6),
      chairLegs: line([134, 262], [132, 360]) + ' ' + line([250, 262], [254, 360])
    };
  }

  function buildFront(P, f, W) {
    var r = W.headR, cx = 200;
    var sx = P.twist * 14;
    var sw = (40 + 14 * f) * (1 - 0.3 * Math.abs(P.twist));
    var hw = 30 + 14 * f, bw = 36 + 24 * f;
    var Ls = [cx + sx - sw, 146], Rs = [cx + sx + sw, 146];
    var U = 'translate(' + n(P.shift[0]) + ' ' + n(P.shift[1]) + ') rotate(' + n(P.tilt) + ' 200 256)';
    var hc = [cx + sx * 0.8, 100];
    var crossL = [cx + sx + sw * 0.55, 172], crossR = [cx + sx - sw * 0.55, 178];
    var headL = [hc[0] - r - 4, 104], headRt = [hc[0] + r + 4, 104];
    function target(S, h, side, crossT, headT) {
      var T = [S[0] + side * h[0], S[1] + h[1]];
      T = lerpP(T, crossT, P.cross);
      return lerpP(T, headT, P.toHead);
    }
    function arm(S, T, side) {
      var res = ik(S, T, 58, 54, function (e1, e2) { return side < 0 ? (e1[0] < e2[0] ? e1 : e2) : (e1[0] > e2[0] ? e1 : e2); });
      return { sleeve: line(S, res[0]) + ' ' + dot(S), fore: line(res[0], res[1]), hand: dot(res[1]) };
    }
    var L = arm(Ls, target(Ls, P.hL, -1, crossL, headL), -1);
    var R = arm(Rs, target(Rs, P.hR, 1, crossR, headRt), 1);
    function leg(side, k, o) {
      var hx = cx + side * hw * 0.6;
      var H = [hx, 262], K = [hx + side * 3, 272 - k], A = [hx + side * (5 + o), 350 - k * 0.85];
      return { thigh: line(H, K), shin: line(K, A), shoe: line([A[0] - 9, A[1] + 8], [A[0] + 9, A[1] + 8]) };
    }
    var lL = leg(-1, P.kL, P.oL), lR = leg(1, P.kR, P.oR);
    var eo = P.twist * 5;
    return {
      U: U,
      backThigh: '', backShin: '', backShoe: '',
      frontThigh: lL.thigh + ' ' + lR.thigh, frontShin: lL.shin + ' ' + lR.shin, frontShoe: lL.shoe + ' ' + lR.shoe,
      backSleeve: '', backFore: '', backHand: '',
      frontSleeve: L.sleeve + ' ' + R.sleeve, frontFore: L.fore + ' ' + R.fore, frontHand: L.hand + ' ' + R.hand,
      torsoStroke: '',
      torsoFill: 'M ' + pt(Ls) + ' Q ' + n(cx + sx) + ' 130 ' + pt(Rs) +
        ' Q ' + n(cx + bw + 2) + ' 168 ' + n(cx + bw) + ' 214 Q ' + n(cx + bw) + ' 252 ' + n(cx + hw) + ' 260' +
        ' L ' + n(cx - hw) + ' 260 Q ' + n(cx - bw) + ' 252 ' + n(cx - bw) + ' 214 Q ' + n(cx - bw - 2) + ' 168 ' + pt(Ls) + ' Z',
      belly: '',
      collar: 'M ' + n(cx + sx * 0.7 - 13) + ' 136 Q ' + n(cx + sx * 0.7) + ' 150 ' + n(cx + sx * 0.7 + 13) + ' 136',
      neck: line([cx + sx * 0.6, 140], [cx + sx * 0.7, 120]),
      ears: ell(hc[0] - r + 1, hc[1] + 2, 5, 7) + ' ' + ell(hc[0] + r - 1, hc[1] + 2, 5, 7),
      hairBack: '',
      head: ell(hc[0], hc[1], r, r),
      earSide: '',
      hairTop: 'M ' + n(hc[0] - r) + ' ' + n(hc[1] - 2) + ' A ' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(hc[0] + r) + ' ' + n(hc[1] - 2) +
        ' Q ' + n(hc[0]) + ' ' + n(hc[1] - r * 0.45) + ' ' + n(hc[0] - r) + ' ' + n(hc[1] - 2) + ' Z',
      eyes: ell(hc[0] - 9 + eo, hc[1] + 1, 2.6, 2.8) + ' ' + ell(hc[0] + 9 + eo, hc[1] + 1, 2.6, 2.8),
      face: 'M ' + n(hc[0] - 7 + eo) + ' ' + n(hc[1] + 12) + ' Q ' + n(hc[0] + eo) + ' ' + n(hc[1] + 17) + ' ' + n(hc[0] + 7 + eo) + ' ' + n(hc[1] + 12) +
        ' M ' + n(hc[0] + eo) + ' ' + n(hc[1] + 3) + ' L ' + n(hc[0] + eo + 1) + ' ' + n(hc[1] + 8) +
        ' M ' + n(hc[0] - 14 + eo) + ' ' + n(hc[1] - 7) + ' L ' + n(hc[0] - 5 + eo) + ' ' + n(hc[1] - 8) +
        ' M ' + n(hc[0] + 5 + eo) + ' ' + n(hc[1] - 8) + ' L ' + n(hc[0] + 14 + eo) + ' ' + n(hc[1] - 7),
      chairBack: rr(132, 92, 136, 158, 10),
      chairSeat: rr(114, 240, 172, 20, 8),
      chairLegs: line([122, 260], [118, 360]) + ' ' + line([278, 260], [282, 360])
    };
  }

  function compute(exId, kg, p) {
    var ex = EX[exId] || EX.ruke;
    var f = Math.max(-0.5, Math.min(1.5, ((Number(kg) || 100) - 80) / 20));
    var W = widths(f);
    var build = ex.view === 'side' ? buildSide : buildFront;
    var live = build(sample(ex, p), f, W);
    var gh = build(sample(ex, ex.ghost), f, W);
    return {
      live: live, W: W,
      ghost: {
        U: gh.U,
        legs: [gh.backThigh, gh.backShin, gh.frontThigh, gh.frontShin].join(' '),
        arms: [gh.backSleeve, gh.backFore, gh.frontSleeve, gh.frontFore].join(' '),
        torsoStroke: gh.torsoStroke, torsoFill: gh.torsoFill, belly: gh.belly, head: gh.head
      },
      cueA: p < ex.split,
      cue: p < ex.split ? ex.a : ex.b
    };
  }

  function mk(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }

  var LIVE_KEYS = ['chairBack', 'chairSeat', 'chairLegs', 'backThigh', 'backShin', 'backShoe', 'backSleeve', 'backFore', 'backHand',
    'torsoStroke', 'torsoFill', 'belly', 'collar', 'neck', 'ears', 'hairBack', 'head', 'earSide', 'hairTop', 'eyes', 'face',
    'frontThigh', 'frontShin', 'frontShoe', 'frontSleeve', 'frontFore', 'frontHand'];
  var WIDTH_OF = { backThigh: 'thighW', frontThigh: 'thighW', backShin: 'legW', frontShin: 'legW', backShoe: 'shoeW', frontShoe: 'shoeW',
    backSleeve: 'armW', frontSleeve: 'armW', backFore: 'foreW', frontFore: 'foreW', backHand: 'handW', frontHand: 'handW', torsoStroke: 'tw', neck: 'neckW' };

  /* Lik(container, {size, showCue, accent, cueClass}) — crta figuru; draw(exId, kg, phase 0..1) */
  function Lik(container, opts) {
    opts = opts || {};
    this.accent = opts.accent || '#4ADE80';
    this.wrap = document.createElement('div');
    this.wrap.className = 'lik';
    this.svg = mk('svg', { viewBox: '0 0 400 400', role: 'img', 'aria-label': 'Animacija vježbe' });
    this.svg.style.width = '100%';
    this.svg.style.height = 'auto';
    this.svg.style.display = 'block';
    this.wrap.appendChild(this.svg);
    var svg = this.svg, r = this.r = {};
    var SR = { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    function P(key, attrs, parent) { r[key] = mk('path', attrs, parent || svg); }
    function S(o, extra) { return Object.assign({}, o, extra); }
    mk('ellipse', { cx: 200, cy: 368, rx: 140, ry: 9, fill: '#0A0E12' }, svg);
    P('chairBack', { fill: '#3A4552' });
    P('chairSeat', { fill: '#4A5568' });
    P('chairLegs', S(SR, { stroke: '#3A4552', 'stroke-width': 9 }));
    var gh = mk('g', { opacity: opts.ghost === false ? 0 : 0.28 }, svg);
    P('hLegs', S(SR, { stroke: this.accent }), gh);
    r.hU = mk('g', {}, gh);
    P('hTorsoStroke', S(SR, { stroke: this.accent }), r.hU);
    P('hTorsoFill', { fill: this.accent }, r.hU);
    P('hBelly', { fill: this.accent }, r.hU);
    P('hHead', { fill: this.accent }, r.hU);
    P('hArms', S(SR, { stroke: this.accent }), r.hU);
    P('backThigh', S(SR, { stroke: '#737D8E' }));
    P('backShin', S(SR, { stroke: '#737D8E' }));
    P('backShoe', S(SR, { stroke: '#C5CAD3' }));
    r.U1 = mk('g', {}, svg);
    P('backSleeve', S(SR, { stroke: '#4570C8' }), r.U1);
    P('backFore', S(SR, { stroke: '#C8936B' }), r.U1);
    P('backHand', S(SR, { stroke: '#C8936B' }), r.U1);
    P('torsoStroke', S(SR, { stroke: '#5B8DEF' }), r.U1);
    P('torsoFill', { fill: '#5B8DEF' }, r.U1);
    P('belly', { fill: '#5B8DEF' }, r.U1);
    P('collar', S(SR, { stroke: '#4570C8', 'stroke-width': 4 }), r.U1);
    P('neck', S(SR, { stroke: '#E8B48C' }), r.U1);
    P('ears', { fill: '#C8936B' }, r.U1);
    P('hairBack', { fill: '#A3A3A3' }, r.U1);
    P('head', { fill: '#E8B48C' }, r.U1);
    P('earSide', { fill: '#C8936B' }, r.U1);
    P('hairTop', { fill: '#A3A3A3' }, r.U1);
    P('eyes', { fill: '#1F2937' }, r.U1);
    P('face', S(SR, { stroke: '#7A4E33', 'stroke-width': 2.5 }), r.U1);
    P('frontThigh', S(SR, { stroke: '#9AA3B2' }));
    P('frontShin', S(SR, { stroke: '#9AA3B2' }));
    P('frontShoe', S(SR, { stroke: '#F3F4F6' }));
    r.U2 = mk('g', {}, svg);
    P('frontSleeve', S(SR, { stroke: '#5B8DEF' }), r.U2);
    P('frontFore', S(SR, { stroke: '#E8B48C' }), r.U2);
    P('frontHand', S(SR, { stroke: '#E8B48C' }), r.U2);
    if (opts.showCue) {
      this.cueEl = document.createElement('div');
      this.cueEl.className = opts.cueClass || 'lik-cue';
      this.cueEl.setAttribute('aria-live', 'polite');
      this.wrap.appendChild(this.cueEl);
    }
    container.appendChild(this.wrap);
    this.cache = {};
  }
  Lik.prototype.set = function (el, attr, val) {
    var k = attr + ':' + (el.__id || (el.__id = Math.random()));
    if (this.cache[k] === val) return;
    this.cache[k] = val;
    el.setAttribute(attr, val);
  };
  Lik.prototype.draw = function (exId, kg, p) {
    var c = compute(exId, kg, p), r = this.r, self = this;
    LIVE_KEYS.forEach(function (key) { self.set(r[key], 'd', c.live[key]); });
    Object.keys(WIDTH_OF).forEach(function (key) { self.set(r[key], 'stroke-width', n(c.W[WIDTH_OF[key]])); });
    this.set(r.U1, 'transform', c.live.U);
    this.set(r.U2, 'transform', c.live.U);
    this.set(r.hU, 'transform', c.ghost.U);
    this.set(r.hLegs, 'd', c.ghost.legs);
    this.set(r.hLegs, 'stroke-width', n(c.W.legW + 4));
    this.set(r.hTorsoStroke, 'd', c.ghost.torsoStroke);
    this.set(r.hTorsoStroke, 'stroke-width', n(c.W.tw));
    this.set(r.hTorsoFill, 'd', c.ghost.torsoFill);
    this.set(r.hBelly, 'd', c.ghost.belly);
    this.set(r.hHead, 'd', c.ghost.head);
    this.set(r.hArms, 'd', c.ghost.arms);
    this.set(r.hArms, 'stroke-width', n(c.W.armW));
    if (this.cueEl) {
      if (this.cueEl.textContent !== c.cue) this.cueEl.textContent = c.cue;
      this.cueEl.classList.toggle('lik-cue-a', c.cueA);
    }
  };

  /* LikPlayer: Lik + sat koji teče samo dok je pušteno */
  function LikPlayer(container, opts) {
    opts = opts || {};
    this.lik = new Lik(container, opts);
    this.ex = opts.ex || 'ruke';
    this.kg = opts.kg || 100;
    this.clock = 0;
    this.playing = false;
    this.last = 0;
    this.lik.draw(this.ex, this.kg, 0);
    var self = this;
    this._tick = function (now) {
      if (!self.playing) { self.raf = null; return; }
      if (self.last) self.clock += Math.min(0.1, (now - self.last) / 1000);
      self.last = now;
      self.render();
      self.raf = requestAnimationFrame(self._tick);
    };
  }
  LikPlayer.prototype.render = function () {
    var ex = EX[this.ex] || EX.ruke;
    this.lik.draw(this.ex, this.kg, (this.clock % ex.dur) / ex.dur);
  };
  LikPlayer.prototype.play = function () {
    if (this.playing) return;
    this.playing = true; this.last = 0;
    this.raf = requestAnimationFrame(this._tick);
  };
  LikPlayer.prototype.pause = function () { this.playing = false; };
  LikPlayer.prototype.stop = function () { this.playing = false; this.clock = 0; this.render(); };
  LikPlayer.prototype.setExercise = function (id) { if (id !== this.ex) { this.ex = id; this.clock = 0; this.render(); } };
  LikPlayer.prototype.setWeight = function (kg) { if (kg && kg !== this.kg) { this.kg = kg; this.render(); } };

  window.Lik = Lik;
  window.LikPlayer = LikPlayer;
  window.LIK_IDS = Object.keys(EX);
})();

/* Program treninga: vježbe, nivoi, plan za danas, napredovanje i streak. */
(function () {
'use strict';
// Program treninga: vježbe, nivoi, plan za danas, napredovanje i streak.

const EXERCISES = [
  { id: 'ramena', level: 1, name: 'Kruženje ramenima', how: 'Ramena gore, nazad i dolje. Ruke opuštene.' },
  { id: 'ruke', level: 1, name: 'Podizanje ruku iznad glave', how: 'Leđa uz naslon, ruke polako gore pa dolje. Diši mirno.' },
  { id: 'marsiranje', level: 1, name: 'Marširanje sjedeći', how: 'Naizmjenično podiži koljena, kao da hodaš.' },
  { id: 'prsti', level: 1, name: 'Podizanje na prste', how: 'Pete gore, prsti ostaju na podu, pa polako dolje.' },
  { id: 'koljeno', level: 2, name: 'Ispružanje koljena', how: 'Ispruži jednu nogu naprijed, zadrži, spusti. Pa druga.' },
  { id: 'boks', level: 2, name: 'Boks sjedeći', how: 'Naizmjenično udaraj rukama naprijed. Leđa uspravna.' },
  { id: 'okret', level: 2, name: 'Okretanje trupa', how: 'Ruke prekrštene na grudima, okreći se lijevo-desno.' },
  { id: 'bocno', level: 2, name: 'Bočno istezanje', how: 'Jedna ruka gore, nagni se na suprotnu stranu.' },
  { id: 'ustranu', level: 3, name: 'Ruke u stranu sa zadržavanjem', how: 'Ruke do visine ramena, zadrži 2 sekunde, spusti.' },
  { id: 'unakrsno', level: 3, name: 'Koljeno do suprotnog lakta', how: 'Ruke uz glavu, lakat prema suprotnom koljenu.' },
  { id: 'brzo', level: 3, name: 'Brzo marširanje', how: 'Marširanje u bržem tempu, ruke mašu.' },
  { id: 'jacks', level: 4, name: 'Sjedeći skokovi', how: 'Ruke gore i noge u stranu u isto vrijeme, pa nazad.' },
  { id: 'nazad', level: 4, name: 'Naginjanje unazad', how: 'Sjedni na prednji dio stolice, ruke prekrštene, nagni se malo nazad i zadrži.' },
  { id: 'obje', level: 4, name: 'Podizanje obje noge', how: 'Drži se za stolicu, podigni obje noge malo od poda.' },
  { id: 'ustajanjeRuke', level: 5, name: 'Ustajanje uz pomoć ruku', how: 'Odgurni se rukama od stolice, ustani, polako sjedni.' },
  { id: 'ustajanje', level: 5, name: 'Ustajanje bez ruku', how: 'Ruke prekrštene, ustani i polako sjedni.' }
];

const LEVELS = [
  { n: 1, name: 'Početak', desc: 'Mali pokreti, bez napora.' },
  { n: 2, name: 'Pokretanje tijela', desc: 'Veći pokreti, trup i noge.' },
  { n: 3, name: 'Izdržljivost', desc: 'Duže zadržavanje i brži tempo.' },
  { n: 4, name: 'Snaga', desc: 'Radi cijelo tijelo, srce se ubrzava.' },
  { n: 5, name: 'Ustajanje', desc: 'Prve vježbe na nogama, uz stolicu.' }
];

// Pravila napretka (lako se mijenjaju ovdje)
const RULES = {
  cleanToLevelUp: 5,        // čistih treninga na nivou za prelazak dalje
  abortsToLevelDown: 2,     // prekinutih treninga zaredom za povratak nivo nazad
  skipBlockSessions: 3,     // preskočena vježba se ne pojavljuje ovoliko treninga
  countsAsDone: 0.75,       // ako uradi bar 75% vježbi, dan se računa za streak
  graceDaysPerWeek: 1,      // slobodan dan sedmično koji ne prekida streak
  mainDur: [30, 35, 40, 45],// trajanje glavnih vježbi kako napreduje unutar nivoa
  rest: { 1: 30, 2: 25, 3: 20, 4: 20, 5: 25 }
};

const TZ = 'Europe/Sarajevo';

function dayKey(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
function weekdayMon0(key) {
  const [y, m, d] = key.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}
function weekStart(key) { return addDays(key, -weekdayMon0(key)); }

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, r) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const byId = (id) => EXERCISES.find((e) => e.id === id);

function makePlan(data, today) {
  const prog = data.prog;
  const L = prog.level;
  const r = rng(hashStr(today + ':' + L + ':' + prog.sessionsCount));
  const blocked = (id) => (prog.skipBlock[id] || 0) > prog.sessionsCount;
  const reserved = new Set(['ramena', 'ruke']);
  const usable = (e) => !blocked(e.id) && !reserved.has(e.id);
  const mainDur = L >= 5 ? 30 : RULES.mainDur[Math.min(RULES.mainDur.length - 1, prog.cleanAtLevel)];

  let trial = null;
  if (L < 5) trial = shuffle(EXERCISES.filter((e) => e.level === L + 1 && !blocked(e.id)), r)[0] || null;
  const mainCount = trial ? 5 : 6;

  const cur = shuffle(EXERCISES.filter((e) => e.level === L && usable(e)), r);
  const lower = shuffle(EXERCISES.filter((e) => e.level < L && usable(e)), r).sort((a, b) => b.level - a.level);
  const main = [];
  for (const e of cur) if (main.length < mainCount) main.push(e);
  for (const e of lower) if (main.length < mainCount) main.push(e);
  const fill = cur.length ? cur : (lower.length ? lower : [byId('marsiranje'), byId('prsti')]);
  for (let k = 0; main.length < mainCount; k++) main.push(fill[k % fill.length]);

  const items = [];
  const push = (e, dur, tag) => items.push({ id: e.id, name: e.name, how: e.how, level: e.level, dur, tag });
  push(byId('ramena'), 30, 'zagrijavanje');
  main.slice(0, 3).forEach((e) => push(e, mainDur, 'glavna'));
  if (trial) push(trial, 20, 'proba');
  main.slice(3).forEach((e) => push(e, mainDur, 'glavna'));
  push(byId('ruke'), 30, 'smirivanje');

  for (let i = 1; i < items.length - 1; i++) {
    if (items[i].id === items[i - 1].id) { const tmp = items[i]; items[i] = items[i + 1]; items[i + 1] = tmp; }
  }

  const rest = RULES.rest[L] + (prog.restBonus || 0);
  const totalSec = items.reduce((s, it) => s + it.dur, 0) + rest * (items.length - 1) + 5;
  return {
    date: today, level: L, levelName: LEVELS[L - 1].name, rest, items,
    minutes: Math.max(1, Math.round(totalSec / 60)),
    trialName: trial ? trial.name : null
  };
}

function countedDays(data) {
  return new Set(data.sessions.filter((s) => s.counts).map((s) => s.date));
}

function streakInfo(data, today) {
  const days = countedDays(data);
  const sorted = [...days].sort();
  let streak = 0;
  if (sorted.length) {
    const first = sorted[0];
    let d = days.has(today) ? today : addDays(today, -1);
    const misses = {};
    for (let i = 0; i < 4000 && d >= first; i++) {
      if (days.has(d)) streak++;
      else {
        const w = weekStart(d);
        misses[w] = (misses[w] || 0) + 1;
        if (misses[w] > RULES.graceDaysPerWeek) break;
      }
      d = addDays(d, -1);
    }
  }
  const labels = ['P', 'U', 'S', 'Č', 'P', 'S', 'N'];
  const ws = weekStart(today);
  const week = labels.map((label, i) => {
    const key = addDays(ws, i);
    return { label, key, done: days.has(key), today: key === today, future: key > today };
  });
  return { streak, record: Math.max(data.record || 0, streak), week, todayDone: days.has(today) };
}

function weightInfo(data, today) {
  const keys = Object.keys(data.weights).sort();
  const lastKey = keys[keys.length - 1];
  const prevKey = keys.filter((k) => k < today).pop();
  return {
    today: data.weights[today] ?? null,
    last: lastKey ? { date: lastKey, kg: data.weights[lastKey] } : null,
    prev: prevKey ? { date: prevKey, kg: data.weights[prevKey] } : null
  };
}

function summary(data, today = dayKey()) {
  const plan = makePlan(data, today);
  return {
    today,
    weight: weightInfo(data, today),
    ...streakInfo(data, today),
    level: data.prog.level,
    levelName: LEVELS[data.prog.level - 1].name,
    progress: { clean: data.prog.cleanAtLevel, needed: RULES.cleanToLevelUp },
    plan: { count: plan.items.length, minutes: plan.minutes, trialName: plan.trialName, rest: plan.rest }
  };
}

function finishSession(data, p, today = dayKey()) {
  const prog = data.prog;
  const total = Math.max(1, Number(p.total) || 1);
  const done = Math.max(0, Math.min(total, Number(p.done) || 0));
  const skipped = Array.isArray(p.skipped) ? p.skipped.filter((id) => byId(id)) : [];
  const extraRest = Math.max(0, Number(p.extraRest) || 0);
  const reachedEnd = !!p.reachedEnd;
  const counts = done / total >= RULES.countsAsDone;
  const before = streakInfo(data, today);
  const prevRecord = Math.max(data.record || 0, before.streak);

  data.sessions.push({
    date: today, at: new Date().toISOString(), level: prog.level, reachedEnd, counts,
    skipped, extraRest, done, total, seconds: Math.round(Number(p.seconds) || 0)
  });
  prog.sessionsCount++;
  skipped.forEach((id) => { prog.skipBlock[id] = prog.sessionsCount + RULES.skipBlockSessions; });

  let levelChange = 0;
  if (counts) {
    prog.abortStreak = 0;
    if (reachedEnd && skipped.length === 0 && extraRest === 0) {
      prog.cleanAtLevel++;
      if (prog.cleanAtLevel >= RULES.cleanToLevelUp && prog.level < 5) { prog.level++; prog.cleanAtLevel = 0; levelChange = 1; }
    }
  } else {
    prog.abortStreak++;
    if (prog.abortStreak >= RULES.abortsToLevelDown && prog.level > 1) { prog.level--; prog.cleanAtLevel = 0; prog.abortStreak = 0; levelChange = -1; }
  }
  prog.restBonus = extraRest >= 2 ? 5 : 0;

  const after = streakInfo(data, today);
  data.record = Math.max(prevRecord, after.streak);
  return {
    counts, done, total, seconds: Math.round(Number(p.seconds) || 0),
    streak: after.streak, record: data.record,
    newRecord: counts && after.streak > prevRecord && after.streak > 1,
    levelChange, level: prog.level, levelName: LEVELS[prog.level - 1].name,
    week: after.week
  };
}

window.Program = { EXERCISES, LEVELS, RULES, dayKey, addDays, makePlan, summary, finishSession, streakInfo };
})();

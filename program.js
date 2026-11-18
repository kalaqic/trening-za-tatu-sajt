/* Program treninga za mršavljenje: 30 sjedećih vježbi, plan od 28 dana (4 sedmice) koji se
   nastavlja i poslije, automatsko prilagođavanje i streak.
   Osnova: ACSM (postepeno do 150+, a za mršavljenje 200–300 min sedmično umjerene aktivnosti + snaga),
   WHO 2020 („svaki pokret se računa”, snaga 2+ dana sedmično), NHS sjedeće vježbe, „talk test” za intenzitet. */
(function () {
  'use strict';

  // kind: mobilnost | kardio | snaga | istezanje · level: 1 (najlakše) – 5 (najteže)
  const EXERCISES = [
    { id: 'ramena', level: 1, kind: 'mobilnost', name: 'Kruženje ramenima', how: 'Ramena gore, nazad i dolje. Ruke opuštene.' },
    { id: 'ruke', level: 1, kind: 'mobilnost', name: 'Podizanje ruku iznad glave', how: 'Leđa uz naslon, ruke polako gore pa dolje. Diši mirno.' },
    { id: 'marsiranje', level: 1, kind: 'kardio', name: 'Marširanje sjedeći', how: 'Naizmjenično podiži koljena, kao da hodaš.' },
    { id: 'prsti', level: 1, kind: 'snaga', name: 'Podizanje na prste', how: 'Pete gore, prsti ostaju na podu, pa polako dolje.' },
    { id: 'biceps', level: 1, kind: 'snaga', name: 'Savijanje ruku', how: 'Laktovi uz tijelo, savij ruke prema ramenima. Može i sa flašom vode u ruci.' },
    { id: 'koljenaVan', level: 1, kind: 'snaga', name: 'Koljena van i unutra', how: 'Stopala na podu, raširi koljena pa ih vrati zajedno.' },
    { id: 'stretchNoge', level: 1, kind: 'istezanje', name: 'Istezanje zadnje strane noge', how: 'Ispruži nogu, peta na pod, nagni se blago naprijed i zadrži.' },
    { id: 'disanje', level: 1, kind: 'istezanje', name: 'Duboko disanje', how: 'Polako udahni dok ruke idu gore, izdahni dok idu dolje.' },
    { id: 'koljeno', level: 2, kind: 'snaga', name: 'Ispružanje koljena', how: 'Ispruži jednu nogu naprijed, zadrži, spusti. Pa druga.' },
    { id: 'boks', level: 2, kind: 'kardio', name: 'Boks sjedeći', how: 'Naizmjenično udaraj rukama naprijed. Leđa uspravna.' },
    { id: 'okret', level: 2, kind: 'mobilnost', name: 'Okretanje trupa', how: 'Ruke prekrštene na grudima, okreći se lijevo-desno. Kukovi miruju.' },
    { id: 'bocno', level: 2, kind: 'istezanje', name: 'Bočno istezanje', how: 'Jedna ruka gore, nagni se na suprotnu stranu.' },
    { id: 'potisak', level: 2, kind: 'snaga', name: 'Potisak iznad glave', how: 'Šake kod ramena, gurni ruke gore pa polako nazad.' },
    { id: 'kruzenjeRuku', level: 2, kind: 'kardio', name: 'Kruženje rukama', how: 'Ruke u stranu u visini ramena, pravi male krugove.' },
    { id: 'veslanje', level: 2, kind: 'snaga', name: 'Veslanje sjedeći', how: 'Ruke naprijed, pa povuci laktove nazad kao da veslaš.' },
    { id: 'noguUStranu', level: 2, kind: 'kardio', name: 'Noga u stranu', how: 'Naizmjenično ispruži stopalo u stranu i vrati ga.' },
    { id: 'ustranu', level: 3, kind: 'snaga', name: 'Ruke u stranu sa zadržavanjem', how: 'Ruke do visine ramena, zadrži 2 sekunde, spusti.' },
    { id: 'unakrsno', level: 3, kind: 'kardio', name: 'Koljeno do suprotnog lakta', how: 'Ruke uz glavu, lakat prema suprotnom koljenu.' },
    { id: 'brzo', level: 3, kind: 'kardio', name: 'Brzo marširanje', how: 'Marširanje u bržem tempu, ruke mašu.' },
    { id: 'brzeNoge', level: 3, kind: 'kardio', name: 'Brza stopala', how: 'Mali brzi koraci u mjestu, ruke rade uz tijelo.' },
    { id: 'koljenoGrudi', level: 3, kind: 'snaga', name: 'Koljeno prema grudima', how: 'Drži se za stolicu, privuci jedno koljeno gore, pa drugo.' },
    { id: 'drvosjeca', level: 3, kind: 'kardio', name: 'Drvosječa', how: 'Spojene ruke od gore desno ukoso dolje lijevo, pa nazad.' },
    { id: 'udarciNogom', level: 3, kind: 'kardio', name: 'Udarci nogom naprijed', how: 'Ruke u gardu, naizmjenično ispruži nogu naprijed.' },
    { id: 'boksGore', level: 3, kind: 'kardio', name: 'Udarci prema gore', how: 'Šake kod brade, naizmjenično udaraj prema plafonu.' },
    { id: 'jacks', level: 4, kind: 'kardio', name: 'Sjedeći skokovi', how: 'Ruke gore i noge u stranu u isto vrijeme, pa nazad.' },
    { id: 'nazad', level: 4, kind: 'snaga', name: 'Naginjanje unazad', how: 'Sjedni na prednji dio stolice, ruke prekrštene, nagni se malo nazad i zadrži.' },
    { id: 'obje', level: 4, kind: 'snaga', name: 'Podizanje obje noge', how: 'Drži se za stolicu, podigni obje noge malo od poda.' },
    { id: 'ustajanjeRuke', level: 4, kind: 'snaga', name: 'Ustajanje uz pomoć ruku', how: 'Stopala malo nazad, odgurni se rukama, ustani, polako sjedni.' },
    { id: 'polaUstajanja', level: 4, kind: 'snaga', name: 'Pola ustajanja', how: 'Ruke naprijed, odigni se malo od stolice, zadrži, polako sjedni.' },
    { id: 'ustajanje', level: 5, kind: 'snaga', name: 'Ustajanje bez ruku', how: 'Ruke prekrštene, ustani i polako sjedni.' }
  ];

  const LEVELS = [
    { n: 1, name: 'Najlakše', desc: 'Mali pokreti, bez napora.' },
    { n: 2, name: 'Lagano', desc: 'Veći pokreti, ruke, trup i noge.' },
    { n: 3, name: 'Srednje', desc: 'Brži tempo i duže zadržavanje.' },
    { n: 4, name: 'Teže', desc: 'Radi cijelo tijelo, prvi pokušaji ustajanja.' },
    { n: 5, name: 'Najteže', desc: 'Ustajanje bez pomoći ruku.' }
  ];

  const KINDS = { mobilnost: 'Zagrijavanje', kardio: 'Kardio', snaga: 'Snaga', istezanje: 'Istezanje' };

  const TYPES = {
    mix: { name: 'Mješoviti dan', short: 'Kardio + snaga' },
    kardio: { name: 'Kardio dan', short: 'Sagorijevanje' },
    snaga: { name: 'Dan snage', short: 'Mišići' },
    lagano: { name: 'Lagani dan', short: 'Oporavak' }
  };
  // ritam sedmice: 2 kardio, 2 mješovita (kardio + snaga), 1 snaga, 2 lagana dana
  const WEEK_TYPES = ['mix', 'kardio', 'snaga', 'lagano', 'kardio', 'mix', 'lagano'];

  // 4 sedmice: rad raste, odmor se smanjuje, više vježbi i krugova
  const PHASES = [
    { name: 'Upoznavanje', work: 30, rest: 30, main: 5, rounds: 1, maxLevel: 2 },
    { name: 'Navikavanje', work: 35, rest: 25, main: 4, rounds: 2, maxLevel: 2 },
    { name: 'Jačanje', work: 40, rest: 20, main: 5, rounds: 2, maxLevel: 3 },
    { name: 'Sagorijevanje', work: 45, rest: 15, main: 6, rounds: 2, maxLevel: 4 }
  ];
  const PLAN_DAYS = 28;

  const RULES = {
    countsAsDone: 0.75,      // dan se računa (streak + napredak) ako uradi bar 75% vježbi
    graceDaysPerWeek: 1,     // 1 propušten dan sedmično ne prekida streak
    skipBlockSessions: 3,    // preskočena vježba se ne pojavljuje 3 treninga
    abortsToStepBack: 2,     // 2 prekinuta treninga zaredom → 3 dana nazad
    stepBackDays: 3,
    roundRest: 45            // veliki odmor između krugova
  };

  const TIPS = [
    'Poslije ručka prošetaj 10 minuta, makar oko kuće.',
    'Svakih pola sata ustani i prošetaj 2–3 minute.',
    'Popij čašu vode prije svakog obroka.',
    'Dok gledaš TV, u reklamama marširaj sjedeći.',
    'Uveče lagana šetnja od 10–15 minuta.',
    'Danas idi pješke do prodavnice ili do komšije.',
    'Kad telefoniraš, hodaj po sobi umjesto da sjediš.',
    'Ako možeš, danas još jedan kratki trening poslijepodne.'
  ];

  const TZ = 'Europe/Sarajevo';
  function dayKey(d) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d || new Date());
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

  function phaseFor(day) {
    if (day <= PLAN_DAYS) {
      const w = Math.ceil(day / 7);
      return Object.assign({ week: w, month: 1 }, PHASES[w - 1]);
    }
    const extra = Math.floor((day - PLAN_DAYS - 1) / 7) + 1; // 1, 2, 3 … sedmica poslije plana
    return { week: 4 + extra, month: 1 + Math.ceil((day - PLAN_DAYS) / 28), name: 'Nastavak', work: Math.min(60, 45 + 5 * extra), rest: 15, main: 6, rounds: extra >= 2 ? 3 : 2, maxLevel: 5 };
  }

  /* Plan za jedan dan. opts: { blocked(id), ease, restBonus } */
  function planForDay(day, opts) {
    opts = opts || {};
    const ph = phaseFor(day);
    const type = WEEK_TYPES[(day - 1) % 7];
    const r = rng(hashStr('dan:' + day));
    const ok = (e) => e.level <= ph.maxLevel && !(opts.blocked && opts.blocked(e.id));
    // novije (teže) vježbe sedmice idu češće: duplo se ubace u izbor
    const pool = (kind, maxLevel) => {
      const list = EXERCISES.filter((e) => e.kind === kind && ok(e) && e.level <= (maxLevel || 5));
      const weighted = list.concat(list.filter((e) => e.level >= ph.maxLevel - 1));
      const seen = {}, out = [];
      shuffle(weighted, r).forEach((e) => { if (!seen[e.id]) { seen[e.id] = 1; out.push(e); } });
      return out;
    };
    const take = (list, n, fallback) => {
      const src = list.length ? list : fallback;
      const out = [];
      for (let i = 0; i < n; i++) out.push(src[i % src.length]);
      return out;
    };
    const work = Math.max(20, ph.work - (opts.ease ? 5 : 0));
    const rest = ph.rest + (opts.restBonus || 0) + (opts.ease ? 5 : 0);
    const items = [];
    const add = (e, dur, restAfter, tag, round) => items.push({ id: e.id, name: e.name, how: e.how, kind: e.kind, level: e.level, dur, rest: restAfter, tag, round: round || 0 });

    const mob = pool('mobilnost');
    take(mob, 2, [byId('ramena'), byId('ruke')]).forEach((e) => add(e, 25, 10, 'zagrijavanje'));

    const stretches = pool('istezanje').filter((e) => e.id !== 'disanje');
    const coolStretch = stretches[0] || byId('bocno');
    let rounds = 1;
    if (type === 'lagano') {
      const easy = pool('snaga', 2).concat(pool('kardio', 1));
      const extra = mob.slice(2).concat(stretches.filter((e) => e.id !== coolStretch.id));
      take(easy, 3, [byId('prsti')]).concat(take(extra, 2, [byId('bocno')])).forEach((e) => add(e, 30, 15, 'lagano'));
    } else {
      rounds = ph.rounds;
      const k = pool('kardio'), s = pool('snaga');
      const main = [];
      let ki = 0, si = 0;
      for (let i = 0; i < ph.main; i++) {
        const useK = type === 'kardio' ? true : type === 'snaga' ? false : i % 2 === 0;
        if (useK) main.push(k.length ? k[ki++ % k.length] : byId('marsiranje'));
        else main.push(s.length ? s[si++ % s.length] : byId('prsti'));
      }
      // na kardio danu jedna vježba snage za mišiće, na danu snage jedna kardio
      if (type === 'kardio' && s.length && main.length > 3) main[main.length - 2] = s[0];
      if (type === 'snaga' && k.length && main.length > 3) main[main.length - 2] = k[0];
      for (let rd = 1; rd <= rounds; rd++) {
        main.forEach((e, i) => {
          const last = i === main.length - 1;
          add(e, work, last && rd < rounds ? RULES.roundRest : rest, 'glavna', rounds > 1 ? rd : 0);
        });
      }
    }
    add(coolStretch, 30, 10, 'smirivanje');
    add(byId('disanje'), 40, 0, 'smirivanje');

    for (let i = 1; i < items.length - 1; i++) {
      if (items[i].id === items[i - 1].id && items[i].tag === items[i + 1].tag && items[i].round === items[i + 1].round && items[i].tag !== 'smirivanje') {
        const t = items[i]; items[i] = items[i + 1]; items[i + 1] = t;
      }
    }
    const totalSec = items.reduce((sum, it) => sum + it.dur + it.rest, 0) + 5;
    return {
      day, week: ph.week, weekName: ph.name, month: ph.month, inPlan: day <= PLAN_DAYS,
      type, typeName: TYPES[type].name, typeShort: TYPES[type].short,
      rounds, work, rest, items,
      minutes: Math.max(1, Math.round(totalSec / 60)),
      workMinutes: Math.round(items.reduce((sum, it) => sum + it.dur, 0) / 60)
    };
  }

  function makePlan(data) {
    const prog = data.prog;
    const blocked = (id) => (prog.skipBlock[id] || 0) > prog.sessionsCount;
    return planForDay(prog.day || 1, { blocked, ease: prog.ease, restBonus: prog.restBonus });
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
    const firstKey = keys[0];
    return {
      today: data.weights[today] ?? null,
      last: lastKey ? { date: lastKey, kg: data.weights[lastKey] } : null,
      prev: prevKey ? { date: prevKey, kg: data.weights[prevKey] } : null,
      first: firstKey ? { date: firstKey, kg: data.weights[firstKey] } : null
    };
  }

  function tipFor(day) { return TIPS[(day - 1) % TIPS.length]; }

  function summary(data, today) {
    today = today || dayKey();
    const plan = makePlan(data);
    return {
      today,
      weight: weightInfo(data, today),
      ...streakInfo(data, today),
      day: plan.day, planDays: PLAN_DAYS, planWeek: plan.week, weekName: plan.weekName, inPlan: plan.inPlan,
      plan: { count: plan.items.length, minutes: plan.minutes, typeName: plan.typeName, typeShort: plan.typeShort, rounds: plan.rounds },
      tip: tipFor(plan.day)
    };
  }

  function finishSession(data, p, today) {
    today = today || dayKey();
    const prog = data.prog;
    const total = Math.max(1, Number(p.total) || 1);
    const done = Math.max(0, Math.min(total, Number(p.done) || 0));
    const skipped = Array.isArray(p.skipped) ? p.skipped.filter((id) => byId(id)) : [];
    const extraRest = Math.max(0, Number(p.extraRest) || 0);
    const reachedEnd = !!p.reachedEnd;
    const counts = done / total >= RULES.countsAsDone;
    const before = streakInfo(data, today);
    const prevRecord = Math.max(data.record || 0, before.streak);
    const dayBefore = prog.day || 1;

    data.sessions.push({
      date: today, at: new Date().toISOString(), day: dayBefore, reachedEnd, counts,
      skipped, extraRest, done, total, seconds: Math.round(Number(p.seconds) || 0)
    });
    prog.sessionsCount++;
    skipped.forEach((id) => { prog.skipBlock[id] = prog.sessionsCount + RULES.skipBlockSessions; });

    let advanced = false, steppedBack = false;
    if (counts) {
      prog.abortStreak = 0;
      if (prog.lastAdvance !== today) { prog.day = dayBefore + 1; prog.lastAdvance = today; advanced = true; }
      prog.ease = skipped.length >= 2 ? 1 : 0;
      prog.restBonus = extraRest >= 2 ? 10 : 0;
    } else {
      prog.abortStreak = (prog.abortStreak || 0) + 1;
      prog.ease = 1;
      if (prog.abortStreak >= RULES.abortsToStepBack) {
        prog.day = Math.max(1, dayBefore - RULES.stepBackDays); prog.abortStreak = 0; steppedBack = true;
      }
    }

    const after = streakInfo(data, today);
    data.record = Math.max(prevRecord, after.streak);
    const next = phaseFor(prog.day);
    return {
      counts, done, total, seconds: Math.round(Number(p.seconds) || 0),
      streak: after.streak, record: data.record,
      newRecord: counts && after.streak > prevRecord && after.streak > 1,
      advanced, steppedBack, dayDone: dayBefore, nextDay: prog.day,
      newWeek: advanced && (prog.day - 1) % 7 === 0, nextWeek: next.week, nextWeekName: next.name,
      planFinished: advanced && dayBefore === PLAN_DAYS,
      tip: tipFor(dayBefore),
      week: after.week
    };
  }

  window.Program = { EXERCISES, LEVELS, KINDS, TYPES, WEEK_TYPES, PHASES, PLAN_DAYS, RULES, TIPS, dayKey, addDays, phaseFor, planForDay, makePlan, summary, finishSession, streakInfo };
})();

(function () {
  'use strict';

  var SCALE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  var MEASURE_BEATS = { '4/4': 8, '3/4': 6, '2/4': 4 };

  /* ── Rhythm patterns (arrays of eighth-note unit durations) ──────── */
  var RHYTHMS = {
    '4/4': {
      starter:      [[8], [4, 4], [4, 4], [2, 2, 4], [4, 2, 2],
                     [2, 2, 4], [4, 2, 2], [1, 1, 2, 4], [4, 1, 1, 2]],
      beginner:     [[8], [4, 4], [2, 2, 4], [4, 2, 2], [2, 2, 2, 2],
                     [1, 1, 2, 4], [4, 1, 1, 2], [2, 1, 1, 4], [1, 1, 2, 2, 2]],
      intermediate: [[4, 4], [2, 2, 4], [4, 2, 2], [2, 2, 2, 2], [2, 4, 2]],
      advanced:     [[2, 2, 2, 2], [4, 2, 2], [2, 2, 4], [2, 4, 2],
                     [1, 1, 2, 2, 2], [2, 2, 1, 1, 2], [2, 2, 2, 1, 1]]
    },
    '3/4': {
      starter:      [[6], [4, 2], [2, 4], [2, 2, 2], [4, 2], [2, 4], [1, 1, 2, 2]],
      beginner:     [[6], [4, 2], [2, 4], [2, 2, 2], [1, 1, 4], [1, 1, 2, 2], [2, 1, 1, 2]],
      intermediate: [[2, 2, 2], [4, 2], [2, 4]],
      advanced:     [[2, 2, 2], [1, 1, 2, 2], [2, 1, 1, 2], [2, 2, 1, 1]]
    },
    '2/4': {
      starter:      [[4], [2, 2], [2, 2], [1, 1, 2]],
      beginner:     [[4], [2, 2], [1, 1, 2], [2, 1, 1]],
      intermediate: [[2, 2], [4], [1, 1, 2]],
      advanced:     [[2, 2], [1, 1, 2], [2, 1, 1], [1, 1, 1, 1]]
    }
  };

  /* Sub-rhythms for split measures (keyed by eighth-note unit count) */
  var SUB_RHYTHMS = {
    2: [[2], [1, 1]],
    4: [[4], [2, 2], [1, 1, 2], [2, 1, 1]],
    6: [[6], [4, 2], [2, 4], [2, 2, 2]]
  };

  var DYNAMICS = ['!f!', '!p!', '!mf!', '!mp!'];

  /* ── Helpers ─────────────────────────────────────────────────────── */
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pick(arr) {
    return arr[randInt(0, arr.length - 1)];
  }

  function noteToAbc(letterIdx, octave) {
    var letter = SCALE_LETTERS[letterIdx % 7];
    if (octave <= 4) {
      var s = letter;
      for (var i = 0; i < 4 - octave; i++) s += ',';
      return s;
    }
    var s = letter.toLowerCase();
    for (var i = 0; i < octave - 5; i++) s += "'";
    return s;
  }

  function buildPool(startLetter, startOct, endLetter, endOct) {
    var pool = [];
    var idx = startLetter, oct = startOct;
    while (oct < endOct || (oct === endOct && idx <= endLetter)) {
      pool.push({ letterIdx: idx, octave: oct });
      idx++;
      if (idx > 6) { idx = 0; oct++; }
    }
    return pool;
  }

  function nextPos(cur, len) {
    if (Math.random() < 0.15) {
      var leap = randInt(2, 4) * (Math.random() < 0.5 ? -1 : 1);
      return Math.max(0, Math.min(len - 1, cur + leap));
    }
    var step = Math.random() < 0.5 ? -1 : 1;
    return Math.max(0, Math.min(len - 1, cur + step));
  }

  // Fixed-hand variant: always moves to a different note, avoids 3-in-a-row
  function nextPosFixed(cur, len, recent) {
    var next, attempts = 0;
    do {
      var step = Math.random() < 0.8
        ? (Math.random() < 0.5 ? -1 : 1)
        : (Math.random() < 0.5 ? -2 : 2);
      next = Math.max(0, Math.min(len - 1, cur + step));
      attempts++;
      var threeInRow = recent.length >= 2 &&
        recent[recent.length - 1] === next &&
        recent[recent.length - 2] === next;
    } while ((next === cur || threeInRow) && attempts < 20);
    if (next === cur) next = cur > 0 ? cur - 1 : cur + 1;
    return next;
  }

  function closestTonic(pool, cur) {
    var best = cur, bestD = Infinity;
    for (var i = 0; i < pool.length; i++) {
      if (pool[i].letterIdx === 0) {
        var d = Math.abs(i - cur);
        if (d < bestD) { bestD = d; best = i; }
      }
    }
    return best;
  }

  /* ── Melody generation ──────────────────────────────────────────── */
  function generateMelody(pool, nMeasures, timeSig, difficulty, resolve) {
    var rhythms = RHYTHMS[timeSig][difficulty];
    var pos = randInt(1, Math.max(1, pool.length - 2));
    var out = [];
    var recent = [];

    for (var m = 0; m < nMeasures; m++) {
      var rhy = pick(rhythms);
      var tokens = [];
      var lastMeasure = resolve && m === nMeasures - 1;

      for (var i = 0; i < rhy.length; i++) {
        var dur = rhy[i];
        if (lastMeasure && i === rhy.length - 1) {
          pos = closestTonic(pool, pos);
        } else if (difficulty === 'starter' || difficulty === 'beginner') {
          pos = nextPosFixed(pos, pool.length, recent);
        } else {
          pos = nextPos(pos, pool.length);
        }
        var n = pool[pos];
        recent.push(pos);
        if (recent.length > 4) recent.shift();

        var abc = noteToAbc(n.letterIdx, n.octave) + (dur === 1 ? '' : dur);
        tokens.push({ abc: abc, isRest: false, dur: dur });
      }
      out.push(tokens);
    }
    return out;
  }

  function generateFragment(pool, rhythm, difficulty) {
    var pos = randInt(0, pool.length - 1);
    var tokens = [];
    var recent = [];
    for (var i = 0; i < rhythm.length; i++) {
      if (difficulty === 'starter' || difficulty === 'beginner') {
        pos = nextPosFixed(pos, pool.length, recent);
      } else {
        pos = nextPos(pos, pool.length);
      }
      var n = pool[pos];
      recent.push(pos);
      tokens.push({
        abc: noteToAbc(n.letterIdx, n.octave) + (rhythm[i] === 1 ? '' : rhythm[i]),
        isRest: false,
        dur: rhythm[i]
      });
    }
    return tokens;
  }

  function restMeasure(timeSig) {
    return [{ abc: 'z' + MEASURE_BEATS[timeSig], isRest: true }];
  }

  function generateSplitMeasure(pools, timeSig, difficulty) {
    var totalBeats = MEASURE_BEATS[timeSig];
    var splitPoint;
    if (timeSig === '4/4') splitPoint = 4;
    else if (timeSig === '3/4') splitPoint = pick([2, 4]);
    else splitPoint = 2;
    var secondHalf = totalBeats - splitPoint;

    var rhFirst = Math.random() < 0.5;
    var firstPool = rhFirst ? pools.rh : pools.lh;
    var secondPool = rhFirst ? pools.lh : pools.rh;

    var firstTokens = generateFragment(firstPool, pick(SUB_RHYTHMS[splitPoint]), difficulty);
    var secondTokens = generateFragment(secondPool, pick(SUB_RHYTHMS[secondHalf]), difficulty);

    var firstFull = firstTokens.concat([{ abc: 'z' + secondHalf, isRest: true, dur: secondHalf }]);
    var restAndSecond = [{ abc: 'z' + splitPoint, isRest: true, dur: splitPoint }].concat(secondTokens);

    return rhFirst
      ? { rh: firstFull, lh: restAndSecond }
      : { rh: restAndSecond, lh: firstFull };
  }

  /* ── Articulations ──────────────────────────────────────────────── */
  function applyStaccato(measures, maxDur) {
    maxDur = maxDur || 2;
    for (var m = 0; m < measures.length; m++)
      for (var i = 0; i < measures[m].length; i++) {
        var tok = measures[m][i];
        if (tok.isRest) continue;
        var durMatch = tok.abc.match(/(\d*)$/);
        var dur = durMatch && durMatch[1] ? parseInt(durMatch[1], 10) : 1;
        if (dur <= maxDur) tok.staccato = true;
      }
  }

  function applyFullLegato(measures) {
    var first = null, last = null;
    for (var m = 0; m < measures.length; m++)
      for (var i = 0; i < measures[m].length; i++)
        if (!measures[m][i].isRest) {
          if (!first) first = measures[m][i];
          last = measures[m][i];
        }
    if (first && last && first !== last) {
      first.slurStart = true;
      last.slurEnd = true;
    }
  }

  function addSlurGroups(measures, prob) {
    for (var m = 0; m < measures.length; m++) {
      var t = measures[m], i = 0;
      while (i < t.length) {
        if (!t[i].isRest && !t[i].staccato && Math.random() < prob) {
          var end = Math.min(i + randInt(2, 3), t.length);
          var ok = true;
          for (var j = i + 1; j < end; j++)
            if (t[j].isRest || t[j].staccato) { ok = false; break; }
          if (ok && end - i >= 2) {
            t[i].slurStart = true;
            t[end - 1].slurEnd = true;
            i = end;
            continue;
          }
        }
        i++;
      }
    }
  }

  function applyRests(measures, prob) {
    for (var m = 0; m < measures.length; m++)
      for (var i = 0; i < measures[m].length; i++) {
        var tok = measures[m][i];
        if (tok.isRest) continue;
        if (m === 0 && i === 0) continue;
        if (m === measures.length - 1 && i === measures[m].length - 1) continue;
        if (Math.random() < prob) {
          var d = tok.abc.match(/(\d*)$/)[1];
          tok.abc = 'z' + d;
          tok.isRest = true;
          tok.staccato = false;
        }
      }
  }

  function setDynamic(measures, dyn) {
    for (var m = 0; m < measures.length; m++)
      for (var i = 0; i < measures[m].length; i++)
        if (!measures[m][i].isRest) { measures[m][i].dynamic = dyn; return; }
  }

  /* ── Beginner-specific decorations ───────────────────────────────── */
  var SHARPEN_OK = [0, 1, 3, 4, 5]; // C, D, F, G, A — avoid E→F and B→C
  var NOTE_SEMITONES = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B
  var SCALE_INTERVALS = {
    '':    [0, 2, 4, 5, 7, 9, 11], // major
    'm':   [0, 2, 3, 5, 7, 8, 10], // natural minor
    'dor': [0, 2, 3, 5, 7, 9, 10], // dorian
    'mix': [0, 2, 4, 5, 7, 9, 10], // mixolydian
    'lyd': [0, 2, 4, 6, 7, 9, 11], // lydian
    'phr': [0, 1, 3, 5, 7, 8, 10]  // phrygian
  };

  function buildSharpenableSet(key) {
    var rootLetterIdx = SCALE_LETTERS.indexOf(key.charAt(0).toUpperCase());
    var rootSemitone = NOTE_SEMITONES[rootLetterIdx];
    var rest = key.substring(1).trim();
    if (rest.charAt(0) === '#') { rootSemitone = (rootSemitone + 1) % 12; rest = rest.substring(1).trim(); }
    else if (rest.charAt(0) === 'b') { rootSemitone = (rootSemitone + 11) % 12; rest = rest.substring(1).trim(); }
    var mode = SCALE_INTERVALS[rest] ? rest : '';
    // Major and Lydian: no accidentals for beginner
    if (mode === '' || mode === 'lyd') return [];
    var intervals = SCALE_INTERVALS[mode];
    var scaleSet = {};
    for (var i = 0; i < intervals.length; i++) scaleSet[(rootSemitone + intervals[i]) % 12] = true;
    // Only raised 6th and 7th degrees (melodic minor approach)
    var result = [];
    var degrees = [(rootLetterIdx + 5) % 7, (rootLetterIdx + 6) % 7];
    for (var d = 0; d < degrees.length; d++) {
      var li = degrees[d];
      if (SHARPEN_OK.indexOf(li) === -1) continue;       // skip E/B (E#=F, B#=C)
      if (!scaleSet[NOTE_SEMITONES[li]]) continue;        // note is altered by key sig, needs = not ^
      result.push(li);
    }
    return result;
  }

  function applyAccidentals(measures, prob, sharpenable) {
    for (var m = 0; m < measures.length; m++)
      for (var i = 0; i < measures[m].length; i++) {
        var tok = measures[m][i];
        if (tok.isRest) continue;
        var ch = tok.abc.charAt(0).toUpperCase();
        var letterIdx = SCALE_LETTERS.indexOf(ch);
        if (sharpenable.indexOf(letterIdx) !== -1 && Math.random() < prob) {
          tok.abc = '^' + tok.abc;
        }
      }
  }

  function applyAccents(measures, prob) {
    for (var m = 0; m < measures.length; m++)
      for (var i = 0; i < measures[m].length; i++) {
        var tok = measures[m][i];
        if (!tok.isRest && !tok.staccato && Math.random() < prob) {
          tok.accent = true;
        }
      }
  }

  function hasNotes(measure) {
    for (var i = 0; i < measure.length; i++) if (!measure[i].isRest) return true;
    return false;
  }

  function firstNoteIdx(measure) {
    for (var i = 0; i < measure.length; i++) if (!measure[i].isRest) return i;
    return -1;
  }

  function lastNoteIdx(measure) {
    for (var i = measure.length - 1; i >= 0; i--) if (!measure[i].isRest) return i;
    return -1;
  }

  /* Place 1-3 dynamics across the whole beginner piece */
  function distributeBeginnerDynamics(rhAll, lhAll) {
    var active = [];
    for (var m = 0; m < rhAll.length; m++) {
      if (hasNotes(rhAll[m])) active.push(rhAll[m]);
      else if (hasNotes(lhAll[m])) active.push(lhAll[m]);
    }
    if (!active.length) return;

    var r = Math.random();
    var count = r < 0.2 ? 1 : r < 0.8 ? 2 : 3;
    count = Math.min(count, active.length);

    var lastDyn = '';
    for (var i = 0; i < count; i++) {
      var pos = Math.floor(active.length * i / count);
      var dyn;
      do { dyn = pick(DYNAMICS); } while (dyn === lastDyn && DYNAMICS.length > 1);
      lastDyn = dyn;
      setDynamic([active[pos]], dyn);
    }
  }

  /* Place 0-4 cresc/dim spanning ~1 measure each across the beginner piece */
  function distributeBeginnerCrescDim(rhAll, lhAll, timeSig) {
    var totalBeats = MEASURE_BEATS[timeSig];

    // 0: 15%, 1: 50%, 2: 20%, 3: 10%, 4: 5%
    var r = Math.random();
    var count;
    if (r < 0.15) count = 0;
    else if (r < 0.65) count = 1;
    else if (r < 0.85) count = 2;
    else if (r < 0.95) count = 3;
    else count = 4;
    if (count === 0) return;

    var active = [];
    for (var m = 0; m < rhAll.length; m++) {
      if (hasNotes(rhAll[m])) active.push({ arr: rhAll, idx: m });
      else if (hasNotes(lhAll[m])) active.push({ arr: lhAll, idx: m });
    }
    if (!active.length) return;
    count = Math.min(count, active.length);

    var used = {};
    var placed = 0, attempts = 0;
    while (placed < count && attempts < 30) {
      attempts++;
      var aIdx = randInt(0, active.length - 1);
      if (used[aIdx]) continue;

      var a = active[aIdx];
      var measure = a.arr[a.idx];
      var fi = firstNoteIdx(measure), li = lastNoteIdx(measure);
      if (fi === -1 || fi === li) continue;

      // Span: 3/4 measure (20%), full measure (60%), full+part next (20%)
      var spanR = Math.random();
      var startTok = measure[fi];
      var endTok;

      if (spanR < 0.2) {
        // ~3/4 of the measure
        var target = totalBeats * 0.75;
        var cum = 0, endIdx = fi;
        for (var i = fi; i <= li; i++) {
          if (!measure[i].isRest) { cum += measure[i].dur; endIdx = i; }
          if (cum >= target) break;
        }
        endTok = endIdx > fi ? measure[endIdx] : measure[li];

      } else if (spanR < 0.8) {
        // Full measure
        endTok = measure[li];

      } else {
        // Full measure + part of next measure in same voice
        var next = a.idx + 1 < a.arr.length ? a.arr[a.idx + 1] : null;
        if (next && hasNotes(next)) {
          var target = totalBeats * 0.25;
          var cum = 0, endIdx = -1;
          for (var i = 0; i < next.length; i++) {
            if (!next[i].isRest) { cum += next[i].dur; endIdx = i; }
            if (cum >= target) break;
          }
          endTok = endIdx !== -1 ? next[endIdx] : measure[li];
          // Reserve next measure too
          for (var i = 0; i < active.length; i++) {
            if (active[i].arr === a.arr && active[i].idx === a.idx + 1) { used[i] = true; break; }
          }
        } else {
          endTok = measure[li];
        }
      }

      if (startTok === endTok) continue;

      if (Math.random() < 0.5) {
        startTok.crescStart = true;
        endTok.crescEnd = true;
      } else {
        startTok.dimStart = true;
        endTok.dimEnd = true;
      }
      used[aIdx] = true;
      placed++;
    }
  }

  /* ── Hand assignment per difficulty ─────────────────────────────── */

  // Starter: one contiguous block per hand (50/50 split)
  function assignStarter(n) {
    var half = Math.floor(n / 2);
    var rhFirst = Math.random() < 0.5;
    var a = [];
    for (var i = 0; i < n; i++)
      a.push(i < half ? (rhFirst ? 'rh' : 'lh') : (rhFirst ? 'lh' : 'rh'));
    return a;
  }

  // Beginner: blocks of 1-2, single measures, occasional intra-measure splits
  function assignBeginner(n) {
    var a = [];
    var cur = Math.random() < 0.5 ? 'rh' : 'lh';
    var i = 0;
    while (i < n) {
      if (Math.random() < 0.15) {
        a.push('split');
        cur = cur === 'rh' ? 'lh' : 'rh';
        i++;
      } else {
        var blockLen = Math.min(randInt(1, 2), n - i);
        for (var j = 0; j < blockLen; j++) { a.push(cur); i++; }
        cur = cur === 'rh' ? 'lh' : 'rh';
      }
    }
    return a;
  }

  // Intermediate: alternating blocks of 1-2 measures
  function assignIntermediate(n) {
    var cur = Math.random() < 0.5 ? 'rh' : 'lh';
    var a = [], i = 0;
    var maxBlock = n <= 4 ? 1 : 2;
    while (i < n) {
      var bs = Math.min(randInt(1, maxBlock), n - i);
      for (var j = 0; j < bs; j++) { a.push(cur); i++; }
      cur = cur === 'rh' ? 'lh' : 'rh';
    }
    return a;
  }

  // Advanced: both hands simultaneously
  function assignAdvanced(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push('both');
    return a;
  }

  /* ── Block grouping ─────────────────────────────────────────────── */
  function groupBlocks(assignment) {
    var blocks = [];
    var c = { hand: assignment[0], start: 0, len: 1 };
    for (var i = 1; i < assignment.length; i++) {
      if (assignment[i] === c.hand) c.len++;
      else { blocks.push(c); c = { hand: assignment[i], start: i, len: 1 }; }
    }
    blocks.push(c);
    return blocks;
  }

  /* ── Note pools by difficulty ───────────────────────────────────── */
  var BEGINNER_RH_POS = [
    [0, 4, 4, 4], // C4–G4
    [0, 5, 4, 5], // C5–G5
    [4, 4, 1, 5], // G4–D5
    [3, 4, 0, 5], // F4–C5
    [5, 4, 2, 5]  // A4–E5
  ];
  var BEGINNER_LH_POS = [
    [0, 3, 4, 3], // C3–G3
    [3, 2, 0, 3], // F2–C3
    [1, 3, 5, 3]  // D3–A3
  ];

  function getPools(diff) {
    if (diff === 'starter') {
      if (Math.random() < 0.5) {
        return { rh: buildPool(0, 4, 4, 4), lh: buildPool(0, 3, 4, 3) };
      }
      return { rh: buildPool(1, 4, 5, 4), lh: buildPool(1, 3, 5, 3) };
    }
    if (diff === 'beginner') {
      var rp = pick(BEGINNER_RH_POS);
      var lp = pick(BEGINNER_LH_POS);
      return {
        rh: buildPool(rp[0], rp[1], rp[2], rp[3]),
        lh: buildPool(lp[0], lp[1], lp[2], lp[3])
      };
    }
    if (diff === 'intermediate') return {
      rh: buildPool(0, 4, 0, 5),
      lh: buildPool(4, 2, 4, 3)
    };
    return {
      rh: buildPool(0, 4, 4, 5),
      lh: buildPool(0, 2, 4, 3)
    };
  }

  /* ── Serialize ──────────────────────────────────────────────────── */
  function serializeMeasures(allMeasures) {
    var parts = [];
    for (var m = 0; m < allMeasures.length; m++) {
      var tokens = allMeasures[m], strs = [];
      for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i], s = '';
        if (t.slurStart)  s += '(';
        if (t.crescStart) s += '!crescendo(!';
        if (t.crescEnd)   s += '!crescendo)!';
        if (t.dimStart)   s += '!diminuendo(!';
        if (t.dimEnd)     s += '!diminuendo)!';
        if (t.dynamic)    s += t.dynamic;
        if (t.accent)     s += '!accent!';
        if (t.staccato)   s += '.';
        s += t.abc;
        if (t.slurEnd)    s += ')';
        strs.push(s);
      }
      // Join tokens: consecutive eighth notes (dur=1) without space to beam them
      var joined = strs[0] || '';
      for (var i = 1; i < strs.length; i++) {
        var prev = tokens[i - 1], cur = tokens[i];
        if (prev.dur === 1 && cur.dur === 1 && !prev.isRest && !cur.isRest) {
          joined += strs[i];
        } else {
          joined += ' ' + strs[i];
        }
      }
      parts.push(joined);
    }
    return parts.join(' | ') + ' |]';
  }

  /* ── Main generate ──────────────────────────────────────────────── */
  function generate(numMeasures, key, timeSig, difficulty) {
    key        = key        || 'C';
    timeSig    = timeSig    || '4/4';
    difficulty = difficulty || 'starter';

    var pools = getPools(difficulty);
    var sharpenable = buildSharpenableSet(key);

    var assignment;
    if (difficulty === 'starter')           assignment = assignStarter(numMeasures);
    else if (difficulty === 'beginner')     assignment = assignBeginner(numMeasures);
    else if (difficulty === 'intermediate') assignment = assignIntermediate(numMeasures);
    else                                   assignment = assignAdvanced(numMeasures);

    var blocks = groupBlocks(assignment);
    var rhAll = [], lhAll = [];
    var dynIdx = 0;

    // Starter: ~25% chance of clean (no articulation, contrasting dynamics),
    // otherwise the two blocks get different articulations
    var starterArts, starterClean = false;
    if (difficulty === 'starter') {
      if (Math.random() < 0.25) {
        starterArts = ['none', 'none'];
        starterClean = true;
      } else {
        starterArts = Math.random() < 0.5
          ? ['staccato', 'legato']
          : ['legato', 'staccato'];
      }
    }

    for (var b = 0; b < blocks.length; b++) {
      var blk = blocks[b];
      var isLast = (b === blocks.length - 1);

      if (blk.hand === 'split') {
        // Split measures (beginner: one hand per half-measure)
        for (var sm = 0; sm < blk.len; sm++) {
          var splitResult = generateSplitMeasure(pools, timeSig, difficulty);
          var bothHalves = [splitResult.rh, splitResult.lh];
          applyAccidentals(bothHalves, 0.1, sharpenable);
          applyAccents(bothHalves, 0.08);
          rhAll.push(splitResult.rh);
          lhAll.push(splitResult.lh);
        }

      } else if (blk.hand === 'rh' || blk.hand === 'lh') {
        var pool = blk.hand === 'rh' ? pools.rh : pools.lh;
        var mel = generateMelody(pool, blk.len, timeSig, difficulty, isLast);

        // Rests (not for starter)
        if (difficulty !== 'starter') {
          var restProb = difficulty === 'beginner' ? 0.08
                       : difficulty === 'intermediate' ? 0.04 : 0.08;
          applyRests(mel, restProb);
        }

        // Articulation
        var art;
        if (difficulty === 'starter') {
          art = starterArts[b];
        } else {
          art = Math.random() < 0.5 ? 'staccato' : 'legato';
        }

        if (art === 'staccato') {
          applyStaccato(mel, 2);
        } else if (art !== 'none') {
          if (difficulty === 'starter') {
            applyFullLegato(mel);
          } else {
            addSlurGroups(mel, 0.5);
          }
        }

        // Beginner-specific decorations
        if (difficulty === 'beginner') {
          applyAccidentals(mel, 0.1, sharpenable);
          applyAccents(mel, 0.08);
        }

        // Dynamic (beginner handled after loop)
        if (starterClean) {
          setDynamic(mel, b === 0 ? '!f!' : '!p!');
        } else if (difficulty !== 'beginner') {
          setDynamic(mel, DYNAMICS[dynIdx++ % DYNAMICS.length]);
        }

        // Push measures
        for (var m = 0; m < blk.len; m++) {
          if (blk.hand === 'rh') {
            rhAll.push(mel[m]);
            lhAll.push(restMeasure(timeSig));
          } else {
            lhAll.push(mel[m]);
            rhAll.push(restMeasure(timeSig));
          }
        }

      } else {
        // 'both' — advanced: both hands simultaneously
        var rhMel = generateMelody(pools.rh, blk.len, timeSig, 'advanced', isLast);
        var lhMel = generateMelody(pools.lh, blk.len, timeSig, 'starter', isLast);
        applyRests(rhMel, 0.08);
        applyStaccato(rhMel, 2);
        addSlurGroups(rhMel, 0.25);
        addSlurGroups(lhMel, 0.3);
        for (var m = 0; m < blk.len; m++) {
          if (m % 2 === 0) {
            var d = DYNAMICS[(m / 2) % DYNAMICS.length];
            setDynamic([rhMel[m]], d);
            setDynamic([lhMel[m]], d);
          }
          rhAll.push(rhMel[m]);
          lhAll.push(lhMel[m]);
        }
      }
    }

    // Beginner: controlled distribution of dynamics and cresc/dim
    if (difficulty === 'beginner') {
      distributeBeginnerDynamics(rhAll, lhAll);
      distributeBeginnerCrescDim(rhAll, lhAll, timeSig);
    }

    // Build ABC string
    var abc = [
      'X:1',
      'T:Sight Reading Exercise',
      'M:' + timeSig,
      'L:1/8',
      '%%staves {1 2}',
      'K:' + key,
      'V:1 clef=treble',
      serializeMeasures(rhAll),
      'V:2 clef=bass',
      serializeMeasures(lhAll)
    ].join('\n');

    return abc;
  }

  window.Generator = { generate: generate };
})();

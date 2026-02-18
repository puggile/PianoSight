(function () {
  'use strict';

  var SCALE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  var MEASURE_BEATS = { '4/4': 8, '3/4': 6, '2/4': 4 };

  /* ── Rhythm patterns (arrays of eighth-note unit durations) ──────── */
  var RHYTHMS = {
    '4/4': {
      beginner:     [[8], [4, 4], [4, 4], [2, 2, 4], [4, 2, 2],
                     [2, 2, 4], [4, 2, 2], [1, 1, 2, 4], [4, 1, 1, 2]],
      intermediate: [[4, 4], [2, 2, 4], [4, 2, 2], [2, 2, 2, 2], [2, 4, 2]],
      advanced:     [[2, 2, 2, 2], [4, 2, 2], [2, 2, 4], [2, 4, 2],
                     [1, 1, 2, 2, 2], [2, 2, 1, 1, 2], [2, 2, 2, 1, 1]]
    },
    '3/4': {
      beginner:     [[6], [4, 2], [2, 4], [2, 2, 2], [4, 2], [2, 4], [1, 1, 2, 2]],
      intermediate: [[2, 2, 2], [4, 2], [2, 4]],
      advanced:     [[2, 2, 2], [1, 1, 2, 2], [2, 1, 1, 2], [2, 2, 1, 1]]
    },
    '2/4': {
      beginner:     [[4], [2, 2], [2, 2], [1, 1, 2]],
      intermediate: [[2, 2], [4], [1, 1, 2]],
      advanced:     [[2, 2], [1, 1, 2], [2, 1, 1], [1, 1, 1, 1]]
    }
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

  // Beginner variant: always moves to a different note, avoids 3-in-a-row
  function nextPosBeginner(cur, len, recent) {
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
    var recent = []; // track recent positions for beginner variety

    for (var m = 0; m < nMeasures; m++) {
      var rhy = pick(rhythms);
      var tokens = [];
      var lastMeasure = resolve && m === nMeasures - 1;

      for (var i = 0; i < rhy.length; i++) {
        var dur = rhy[i];
        if (lastMeasure && i === rhy.length - 1) {
          pos = closestTonic(pool, pos);
        } else if (difficulty === 'beginner') {
          pos = nextPosBeginner(pos, pool.length, recent);
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

  function restMeasure(timeSig) {
    return [{ abc: 'z' + MEASURE_BEATS[timeSig], isRest: true }];
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

  /* ── Hand assignment per difficulty ─────────────────────────────── */

  // Beginner: one contiguous block per hand (50/50 split)
  function assignBeginner(n) {
    var half = Math.floor(n / 2);
    var rhFirst = Math.random() < 0.5;
    var a = [];
    for (var i = 0; i < n; i++)
      a.push(i < half ? (rhFirst ? 'rh' : 'lh') : (rhFirst ? 'lh' : 'rh'));
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
  function getPools(diff) {
    if (diff === 'beginner') {
      // Randomly pick one of two 5-finger positions, same for both hands
      if (Math.random() < 0.5) {
        return { rh: buildPool(0, 4, 4, 4), lh: buildPool(0, 3, 4, 3) }; // C–G
      }
      return { rh: buildPool(1, 4, 5, 4), lh: buildPool(1, 3, 5, 3) };   // D–A
    }
    if (diff === 'intermediate') return {
      rh: buildPool(0, 4, 0, 5),  // C4–C5
      lh: buildPool(4, 2, 4, 3)   // G2–G3
    };
    return {
      rh: buildPool(0, 4, 4, 5),  // C4–G5
      lh: buildPool(0, 2, 4, 3)   // C2–G3
    };
  }

  /* ── Serialize ──────────────────────────────────────────────────── */
  function serializeMeasures(allMeasures) {
    var parts = [];
    for (var m = 0; m < allMeasures.length; m++) {
      var tokens = allMeasures[m], strs = [];
      for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i], s = '';
        if (t.slurStart) s += '(';
        if (t.dynamic)   s += t.dynamic;
        if (t.staccato)  s += '.';
        s += t.abc;
        if (t.slurEnd)   s += ')';
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
    difficulty = difficulty || 'beginner';

    var pools = getPools(difficulty);

    var assignment;
    if (difficulty === 'beginner')          assignment = assignBeginner(numMeasures);
    else if (difficulty === 'intermediate') assignment = assignIntermediate(numMeasures);
    else                                   assignment = assignAdvanced(numMeasures);

    var blocks = groupBlocks(assignment);
    var rhAll = [], lhAll = [];
    var dynIdx = 0;

    // Beginner: ~25% chance of clean (no articulation, contrasting dynamics),
    // otherwise the two blocks get different articulations
    var beginnerArts, beginnerClean = false;
    if (difficulty === 'beginner') {
      if (Math.random() < 0.25) {
        beginnerArts = ['none', 'none'];
        beginnerClean = true;
      } else {
        beginnerArts = Math.random() < 0.5
          ? ['staccato', 'legato']
          : ['legato', 'staccato'];
      }
    }

    for (var b = 0; b < blocks.length; b++) {
      var blk = blocks[b];
      var isLast = (b === blocks.length - 1);

      if (blk.hand === 'rh' || blk.hand === 'lh') {
        var pool = blk.hand === 'rh' ? pools.rh : pools.lh;
        var mel = generateMelody(pool, blk.len, timeSig, difficulty, isLast);

        // Rests (non-beginner only)
        if (difficulty !== 'beginner') {
          applyRests(mel, difficulty === 'intermediate' ? 0.04 : 0.08);
        }

        // Articulation
        var art;
        if (difficulty === 'beginner') {
          art = beginnerArts[b];
        } else {
          art = Math.random() < 0.5 ? 'staccato' : 'legato';
        }

        if (art === 'staccato') {
          applyStaccato(mel, 2);
        } else if (art !== 'none') {
          if (difficulty === 'beginner') {
            applyFullLegato(mel);
          } else {
            addSlurGroups(mel, 0.5);
          }
        }

        // Dynamic: clean beginner gets contrasting f/p
        if (beginnerClean) {
          setDynamic(mel, b === 0 ? '!f!' : '!p!');
        } else {
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
        var lhMel = generateMelody(pools.lh, blk.len, timeSig, 'beginner', isLast);
        // RH: rests + staccato on short notes + slur groups on longer notes
        applyRests(rhMel, 0.08);
        applyStaccato(rhMel, 2);
        addSlurGroups(rhMel, 0.25);
        // LH: legato groups
        addSlurGroups(lhMel, 0.3);
        // Dynamics every 2 measures
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

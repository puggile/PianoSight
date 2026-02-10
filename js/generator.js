(function () {
  'use strict';

  var SCALE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

  // --- Chord progressions by mode (degrees 0-6) ---
  var PROGRESSIONS = {
    major: {
      closed: [[0,3,4,0], [0,5,4,0], [0,1,4,0]],
      open:   [[0,5,3,4], [0,1,3,4], [0,3,1,4]]
    },
    minor: {
      closed: [[0,3,4,0], [0,6,4,0], [0,5,4,0]],
      open:   [[0,3,5,4], [0,5,6,4], [0,3,6,4]]
    },
    dorian: {
      // i-IV and i-VII are characteristic
      closed: [[0,3,4,0], [0,3,6,0], [0,1,3,0]],
      open:   [[0,3,6,4], [0,1,3,4], [0,6,3,4]]
    },
    mixolydian: {
      // I-bVII is characteristic
      closed: [[0,6,3,0], [0,3,6,0], [0,4,6,0]],
      open:   [[0,3,6,4], [0,6,3,4], [0,4,3,6]]
    },
    lydian: {
      // I-II is characteristic
      closed: [[0,1,6,0], [0,1,4,0], [0,6,1,0]],
      open:   [[0,1,6,4], [0,6,1,4], [0,1,4,6]]
    },
    phrygian: {
      // i-bII is characteristic
      closed: [[0,1,6,0], [0,1,3,0], [0,5,1,0]],
      open:   [[0,1,5,3], [0,5,1,3], [0,1,3,6]]
    }
  };

  // --- RH rhythm patterns by time signature and difficulty ---
  // Each array of patterns sums to the measure's eighth-note unit count
  var RH_RHYTHMS = {
    '4/4': {
      beginner:     [[8], [4,4]],
      intermediate: [[4,4], [2,2,4], [4,2,2], [2,2,2,2], [2,4,2]],
      advanced:     [[2,2,2,2], [4,4], [4,2,2], [2,2,4], [2,4,2],
                     [1,1,2,2,2], [2,2,1,1,2], [2,2,2,1,1], [4,2,1,1]]
    },
    '3/4': {
      beginner:     [[6], [4,2], [2,4]],
      intermediate: [[2,2,2], [4,2], [2,4]],
      advanced:     [[2,2,2], [1,1,2,2], [2,1,1,2], [2,2,1,1], [4,1,1], [1,1,4]]
    },
    '2/4': {
      beginner:     [[4], [2,2]],
      intermediate: [[2,2], [4]],
      advanced:     [[2,2], [1,1,2], [2,1,1], [1,1,1,1]]
    }
  };

  // --- LH patterns by time sig and difficulty ---
  var LH_PATTERNS = {
    '4/4': {
      beginner: [
        function (r,t,f) { return r + '8'; },
        function (r,t,f) { return r + '4 ' + f + '4'; }
      ],
      intermediate: [
        function (r,t,f) { return r + '8'; },
        function (r,t,f) { return r + '4 ' + f + '4'; },
        function (r,t,f) { return r + '2 ' + t + '2 ' + f + '2 ' + t + '2'; }
      ],
      advanced: [
        function (r,t,f) { return r + '8'; },
        function (r,t,f) { return r + '4 ' + f + '4'; },
        function (r,t,f) { return r + '2 ' + t + '2 ' + f + '2 ' + t + '2'; },
        function (r,t,f) { return r + '2 ' + f + '2 ' + t + '2 ' + f + '2'; },
        function (r,t,f) { return r + '2 [' + t + f + ']2 ' + r + '2 [' + t + f + ']2'; }
      ]
    },
    '3/4': {
      beginner: [
        function (r,t,f) { return r + '6'; },
        function (r,t,f) { return r + '4 ' + f + '2'; }
      ],
      intermediate: [
        function (r,t,f) { return r + '6'; },
        function (r,t,f) { return r + '4 ' + f + '2'; },
        function (r,t,f) { return r + '2 ' + t + '2 ' + f + '2'; }
      ],
      advanced: [
        function (r,t,f) { return r + '6'; },
        function (r,t,f) { return r + '4 ' + f + '2'; },
        function (r,t,f) { return r + '2 ' + t + '2 ' + f + '2'; },
        function (r,t,f) { return r + '2 [' + t + f + ']2 [' + t + f + ']2'; }
      ]
    },
    '2/4': {
      beginner: [
        function (r,t,f) { return r + '4'; },
        function (r,t,f) { return r + '2 ' + f + '2'; }
      ],
      intermediate: [
        function (r,t,f) { return r + '4'; },
        function (r,t,f) { return r + '2 ' + f + '2'; },
        function (r,t,f) { return r + '2 [' + t + f + ']2'; }
      ],
      advanced: [
        function (r,t,f) { return r + '4'; },
        function (r,t,f) { return r + '2 ' + f + '2'; },
        function (r,t,f) { return r + '2 [' + t + f + ']2'; },
        function (r,t,f) { return r + ' ' + f + ' ' + t + ' ' + f; }
      ]
    }
  };

  // Strong beat positions (in eighth-note units)
  var STRONG_BEATS = {
    '4/4': [0, 4],
    '3/4': [0],
    '2/4': [0]
  };

  // Rest probability per difficulty
  var REST_PROB    = { beginner: 0,    intermediate: 0.04, advanced: 0.08 };
  // Staccato probability on short weak-beat notes
  var STACCATO_PROB = { beginner: 0,   intermediate: 0.12, advanced: 0.20 };
  // Probability to start a slur group
  var SLUR_PROB    = { beginner: 0,    intermediate: 0.15, advanced: 0.25 };

  // Dynamics cycle: alternates loud/soft every 2 measures
  var DYNAMICS_CYCLE = ['!f!', '!p!', '!mf!', '!mp!'];

  // --- Helpers ---
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pick(arr) {
    return arr[randInt(0, arr.length - 1)];
  }

  function parseMode(key) {
    if (key.indexOf(' dor') !== -1) return 'dorian';
    if (key.indexOf(' mix') !== -1) return 'mixolydian';
    if (key.indexOf(' lyd') !== -1) return 'lydian';
    if (key.indexOf(' phr') !== -1) return 'phrygian';
    if (key.indexOf('m') !== -1 && key.indexOf('maj') === -1) return 'minor';
    return 'major';
  }

  function noteToAbc(letterIdx, octave) {
    var letter = SCALE_LETTERS[letterIdx % 7];
    if (octave <= 4) {
      var commas = '';
      for (var i = 0; i < 4 - octave; i++) commas += ',';
      return letter + commas;
    }
    var apos = '';
    for (var j = 0; j < octave - 5; j++) apos += "'";
    return letter.toLowerCase() + apos;
  }

  // RH pool: C4–G5 (12 notes ordered by pitch)
  function buildRhPool() {
    var pool = [];
    for (var i = 0; i <= 6; i++) pool.push({ letterIdx: i, octave: 4 });
    for (var j = 0; j <= 4; j++) pool.push({ letterIdx: j, octave: 5 });
    return pool;
  }

  function chordTones(degree) {
    return {
      root:  degree % 7,
      third: (degree + 2) % 7,
      fifth: (degree + 4) % 7
    };
  }

  function chordPoolIndices(rhPool, chord) {
    var targets = [chord.root, chord.third, chord.fifth];
    var indices = [];
    for (var i = 0; i < rhPool.length; i++) {
      if (targets.indexOf(rhPool[i].letterIdx) !== -1) indices.push(i);
    }
    return indices;
  }

  function closestChordTone(rhPool, chordIndices, currentPos) {
    var best = chordIndices[0];
    var bestDist = Math.abs(currentPos - best);
    for (var i = 1; i < chordIndices.length; i++) {
      var d = Math.abs(currentPos - chordIndices[i]);
      if (d < bestDist) { bestDist = d; best = chordIndices[i]; }
    }
    return best;
  }

  function stepConjunct(currentPos, poolLength) {
    var next = currentPos + (Math.random() < 0.5 ? -1 : 1);
    if (next < 0) next = 0;
    if (next >= poolLength) next = poolLength - 1;
    return next;
  }

  // LH voicing: root in octave 3, third and fifth in close position above
  function lhVoicing(degree) {
    var chord = chordTones(degree);
    var rootAbc = noteToAbc(chord.root, 3);
    var thirdOct = chord.third > chord.root ? 3 : 4;
    var thirdAbc = noteToAbc(chord.third, thirdOct);
    var fifthOct = chord.fifth > chord.root ? 3 : 4;
    if (fifthOct < thirdOct || (fifthOct === thirdOct && chord.fifth <= chord.third)) {
      fifthOct = thirdOct;
      if (chord.fifth <= chord.third) fifthOct++;
    }
    var fifthAbc = noteToAbc(chord.fifth, fifthOct);
    return { root: rootAbc, third: thirdAbc, fifth: fifthAbc };
  }

  // --- Add slur groupings to a tokens array ---
  function addSlurs(tokens, prob) {
    if (prob <= 0) return;
    var i = 0;
    while (i < tokens.length) {
      if (!tokens[i].isRest && !tokens[i].staccato && Math.random() < prob) {
        var len = randInt(2, 3);
        var end = i + 1;
        while (end < tokens.length && end < i + len) {
          if (tokens[end].isRest || tokens[end].staccato) break;
          end++;
        }
        if (end - i >= 2) {
          tokens[i].slurStart = true;
          tokens[end - 1].slurEnd = true;
          i = end;
          continue;
        }
      }
      i++;
    }
  }

  // Serialize token array to ABC string
  function serializeTokens(tokens) {
    var parts = [];
    for (var j = 0; j < tokens.length; j++) {
      var tok = tokens[j];
      var s = '';
      if (tok.slurStart) s += '(';
      if (tok.dynamic)   s += tok.dynamic;
      if (tok.staccato)  s += '.';
      s += tok.abc;
      if (tok.slurEnd)   s += ')';
      parts.push(s);
    }
    return parts.join(' ');
  }

  // --- Generate RH melody for one measure ---
  function generateRhMeasure(rhPool, degree, currentPos, isLastMeasure, cfg) {
    var rhythm = pick(cfg.rhythms);
    var chord = chordTones(degree);
    var chordIdx = chordPoolIndices(rhPool, chord);
    var tokens = [];
    var beatPos = 0;

    for (var i = 0; i < rhythm.length; i++) {
      var dur = rhythm[i];
      var isStrong = cfg.strongBeats.indexOf(beatPos) !== -1;
      var isLast = isLastMeasure && (i === rhythm.length - 1);

      // Rests on weak beats
      if (!isStrong && !isLast && Math.random() < cfg.restProb) {
        tokens.push({ abc: 'z' + (dur === 1 ? '' : dur), isRest: true });
        beatPos += dur;
        continue;
      }

      // Note selection
      if (isLast) {
        var tonicIdx = [];
        for (var t = 0; t < rhPool.length; t++) {
          if (rhPool[t].letterIdx === 0) tonicIdx.push(t);
        }
        currentPos = closestChordTone(rhPool, tonicIdx, currentPos);
      } else if (isStrong) {
        currentPos = closestChordTone(rhPool, chordIdx, currentPos);
      } else {
        if (Math.random() < 0.3) {
          currentPos = closestChordTone(rhPool, chordIdx, currentPos);
        } else {
          currentPos = stepConjunct(currentPos, rhPool.length);
        }
      }

      var note = rhPool[currentPos];
      var noteAbc = noteToAbc(note.letterIdx, note.octave) + (dur === 1 ? '' : String(dur));
      var staccato = !isStrong && dur <= 2 && Math.random() < cfg.staccatoProb;

      tokens.push({ abc: noteAbc, isRest: false, staccato: staccato });
      beatPos += dur;
    }

    addSlurs(tokens, cfg.slurProb);
    return { tokens: tokens, pos: currentPos };
  }

  // --- Generate LH for one measure ---
  function generateLhMeasure(degree, timeSig, difficulty) {
    var voicing = lhVoicing(degree);
    var patterns = LH_PATTERNS[timeSig][difficulty];
    return pick(patterns)(voicing.root, voicing.third, voicing.fifth);
  }

  // --- Pick harmonic progression ---
  function pickProgression(numMeasures, mode) {
    var progs = PROGRESSIONS[mode];
    if (numMeasures <= 4) {
      return pick(progs.closed);
    }
    return pick(progs.open).concat(pick(progs.closed));
  }

  // --- Main API ---
  function generate(numMeasures, key, timeSig, difficulty) {
    key        = key        || 'C';
    timeSig    = timeSig    || '4/4';
    difficulty = difficulty || 'intermediate';

    var mode = parseMode(key);
    var progression = pickProgression(numMeasures, mode);
    var rhPool = buildRhPool();
    var rhPos = randInt(3, 8);

    var cfg = {
      rhythms:      RH_RHYTHMS[timeSig][difficulty],
      strongBeats:  STRONG_BEATS[timeSig],
      restProb:     REST_PROB[difficulty],
      staccatoProb: STACCATO_PROB[difficulty],
      slurProb:     SLUR_PROB[difficulty]
    };

    var rhMeasures = [];
    var lhMeasures = [];
    var dynIdx = 0;

    for (var m = 0; m < numMeasures; m++) {
      var degree = progression[m % progression.length];
      var isLastMeasure = (m === numMeasures - 1);
      var phraseStart = (m % 2 === 0);

      // RH
      var rhResult = generateRhMeasure(rhPool, degree, rhPos, isLastMeasure, cfg);
      rhPos = rhResult.pos;
      var tokens = rhResult.tokens;

      // LH
      var lhStr = generateLhMeasure(degree, timeSig, difficulty);

      // Dynamics at phrase boundaries (every 2 measures)
      if (phraseStart) {
        var dyn = DYNAMICS_CYCLE[dynIdx % DYNAMICS_CYCLE.length];
        dynIdx++;
        // Attach to first non-rest RH token
        for (var k = 0; k < tokens.length; k++) {
          if (!tokens[k].isRest) { tokens[k].dynamic = dyn; break; }
        }
        // Prepend to LH
        lhStr = dyn + lhStr;
      }

      rhMeasures.push(serializeTokens(tokens));
      lhMeasures.push(lhStr);
    }

    var header = [
      'X:1',
      'T:Esercizio',
      'M:' + timeSig,
      'L:1/8',
      '%%staves {RH LH}',
      'K:' + key
    ].join('\n');

    var rh = 'V:RH clef=treble\n' + rhMeasures.join(' | ') + ' |]';
    var lh = 'V:LH clef=bass\n'   + lhMeasures.join(' | ') + ' |]';

    return header + '\n' + rh + '\n' + lh;
  }

  window.Generator = { generate: generate };
})();

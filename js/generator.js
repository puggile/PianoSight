(function () {
  'use strict';

  // Right hand: C4–G5 (treble clef)
  var rhPool = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'c', 'd', 'e', 'f', 'g'];
  // Left hand: C3–G4 (bass clef)
  var lhPool = ['C,', 'D,', 'E,', 'F,', 'G,', 'A,', 'B,', 'C', 'D', 'E', 'F', 'G'];

  var durations = [1, 2, 4, 8]; // in eighth-note units
  // Left hand biased toward longer values for beginners
  var lhDurations = [2, 4, 8];

  function durationSuffix(units) {
    if (units === 1) return '';
    return String(units);
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pickDuration(remaining, pool) {
    var valid = pool.filter(function (d) { return d <= remaining; });
    return valid[randInt(0, valid.length - 1)];
  }

  function pickNextNoteIndex(lastIndex, poolLength) {
    var step;
    if (Math.random() < 0.65) {
      step = Math.random() < 0.5 ? -1 : 1;
    } else {
      step = randInt(2, 4) * (Math.random() < 0.5 ? -1 : 1);
    }
    var next = lastIndex + step;
    if (next < 0) next = 0;
    if (next >= poolLength) next = poolLength - 1;
    return next;
  }

  function generateVoice(numMeasures, notePool, durPool, restProb) {
    var lastNoteIndex = randInt(0, notePool.length - 1);
    var measures = [];

    for (var m = 0; m < numMeasures; m++) {
      var remaining = 8;
      var tokens = [];

      while (remaining > 0) {
        var dur = pickDuration(remaining, durPool);
        var isRest = Math.random() < restProb;

        if (isRest) {
          tokens.push('z' + durationSuffix(dur));
        } else {
          lastNoteIndex = pickNextNoteIndex(lastNoteIndex, notePool.length);
          tokens.push(notePool[lastNoteIndex] + durationSuffix(dur));
        }
        remaining -= dur;
      }

      measures.push(tokens.join(' '));
    }

    return measures.join(' | ') + ' |]';
  }

  function generate(numMeasures) {
    var header = [
      'X:1',
      'T:Esercizio',
      'M:4/4',
      'L:1/8',
      '%%staves {RH LH}',
      'K:C'
    ].join('\n');

    var rh = 'V:RH clef=treble\n' + generateVoice(numMeasures, rhPool, durations, 0.15);
    var lh = 'V:LH clef=bass\n' + generateVoice(numMeasures, lhPool, lhDurations, 0.10);

    return header + '\n' + rh + '\n' + lh;
  }

  window.Generator = { generate: generate };
})();

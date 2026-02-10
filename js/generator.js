(function () {
  'use strict';

  var notePool = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'c', 'd', 'e', 'f', 'g'];
  var durations = [1, 2, 4, 8]; // in eighth-note units

  function durationSuffix(units) {
    if (units === 1) return '';
    return String(units);
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pickDuration(remaining) {
    var valid = durations.filter(function (d) { return d <= remaining; });
    return valid[randInt(0, valid.length - 1)];
  }

  function pickNextNoteIndex(lastIndex) {
    var step;
    if (Math.random() < 0.65) {
      // conjunct motion: ±1
      step = Math.random() < 0.5 ? -1 : 1;
    } else {
      // moderate leap: ±2 to ±4
      step = randInt(2, 4) * (Math.random() < 0.5 ? -1 : 1);
    }
    var next = lastIndex + step;
    // clamp to pool bounds
    if (next < 0) next = 0;
    if (next >= notePool.length) next = notePool.length - 1;
    return next;
  }

  function generate(numMeasures) {
    var header = [
      'X:1',
      'T:Esercizio',
      'M:4/4',
      'L:1/8',
      'K:C'
    ].join('\n');

    var lastNoteIndex = randInt(0, notePool.length - 1);
    var measures = [];

    for (var m = 0; m < numMeasures; m++) {
      var remaining = 8; // 8 eighth-note units per 4/4 measure
      var tokens = [];

      while (remaining > 0) {
        var dur = pickDuration(remaining);
        var isRest = Math.random() < 0.15;

        if (isRest) {
          tokens.push('z' + durationSuffix(dur));
        } else {
          lastNoteIndex = pickNextNoteIndex(lastNoteIndex);
          tokens.push(notePool[lastNoteIndex] + durationSuffix(dur));
        }
        remaining -= dur;
      }

      measures.push(tokens.join(' '));
    }

    return header + '\n' + measures.join(' | ') + ' |]';
  }

  window.Generator = { generate: generate };
})();

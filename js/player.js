(function () {
  'use strict';

  var audioContext = null;
  var synth = null;
  var endTimer = null;
  var playing = false;

  function isSupported() {
    return typeof ABCJS !== 'undefined' &&
      typeof ABCJS.synth !== 'undefined' &&
      typeof ABCJS.synth.SynthController !== 'undefined' &&
      typeof AudioContext !== 'undefined';
  }

  function ensureContext() {
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    if (audioContext.state === 'suspended') {
      return audioContext.resume();
    }
    return Promise.resolve();
  }

  function play(visualObj, bpm, onEnded) {
    if (playing) stop();

    return ensureContext().then(function () {
      synth = new ABCJS.synth.CreateSynth();
      var millisecondsPerMeasure = 240000 / bpm;

      return synth.init({
        visualObj: visualObj,
        audioContext: audioContext,
        millisecondsPerMeasure: millisecondsPerMeasure
      });
    }).then(function () {
      return synth.prime();
    }).then(function (response) {
      synth.start();
      playing = true;

      var durationMs = (response && response.duration ? response.duration * 1000 : 5000) + 100;
      endTimer = setTimeout(function () {
        playing = false;
        if (onEnded) onEnded();
      }, durationMs);
    });
  }

  function stop() {
    if (endTimer) {
      clearTimeout(endTimer);
      endTimer = null;
    }
    if (synth) {
      synth.stop();
    }
    playing = false;
  }

  function isPlaying() {
    return playing;
  }

  window.Player = {
    isSupported: isSupported,
    play: play,
    stop: stop,
    isPlaying: isPlaying
  };
})();

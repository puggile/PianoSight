(function () {
  'use strict';

  var audioContext = null;
  var synth = null;
  var endTimer = null;
  var playing = false;

  function isSupported() {
    return typeof ABCJS !== 'undefined' &&
      typeof ABCJS.synth !== 'undefined' &&
      typeof ABCJS.synth.CreateSynth !== 'undefined' &&
      (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined');
  }

  // Create AudioContext synchronously in the user gesture call stack (iOS
  // requirement), then return the resume() promise so callers can wait for
  // the context to actually be in "running" state before using it.
  function ensureContext() {
    if (!audioContext) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      audioContext = new Ctx();
    }
    return audioContext.resume();
  }

  function play(visualObj, bpm, msPerMeasure, onEnded) {
    if (playing) stop();

    // Step 1: unlock audio — create context synchronously in the tap
    // handler, then wait for resume() to resolve before proceeding.
    return ensureContext().then(function () {
      synth = new ABCJS.synth.CreateSynth();

      return synth.init({
        visualObj: visualObj,
        audioContext: audioContext,
        millisecondsPerMeasure: msPerMeasure,
        options: { qpm: bpm }
      });
    }).then(function () {
      return synth.prime();
    }).then(function (response) {
      synth.start();
      playing = true;

      var durationMs = 5000;
      if (response) {
        if (typeof response.duration === 'number' && response.duration > 0) {
          durationMs = response.duration * 1000;
        } else if (typeof response.totalDuration === 'number' && response.totalDuration > 0) {
          durationMs = response.totalDuration * 1000;
        }
      }
      durationMs += 200;

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
      try {
        synth.stop();
      } catch (e) {
        // Ignore errors if synth is in an invalid state
      }
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

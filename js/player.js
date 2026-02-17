(function () {
  'use strict';

  var audioEl = null;
  var playing = false;
  var blobUrl = null;

  var OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;

  function isSupported() {
    return typeof ABCJS !== 'undefined' &&
      typeof ABCJS.synth !== 'undefined' &&
      typeof ABCJS.synth.CreateSynth !== 'undefined' &&
      (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') &&
      !!OfflineCtx;
  }

  // Pre-unlock <audio> on iOS: must be called synchronously inside a
  // user-gesture (click/tap) call-stack so the browser grants the
  // element permission to produce sound.
  function ensureAudioElement() {
    if (!audioEl) {
      audioEl = new Audio();
      audioEl.setAttribute('playsinline', '');
    }
    audioEl.src = 'data:audio/wav;base64,' +
      'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    audioEl.volume = 0;
    try { audioEl.play().catch(function () {}); } catch (e) { /* ignore */ }
  }

  /* ---------- WAV encoder ---------- */

  function writeStr(dv, off, s) {
    for (var i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i));
  }

  function encodeWAV(buf) {
    var nCh  = buf.numberOfChannels;
    var sr   = buf.sampleRate;
    var len  = buf.length;
    var ba   = nCh * 2;                       // blockAlign (16-bit)
    var data = len * ba;
    var ab   = new ArrayBuffer(44 + data);
    var v    = new DataView(ab);

    writeStr(v, 0, 'RIFF');
    v.setUint32(4, 36 + data, true);
    writeStr(v, 8, 'WAVE');
    writeStr(v, 12, 'fmt ');
    v.setUint32(16, 16, true);                // fmt chunk size
    v.setUint16(20, 1, true);                 // PCM format
    v.setUint16(22, nCh, true);
    v.setUint32(24, sr, true);
    v.setUint32(28, sr * ba, true);           // byte rate
    v.setUint16(32, ba, true);
    v.setUint16(34, 16, true);                // bits per sample
    writeStr(v, 36, 'data');
    v.setUint32(40, data, true);

    var ch = [];
    for (var c = 0; c < nCh; c++) ch.push(buf.getChannelData(c));

    var pos = 44;
    for (var i = 0; i < len; i++) {
      for (var c = 0; c < nCh; c++) {
        var s = Math.max(-1, Math.min(1, ch[c][i]));
        v.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        pos += 2;
      }
    }
    return new Blob([ab], { type: 'audio/wav' });
  }

  /* ---------- Offline-render helpers ---------- */

  // Patch an OfflineAudioContext so ABCJS treats it like a running
  // real-time context (it may check .state or call .resume()).
  function patchOffline(ctx) {
    ctx.resume  = function () { return Promise.resolve(); };
    ctx.suspend = function () { return Promise.resolve(); };
    try {
      Object.defineProperty(ctx, 'state', {
        get: function () { return 'running'; }
      });
    } catch (e) { /* some engines won't allow redefining — harmless */ }
    return ctx;
  }

  /* ---------- Public API ---------- */

  function play(visualObj, bpm, msPerMeasure, onEnded) {
    if (playing) stop();

    // 1. Pre-unlock <audio> synchronously in the tap handler
    ensureAudioElement();

    // 2. Throw-away real-time context: load soundfonts & discover duration
    var Ctx    = window.AudioContext || window.webkitAudioContext;
    var tmpCtx = new Ctx();
    var probe  = new ABCJS.synth.CreateSynth();

    return tmpCtx.resume().then(function () {
      return probe.init({
        visualObj: visualObj,
        audioContext: tmpCtx,
        millisecondsPerMeasure: msPerMeasure,
        options: { qpm: bpm }
      });
    }).then(function () {
      return probe.prime();
    }).then(function (resp) {
      var dur = 5;
      if (resp) {
        if (typeof resp.duration === 'number' && resp.duration > 0)
          dur = resp.duration;
        else if (typeof resp.totalDuration === 'number' && resp.totalDuration > 0)
          dur = resp.totalDuration;
      }
      dur += 0.5; // tail padding
      try { tmpCtx.close(); } catch (e) { /* ignore */ }

      // 3. Render offline
      var sr     = 44100;
      var offCtx = patchOffline(new OfflineCtx(2, Math.ceil(sr * dur), sr));
      var synth  = new ABCJS.synth.CreateSynth();

      return synth.init({
        visualObj: visualObj,
        audioContext: offCtx,
        millisecondsPerMeasure: msPerMeasure,
        options: { qpm: bpm }
      }).then(function () {
        return synth.prime();
      }).then(function () {
        synth.start();
        return offCtx.startRendering();
      });
    }).then(function (rendered) {
      // 4. WAV → <audio>
      var wav = encodeWAV(rendered);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = URL.createObjectURL(wav);

      audioEl.volume = 1;
      audioEl.src    = blobUrl;
      playing = true;

      audioEl.onended = function () {
        if (playing) {
          playing = false;
          if (onEnded) onEnded();
        }
      };

      var p = audioEl.play();
      if (p) p.catch(function () {
        playing = false;
        if (onEnded) onEnded();
      });
    });
  }

  function stop() {
    if (audioEl) {
      audioEl.pause();
      audioEl.currentTime = 0;
      audioEl.onended     = null;
    }
    if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
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

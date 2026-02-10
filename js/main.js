(function () {
  'use strict';

  var currentVisualObj = null;

  document.addEventListener('DOMContentLoaded', function () {
    var measuresSelect = document.getElementById('measures');
    var bpmSlider = document.getElementById('bpm');
    var bpmValue = document.getElementById('bpm-value');
    var generateBtn = document.getElementById('generate-btn');
    var playBtn = document.getElementById('play-btn');
    var audioStatus = document.getElementById('audio-status');

    // Update BPM display
    bpmSlider.addEventListener('input', function () {
      bpmValue.textContent = bpmSlider.value;
    });

    // Check audio support
    if (!Player.isSupported()) {
      playBtn.disabled = true;
      audioStatus.textContent = 'Audio non supportato in questo browser.';
    }

    function doGenerate() {
      if (Player.isPlaying()) {
        Player.stop();
        playBtn.textContent = 'Play';
      }

      var numMeasures = parseInt(measuresSelect.value, 10);
      var abc = Generator.generate(numMeasures);
      currentVisualObj = Renderer.render(abc);
      playBtn.disabled = false;
      audioStatus.textContent = '';
    }

    generateBtn.addEventListener('click', doGenerate);

    playBtn.addEventListener('click', function () {
      if (Player.isPlaying()) {
        Player.stop();
        playBtn.textContent = 'Play';
        audioStatus.textContent = '';
        return;
      }

      if (!currentVisualObj) return;

      var bpm = parseInt(bpmSlider.value, 10);
      playBtn.textContent = 'Stop';
      audioStatus.textContent = 'Caricamento audio...';

      Player.play(currentVisualObj, bpm, function () {
        playBtn.textContent = 'Play';
        audioStatus.textContent = '';
      }).then(function () {
        audioStatus.textContent = '';
      }).catch(function (err) {
        audioStatus.textContent = 'Errore audio: ' + err.message;
        playBtn.textContent = 'Play';
      });
    });

    // Auto-generate on load
    doGenerate();
  });
})();

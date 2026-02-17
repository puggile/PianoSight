(function () {
  'use strict';

  var STORAGE_KEY = 'mymusic-random-config';
  var DEFAULT_CONFIG = {
    keys: ['C', 'Am', 'F', 'Dm'],
    timeSigs: ['4/4', '2/4'],
    measures: ['4', '6']
  };
  var INTERMEDIATE_EXTRA = {
    keys: ['G', 'Em', 'Bb', 'Gm'],
    timeSigs: ['3/4'],
    measures: ['8']
  };

  var currentVisualObj = null;

  function loadConfig() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var cfg = JSON.parse(raw);
        if (cfg.keys && cfg.keys.length &&
            cfg.timeSigs && cfg.timeSigs.length &&
            cfg.measures && cfg.measures.length) {
          return cfg;
        }
      }
    } catch (e) { /* ignore */ }
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  function saveConfig(config) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function union(base, extra) {
    var set = {};
    var result = [];
    base.concat(extra).forEach(function (v) {
      if (!set[v]) { set[v] = true; result.push(v); }
    });
    return result;
  }

  function getAllOptionsFromSelect(selectEl) {
    var opts = [];
    for (var i = 0; i < selectEl.options.length; i++) {
      opts.push(selectEl.options[i].value);
    }
    return opts;
  }

  function getPoolForDifficulty(config, difficulty, allKeys, allTimeSigs, allMeasures) {
    if (difficulty === 'advanced') {
      return { keys: allKeys, timeSigs: allTimeSigs, measures: allMeasures };
    }
    if (difficulty === 'intermediate') {
      return {
        keys: union(config.keys, INTERMEDIATE_EXTRA.keys),
        timeSigs: union(config.timeSigs, INTERMEDIATE_EXTRA.timeSigs),
        measures: union(config.measures, INTERMEDIATE_EXTRA.measures)
      };
    }
    // beginner
    return { keys: config.keys, timeSigs: config.timeSigs, measures: config.measures };
  }

  function setSelectValue(selectEl, value) {
    for (var i = 0; i < selectEl.options.length; i++) {
      if (selectEl.options[i].value === value) {
        selectEl.selectedIndex = i;
        return;
      }
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var keySelect = document.getElementById('key');
    var difficultySelect = document.getElementById('difficulty');
    var timeSigSelect = document.getElementById('timesig');
    var measuresSelect = document.getElementById('measures');
    var bpmSlider = document.getElementById('bpm');
    var bpmValue = document.getElementById('bpm-value');
    var generateBtn = document.getElementById('generate-btn');
    var randomBtn = document.getElementById('random-btn');
    var randomSettingsBtn = document.getElementById('random-settings-btn');
    var playBtn = document.getElementById('play-btn');
    var pdfBtn = document.getElementById('pdf-btn');
    var audioStatus = document.getElementById('audio-status');

    var modalOverlay = document.getElementById('random-modal');
    var modalBody = document.getElementById('random-modal-body');
    var modalCloseBtn = document.getElementById('random-modal-close');
    var resetBtn = document.getElementById('random-reset-btn');

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
      var abc = Generator.generate(
        numMeasures,
        keySelect.value,
        timeSigSelect.value,
        difficultySelect.value
      );
      currentVisualObj = Renderer.render(abc);
      playBtn.disabled = false;
      pdfBtn.disabled = false;
      audioStatus.textContent = '';
    }

    function doRandomGenerate() {
      var config = loadConfig();
      var allKeys = getAllOptionsFromSelect(keySelect);
      var allTimeSigs = getAllOptionsFromSelect(timeSigSelect);
      var allMeasures = getAllOptionsFromSelect(measuresSelect);
      var difficulty = difficultySelect.value;

      var pool = getPoolForDifficulty(config, difficulty, allKeys, allTimeSigs, allMeasures);

      var chosenKey = pick(pool.keys);
      var chosenTimeSig = pick(pool.timeSigs);
      var chosenMeasures = pick(pool.measures);

      setSelectValue(keySelect, chosenKey);
      setSelectValue(timeSigSelect, chosenTimeSig);
      setSelectValue(measuresSelect, chosenMeasures);

      doGenerate();
    }

    generateBtn.addEventListener('click', doGenerate);
    randomBtn.addEventListener('click', doRandomGenerate);

    playBtn.addEventListener('click', function () {
      if (Player.isPlaying()) {
        Player.stop();
        playBtn.textContent = 'Play';
        audioStatus.textContent = '';
        return;
      }

      if (!currentVisualObj) return;

      var bpm = parseInt(bpmSlider.value, 10);
      var beatsPerMeasure = parseInt(timeSigSelect.value.split('/')[0], 10);
      var msPerMeasure = beatsPerMeasure * 60000 / bpm;

      playBtn.textContent = 'Stop';
      audioStatus.textContent = 'Caricamento audio...';

      Player.play(currentVisualObj, bpm, msPerMeasure, function () {
        playBtn.textContent = 'Play';
        audioStatus.textContent = '';
      }).then(function () {
        audioStatus.textContent = '';
      }).catch(function (err) {
        audioStatus.textContent = 'Errore audio: ' + err.message;
        playBtn.textContent = 'Play';
      });
    });

    // --- PDF download ---
    pdfBtn.addEventListener('click', function () {
      pdfBtn.disabled = true;
      var name = 'pianosight_' +
        keySelect.value.replace(/\s+/g, '-').replace('#', 's') +
        '_' + timeSigSelect.value.replace('/', '-') +
        '_' + measuresSelect.value + 'bat' +
        '_' + difficultySelect.value +
        '_' + bpmSlider.value + 'bpm' +
        '.pdf';
      PdfExport.download(name)
        .catch(function (err) {
          audioStatus.textContent = 'Errore PDF: ' + err.message;
        })
        .then(function () {
          pdfBtn.disabled = false;
        });
    });

    // --- Modal logic ---

    function buildModalContent() {
      var config = loadConfig();
      var html = '';

      // Keys — grouped by optgroup
      html += '<div class="config-section"><h4>Tonalita</h4>';
      var optgroups = keySelect.querySelectorAll('optgroup');
      for (var g = 0; g < optgroups.length; g++) {
        var group = optgroups[g];
        html += '<div class="config-group"><h5>' + group.label + '</h5><div class="checkbox-grid">';
        var options = group.querySelectorAll('option');
        for (var o = 0; o < options.length; o++) {
          var val = options[o].value;
          var label = options[o].textContent;
          var checked = config.keys.indexOf(val) !== -1 ? ' checked' : '';
          html += '<label class="checkbox-label"><input type="checkbox" data-category="keys" value="' + val + '"' + checked + '> ' + label + '</label>';
        }
        html += '</div></div>';
      }
      html += '</div>';

      // Time signatures
      html += '<div class="config-section"><h4>Tempo</h4><div class="checkbox-grid">';
      for (var t = 0; t < timeSigSelect.options.length; t++) {
        var tsVal = timeSigSelect.options[t].value;
        var tsChecked = config.timeSigs.indexOf(tsVal) !== -1 ? ' checked' : '';
        html += '<label class="checkbox-label"><input type="checkbox" data-category="timeSigs" value="' + tsVal + '"' + tsChecked + '> ' + tsVal + '</label>';
      }
      html += '</div></div>';

      // Measures
      html += '<div class="config-section"><h4>Battute</h4><div class="checkbox-grid">';
      for (var m = 0; m < measuresSelect.options.length; m++) {
        var mVal = measuresSelect.options[m].value;
        var mChecked = config.measures.indexOf(mVal) !== -1 ? ' checked' : '';
        html += '<label class="checkbox-label"><input type="checkbox" data-category="measures" value="' + mVal + '"' + mChecked + '> ' + mVal + '</label>';
      }
      html += '</div></div>';

      modalBody.innerHTML = html;
    }

    function syncConfigFromCheckboxes() {
      var config = { keys: [], timeSigs: [], measures: [] };
      var checkboxes = modalBody.querySelectorAll('input[type="checkbox"]');
      for (var i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].checked) {
          var cat = checkboxes[i].getAttribute('data-category');
          config[cat].push(checkboxes[i].value);
        }
      }
      // Fallback: if any category is empty, use the default for that category
      if (!config.keys.length) config.keys = DEFAULT_CONFIG.keys.slice();
      if (!config.timeSigs.length) config.timeSigs = DEFAULT_CONFIG.timeSigs.slice();
      if (!config.measures.length) config.measures = DEFAULT_CONFIG.measures.slice();
      saveConfig(config);
    }

    // Delegated change handler on modal body
    modalBody.addEventListener('change', function () {
      syncConfigFromCheckboxes();
    });

    // Open modal
    randomSettingsBtn.addEventListener('click', function () {
      buildModalContent();
      modalOverlay.classList.remove('hidden');
    });

    // Close modal via X
    modalCloseBtn.addEventListener('click', function () {
      modalOverlay.classList.add('hidden');
    });

    // Close modal via background click
    modalOverlay.addEventListener('click', function (e) {
      if (e.target === modalOverlay) {
        modalOverlay.classList.add('hidden');
      }
    });

    // Reset to defaults
    resetBtn.addEventListener('click', function () {
      saveConfig(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
      buildModalContent();
    });

    // Auto-generate on load
    doGenerate();
  });
})();

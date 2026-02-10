(function () {
  'use strict';

  function render(abcString) {
    var visualObjs = ABCJS.renderAbc('notation', abcString, {
      responsive: 'resize',
      add_classes: true
    });
    return visualObjs[0];
  }

  window.Renderer = { render: render };
})();

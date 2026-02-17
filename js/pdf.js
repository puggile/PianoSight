(function () {
  'use strict';

  var MARGIN = 40; // pt

  function download(filename) {
    var svgEl = document.querySelector('#notation svg');
    if (!svgEl) return Promise.reject(new Error('Nessuno spartito da esportare'));

    var vb = svgEl.viewBox.baseVal;
    var svgW = vb.width || svgEl.getBoundingClientRect().width;
    var svgH = vb.height || svgEl.getBoundingClientRect().height;

    // A4 landscape (points): 841.89 x 595.28
    var pdf = new jspdf.jsPDF({
      orientation: svgW > svgH ? 'landscape' : 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    var pageW = pdf.internal.pageSize.getWidth();
    var pageH = pdf.internal.pageSize.getHeight();
    var availW = pageW - 2 * MARGIN;
    var availH = pageH - 2 * MARGIN;

    var scale = Math.min(availW / svgW, availH / svgH);
    var drawW = svgW * scale;
    var drawH = svgH * scale;
    var x = (pageW - drawW) / 2;
    var y = MARGIN;

    return pdf.svg(svgEl, { x: x, y: y, width: drawW, height: drawH })
      .then(function () {
        pdf.save(filename || 'pianosight-score.pdf');
      });
  }

  window.PdfExport = { download: download };
})();

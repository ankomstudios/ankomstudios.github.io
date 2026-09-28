// logo-hover-swap.js
//
// Nav bar logo (top-left, .navbar-brand): static assets/images/logoPixel.png
// normally, swaps to assets/images/gifs/logoPixel.gif on hover, plays
// through once, then reverts back to the static image automatically.
var LOGO_HOVER_CONFIG = {
  staticSrc: '/assets/images/logoPixel.png',
  gifSrc: '/assets/images/gifs/logoPixel.gif',

  // Browsers don't expose a GIF's playback length, so this has to be set
  // by hand to match how long logoPixel.gif actually runs (ms). If the
  // static image reappears before/after the animation finishes, adjust
  // this number.
  gifDurationMs: 1200
};

(function () {
  'use strict';

  function init() {
    var img = document.getElementById('navLogo');
    if (!img) return;

    img.src = LOGO_HOVER_CONFIG.staticSrc;

    var playing = false;
    var revertTimer = null;

    function playOnce() {
      if (playing) return; // already mid-animation — let it finish before retriggering
      playing = true;
      img.src = LOGO_HOVER_CONFIG.gifSrc;
      revertTimer = setTimeout(function () {
        img.src = LOGO_HOVER_CONFIG.staticSrc;
        playing = false;
        revertTimer = null;
      }, LOGO_HOVER_CONFIG.gifDurationMs);
    }

    img.addEventListener('mouseenter', playOnce);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
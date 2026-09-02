// Asset-browser carousel (home page): Featured Projects, Updates &
// Changes, and any future ".asset-carousel-wrap" section. Slides the
// track one item at a time via the prev/next arrow buttons, wrapping
// around at either end. Items-per-view isn't hardcoded — it's measured
// from the rendered item width, so this works for any item markup/CSS
// a given section uses (or does nothing if a track has no items yet).
//
// Exposed as window.AssetCarousel.initCarousel so a section whose
// items load asynchronously (see assets/js/updates-loader.js) can
// (re-)init itself once its items actually exist in the DOM — the
// automatic init below no-ops on an empty track without attaching
// listeners, so calling initCarousel again later is safe.
window.AssetCarousel = (function () {
  function initCarousel(root) {
    var track = root.querySelector('.asset-carousel-track');
    var items = track ? Array.prototype.slice.call(track.children) : [];
    var prevBtn = root.querySelector('.asset-carousel-prev');
    var nextBtn = root.querySelector('.asset-carousel-next');

    if (!track || items.length < 2) return;

    var index = 0;

    function itemsPerView() {
      var itemWidth = items[0].getBoundingClientRect().width;
      if (!itemWidth) return 1;
      return Math.max(1, Math.min(items.length, Math.round(track.getBoundingClientRect().width / itemWidth)));
    }

    function update() {
      var perView = itemsPerView();
      var maxIndex = items.length - perView;
      if (index > maxIndex) index = maxIndex;
      if (index < 0) index = 0;
      var offsetPx = items[0].getBoundingClientRect().width * index;
      track.style.transform = 'translateX(-' + offsetPx + 'px)';
    }

    function go(delta) {
      var perView = itemsPerView();
      var maxIndex = items.length - perView;
      index += delta;
      if (index < 0) index = maxIndex;
      if (index > maxIndex) index = 0;
      update();
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function (e) {
        e.preventDefault();
        go(-1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function (e) {
        e.preventDefault();
        go(1);
      });
    }

    window.addEventListener('resize', update);
    update();
  }

  function init() {
    document.querySelectorAll('.asset-carousel-wrap').forEach(initCarousel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { initCarousel: initCarousel };
})();

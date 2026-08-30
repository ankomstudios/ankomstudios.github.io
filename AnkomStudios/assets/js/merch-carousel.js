// Simple inline carousel for the Merch featurette box.
// - Prev/next buttons (see CSS) fade in only while the box is hovered.
// - While NOT hovered, it auto-advances to a random next slide every
//   few seconds.
// - While hovered, autoplay is paused so it won't change under the user.
(function () {
  var MIN_DELAY = 2500; // ms
  var MAX_DELAY = 5000; // ms

  function randomDelay() {
    return MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
  }

  function initCarousel(root) {
    var images = Array.prototype.slice.call(root.querySelectorAll('.merch-carousel-img'));
    var prevBtn = root.querySelector('.merch-carousel-prev');
    var nextBtn = root.querySelector('.merch-carousel-next');

    if (images.length < 2) return;

    var current = images.findIndex(function (img) {
      return img.classList.contains('is-active');
    });
    if (current === -1) current = 0;

    var timer = null;

    function show(index) {
      images[current].classList.remove('is-active');
      current = (index + images.length) % images.length;
      images[current].classList.add('is-active');
    }

    function pickNextIndex() {
      if (images.length === 2) return current === 0 ? 1 : 0;
      var next;
      do {
        next = Math.floor(Math.random() * images.length);
      } while (next === current);
      return next;
    }

    function scheduleAutoplay() {
      clearTimeout(timer);
      timer = setTimeout(function () {
        show(pickNextIndex());
        scheduleAutoplay();
      }, randomDelay());
    }

    function stopAutoplay() {
      clearTimeout(timer);
      timer = null;
    }

    function manualNav(index) {
      // A manual click still shouldn't fight with a pending autoplay tick.
      stopAutoplay();
      show(index);
      scheduleAutoplay();
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function (e) {
        e.preventDefault();
        manualNav(current - 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function (e) {
        e.preventDefault();
        manualNav(current + 1);
      });
    }

    root.addEventListener('mouseenter', stopAutoplay);
    root.addEventListener('mouseleave', scheduleAutoplay);

    scheduleAutoplay();
  }

  function init() {
    document.querySelectorAll('.merch-carousel').forEach(initCarousel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
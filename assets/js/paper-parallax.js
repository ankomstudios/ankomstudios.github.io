// paper-parallax.js
//
// Builds three things, entirely from JS (no CSS edits needed to tune them):
//
//   1. A parallax "window" behind every h1.features sub-header (Animation
//      & Layers / Color & Painting / Import & Export Files) — the parallax
//      art (background-attachment:fixed, so it stays pinned to the
//      viewport exactly like the header art does) fills the whole heading
//      box, with the heading text floating directly over it, and torn
//      paper-edge strips framing just the top and bottom.
//
//   2. A solid, footer-colored backdrop sitting behind the existing
//      .paper-end-bottom (main white content's bottom edge), so the torn
//      edge there blends straight into the footer instead of showing the
//      film-decorator strip through it.
//
//   3. A floating "back to top" button, appended straight to <body>,
//      separate from the rest of the page.
//
// EDIT HERE to change strip heights or swap in new parallax art:
var PAPER_PARALLAX_CONFIG = {
  // Height (px) of the parallax "window" revealed at the top/bottom of
  // each sub-header, on normal and small screens.
  subheaderStripHeight: 32,
  subheaderStripHeightMobile: 18,
  mobileBreakpoint: 767, // px, matches the rest of the site's breakpoint

  // Parallax art shown behind the sub-header paper edges. Add more paths
  // here (one per sub-header, cycled in order) once new images exist —
  // for now they all reuse the header's own parallax image.
  parallaxImages: [
    'assets/images/paralaxBg.png'
  ],

  // Source of truth for each sub-header's content, one path per heading
  // in page order (Animation & Layers / Color & Painting / Import &
  // Export Files). Drop matching files in assets/images/text/ and they
  // take over automatically, centered in place of the text — until then
  // the file 404s quietly and the plain text keeps showing.
  subHeaderText: [
    'assets/images/text/animation-layers.png',
    'assets/images/text/color-painting.png',
    'assets/images/text/import-export.png'
  ],

  // Footer-matching backdrop behind the main content's bottom paper edge.
  // Height is read live from the --paper-end-h CSS variable so it always
  // matches how far .paper-end-bottom pokes out — no need to keep two
  // numbers in sync by hand.
  footerColor: '#2e3234',

  // "Back to top" button visibility threshold, in px scrolled. If null,
  // falls back to 1.3 * the current viewport height instead, which scales
  // better across phones/tablets/desktops.
  backToTopThresholdPx: null,
  backToTopViewportMultiplier: 1.3
};

(function () {
  'use strict';

  function currentStripHeight() {
    var isMobile = window.matchMedia('(max-width: ' + PAPER_PARALLAX_CONFIG.mobileBreakpoint + 'px)').matches;
    return isMobile
      ? PAPER_PARALLAX_CONFIG.subheaderStripHeightMobile
      : PAPER_PARALLAX_CONFIG.subheaderStripHeight;
  }

  function paperEndHeightPx() {
    var raw = getComputedStyle(document.documentElement).getPropertyValue('--paper-end-h');
    var n = parseFloat(raw);
    return isNaN(n) ? 56 : n;
  }

  // ---- 1. Sub-header parallax windows ------------------------------
  //
  // Each h1.features gets ONE parallax image spanning its whole box (so
  // the heading text floats directly over the art, not just a sliver at
  // the edges), plus two torn-paper strips that only frame the top and
  // bottom. Layering (back to front): parallax backdrop -> heading text
  // -> paper edge strips.

  var edgeEls = []; // top/bottom paper edge divs — kept around so resize can restyle them

  function buildBackdrop(image) {
    var backdrop = document.createElement('div');
    backdrop.className = 'paper-parallax-backdrop';
    backdrop.style.position = 'absolute';
    backdrop.style.inset = '0';
    backdrop.style.zIndex = '-1';
    backdrop.style.backgroundImage = "url('" + image + "')";
    backdrop.style.backgroundAttachment = 'fixed';
    backdrop.style.backgroundSize = 'cover';
    backdrop.style.backgroundPosition = 'center center';
    backdrop.style.pointerEvents = 'none';
    return backdrop;
  }

  function buildEdge(paperSrc, side) {
    var edge = document.createElement('div');
    edge.className = 'paper-parallax-edge';
    edge.style.position = 'absolute';
    edge.style.left = '0';
    edge.style.width = '100%';
    edge.style.height = currentStripHeight() + 'px';
    edge.style[side] = '0'; // 'top' or 'bottom'
    edge.style.zIndex = '2';
    edge.style.backgroundImage = "url('" + paperSrc + "')";
    edge.style.backgroundRepeat = 'no-repeat';
    edge.style.backgroundSize = '100% 100%';
    edge.style.filter = 'invert(var(--paper-invert))';
    // Flipped on the Y axis vs. the main content's top/bottom paper edges —
    // those two stay as-shipped, every sub-header edge gets mirrored.
    edge.style.transform = 'scaleY(-1)';
    edge.style.pointerEvents = 'none';
    edgeEls.push(edge);
    return edge;
  }

  // subHeaderText is the source of truth for each heading's content: if an
  // image exists at the given path, it replaces the plain text (centered,
  // same as the text is now). Until you upload real files there, the
  // <img> 404s silently and the original text just stays visible — so
  // this is safe to leave wired up ahead of time.
  function setupSubheaderText(el, idx) {
    var src = PAPER_PARALLAX_CONFIG.subHeaderText[idx];
    if (!src) return;

    // Pull the existing text node(s) out into a span so we can toggle
    // between "text" and "image" without losing the original content.
    var textSpan = document.createElement('span');
    textSpan.className = 'sub-header-text-fallback';
    var node = el.firstChild;
    while (node) {
      var next = node.nextSibling;
      if (node.nodeType === Node.TEXT_NODE) {
        textSpan.appendChild(node);
      }
      node = next;
    }
    el.insertBefore(textSpan, el.firstChild);

    var img = document.createElement('img');
    img.className = 'sub-header-text-image';
    img.alt = textSpan.textContent.trim();
    img.style.display = 'none';
    img.style.maxWidth = '90%';
    img.style.height = 'auto';
    img.style.verticalAlign = 'middle';
    img.onload = function () {
      textSpan.style.display = 'none';
      img.style.display = 'inline-block';
    };
    img.onerror = function () {
      img.remove(); // no file uploaded yet (or it failed) — keep showing text
    };
    el.insertBefore(img, textSpan);
    img.src = src; // set last so onload/onerror are wired up first
  }

  function setupSubheaders() {
    var headers = document.querySelectorAll('h1.features');
    headers.forEach(function (el, idx) {
      setupSubheaderText(el, idx);

      var image = PAPER_PARALLAX_CONFIG.parallaxImages[idx % PAPER_PARALLAX_CONFIG.parallaxImages.length];
      var stripH = currentStripHeight();

      el.style.position = 'relative';
      el.style.zIndex = '0'; // own stacking context so the backdrop's
                              // negative z-index stays contained in here
                              // instead of sinking below the page background
      el.style.paddingTop = (stripH + 10) + 'px';
      el.style.paddingBottom = (stripH + 10) + 'px';

      el.insertBefore(buildBackdrop(image), el.firstChild);
      el.appendChild(buildEdge('assets/images/paperEnd.png', 'top'));
      el.appendChild(buildEdge('assets/images/paperEnd2.png', 'bottom'));
    });
  }

  function resizeStrips() {
    var h = currentStripHeight();
    edgeEls.forEach(function (e) {
      e.style.height = h + 'px';
    });
    document.querySelectorAll('h1.features').forEach(function (el) {
      el.style.paddingTop = (h + 10) + 'px';
      el.style.paddingBottom = (h + 10) + 'px';
    });
  }

  // ---- 2. Footer-colored backdrop behind the bottom main-content edge ----
  //
  // Measures the actual gap between #content-wrapper's bottom edge and
  // #footer's top edge (normally the film-decorator strip) and sizes the
  // backdrop to bridge it exactly, instead of relying on margin-collapse
  // math to line two elements up — that left a hairline gap where a
  // sliver of the film-decorator's white strip peeked through.

  function setupFooterBackdrop() {
    var wrapper = document.getElementById('content-wrapper');
    var footer = document.getElementById('footer');
    var paperEndBottom = document.querySelector('.paper-end-bottom');
    if (!wrapper || !footer || !paperEndBottom) return;

    wrapper.style.position = wrapper.style.position || 'relative';

    var backdrop = document.createElement('div');
    backdrop.className = 'paper-parallax-footer-backdrop';
    backdrop.style.position = 'absolute';
    backdrop.style.left = '0';
    backdrop.style.width = '100%';
    backdrop.style.backgroundColor = PAPER_PARALLAX_CONFIG.footerColor;
    backdrop.style.zIndex = '1'; // under .paper-end-bottom (z-index 2)
    backdrop.style.pointerEvents = 'none';
    wrapper.appendChild(backdrop);

    function sync() {
      var edgeH = paperEndHeightPx();
      var wrapRect = wrapper.getBoundingClientRect();
      var footerRect = footer.getBoundingClientRect();
      var gapToFooter = Math.max(0, footerRect.top - wrapRect.bottom);
      backdrop.style.top = (wrapper.offsetHeight - edgeH) + 'px';
      // +4px buffer so rounding/subpixel layout never leaves a hairline gap.
      backdrop.style.height = (edgeH + gapToFooter + 4) + 'px';
    }

    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('load', sync);

    // resize/load alone miss it whenever a button click changes the
    // page's height without resizing the window (status text appearing,
    // a form growing, etc.) — that desyncs the backdrop's fixed top/height
    // from the real gap and lets the white page background show through
    // the paper edge. ResizeObserver catches every such case directly.
    if (window.ResizeObserver) {
      var observer = new ResizeObserver(sync);
      observer.observe(wrapper);
      observer.observe(footer);
    }
  }

  // ---- 3. Back to top button -----------------------------------------

  function setupBackToTop() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Back to top');
    btn.className = 'back-to-top-btn';
    btn.innerHTML = '<i class="fas fa-chevron-up" aria-hidden="true"></i>';

    Object.assign(btn.style, {
      position: 'fixed',
      right: '24px',
      bottom: '24px',
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      border: 'none',
      background: '#60ba60',
      color: '#ffffff',
      fontSize: '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0px 4px 16px rgba(0,0,0,0.35)',
      zIndex: '9999',
      opacity: '0',
      visibility: 'hidden',
      transform: 'translateY(12px)',
      transition: 'opacity 0.2s ease, transform 0.2s ease, background-color 0.15s ease',
      pointerEvents: 'none'
    });

    btn.addEventListener('mouseenter', function () {
      btn.style.background = '#50a050';
    });
    btn.addEventListener('mouseleave', function () {
      btn.style.background = '#60ba60';
    });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.body.appendChild(btn);

    function threshold() {
      if (PAPER_PARALLAX_CONFIG.backToTopThresholdPx != null) {
        return PAPER_PARALLAX_CONFIG.backToTopThresholdPx;
      }
      return window.innerHeight * PAPER_PARALLAX_CONFIG.backToTopViewportMultiplier;
    }

    function updateVisibility() {
      var visible = window.scrollY > threshold();
      btn.style.opacity = visible ? '1' : '0';
      btn.style.visibility = visible ? 'visible' : 'hidden';
      btn.style.transform = visible ? 'translateY(0)' : 'translateY(12px)';
      btn.style.pointerEvents = visible ? 'auto' : 'none';
    }

    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('resize', updateVisibility);
    updateVisibility();
  }

  // ---- init -------------------------------------------------------------

  function init() {
    setupSubheaders();
    setupFooterBackdrop();
    setupBackToTop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('resize', resizeStrips);
})();

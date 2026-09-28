// Makes the header logo tilt in 3D and lean toward the mouse cursor.
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var wrap = document.getElementById('headerLogoWrap');
    var header = document.querySelector('.header-inner');
    if (!wrap || !header) return;

    var maxTilt = 16; // degrees
    var currentX = 0, currentY = 0, targetX = 0, targetY = 0;
    var raf = null;

    function apply() {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      wrap.style.transform =
        'rotateX(' + currentX.toFixed(2) + 'deg) rotateY(' + currentY.toFixed(2) + 'deg) translateZ(10px)';
      if (Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05) {
        raf = requestAnimationFrame(apply);
      } else {
        raf = null;
      }
    }

    function startLoop() {
      if (!raf) raf = requestAnimationFrame(apply);
    }

    header.addEventListener('mousemove', function (e) {
      var rect = wrap.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dx = (e.clientX - cx) / (rect.width / 2 || 1);
      var dy = (e.clientY - cy) / (rect.height / 2 || 1);
      dx = Math.max(-1, Math.min(1, dx));
      dy = Math.max(-1, Math.min(1, dy));
      targetY = dx * maxTilt;   // left/right mouse movement -> rotate around Y
      targetX = -dy * maxTilt;  // up/down mouse movement -> rotate around X
      startLoop();
    });

    header.addEventListener('mouseleave', function () {
      targetX = 0;
      targetY = 0;
      startLoop();
    });
  });
})();

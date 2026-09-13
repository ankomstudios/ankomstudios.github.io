// Pulls build files from the R2 bucket (raw.ankomstudios.com) and saves them
// via a Blob instead of a plain <a href> — so clicking Download stays on
// ankomstudios.github.io instead of bouncing out to another host.
//
// Files aren't uploaded yet. Once a build exists, upload it to the R2 bucket
// at the path referenced by data-download-file (e.g.
// downloads/wannasmile-v0.9-windows.zip) via wrangler or rclone — see
// CLAUDE.md — it's reachable immediately, no build/publish delay.
(function () {
  var CDN_BASE = 'https://raw.ankomstudios.com';

  function cdnUrl(path) {
    return CDN_BASE + '/' + path;
  }

  document.querySelectorAll('[data-download-file]').forEach(function (btn) {
    var status = btn.closest('.download-card') && btn.closest('.download-card').querySelector('.download-status');

    btn.addEventListener('click', function () {
      var path = btn.getAttribute('data-download-file');
      var filename = path.split('/').pop();

      btn.disabled = true;
      if (status) {
        status.textContent = 'Downloading…';
        status.classList.remove('is-error');
      }

      fetch(cdnUrl(path))
        .then(function (res) {
          if (!res.ok) throw new Error('Build not found');
          return res.blob();
        })
        .then(function (blob) {
          var objectUrl = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = objectUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(objectUrl);
          if (status) status.textContent = '';
        })
        .catch(function () {
          if (status) {
            status.textContent = 'Build not available yet — check back soon!';
            status.classList.add('is-error');
          }
        })
        .finally(function () {
          btn.disabled = false;
        });
    });
  });
})();

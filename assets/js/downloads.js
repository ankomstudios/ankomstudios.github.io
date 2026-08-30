// Pulls build files through jsDelivr's GitHub CDN (fast, cached, CORS-enabled)
// and saves them via a Blob instead of a plain <a href> — so clicking Download
// stays on ankomstudios.github.io instead of bouncing out to github.com.
//
// Files aren't uploaded yet. Once a build exists, drop it in this repo at the
// path referenced by data-download-file (e.g. downloads/wannasmile-v0.9-windows.zip)
// and tag/push — jsDelivr picks it up from the branch named below within
// about 24h, or immediately if fetched with a specific commit/tag instead of
// a branch name. See https://www.jsdelivr.com/documentation#id-github
(function () {
  var GITHUB_REPO = 'ankomstudios/ankomstudios';
  var BRANCH = 'main';

  function cdnUrl(path) {
    return 'https://cdn.jsdelivr.net/gh/' + GITHUB_REPO + '@' + BRANCH + '/' + path;
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

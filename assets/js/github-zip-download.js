// Builds a downloadable .zip client-side from a public GitHub repo's
// current default-branch contents — for a download button that has no
// pre-built archive on R2 yet (see downloads.js), pulling the live
// source straight from GitHub's REST + raw-content APIs instead. Zips
// it in-browser with JSZip (loaded lazily, only if a
// [data-github-zip] button exists on the page) and saves it the same
// stay-on-this-domain way downloads.js does, via a Blob instead of a
// plain link out to github.com.
//
// Usage: <button data-github-zip="owner/repo" data-zip-filename="name.zip">
// inside a .download-card with a .download-status element, matching
// the markup downloads.js expects.
//
// Note: file listing and repo-info both hit api.github.com, which
// rate-limits unauthenticated requests to 60/hour per IP — shared by
// every visitor behind the same IP. Per-file content comes from
// raw.githubusercontent.com instead, which isn't subject to that
// limit.
(function () {
  var buttons = document.querySelectorAll('[data-github-zip]');
  if (!buttons.length) return;

  var JSZIP_SRC = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
  var jszipReady = null;

  function loadJSZip() {
    if (window.JSZip) return Promise.resolve();
    if (jszipReady) return jszipReady;
    jszipReady = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = JSZIP_SRC;
      script.onload = resolve;
      script.onerror = function () { reject(new Error('Failed to load zip tool')); };
      document.head.appendChild(script);
    });
    return jszipReady;
  }

  // Runs `tasks` (functions returning promises) with at most `limit`
  // in flight at once, so a few hundred file fetches don't all fire
  // at the same time.
  function runPool(tasks, limit, onProgress) {
    return new Promise(function (resolve, reject) {
      var next = 0, active = 0, done = 0, settled = false;

      function pump() {
        if (settled) return;
        if (done === tasks.length) { settled = true; resolve(); return; }
        while (active < limit && next < tasks.length) {
          (function (i) {
            active++;
            tasks[i]()
              .then(function () {
                active--; done++;
                if (onProgress) onProgress(done, tasks.length);
                pump();
              })
              .catch(function (err) {
                if (!settled) { settled = true; reject(err); }
              });
          })(next++);
        }
      }
      pump();
    });
  }

  buttons.forEach(function (btn) {
    var repo = btn.getAttribute('data-github-zip');
    var filename = btn.getAttribute('data-zip-filename') || (repo.split('/')[1] + '.zip');
    var card = btn.closest('.download-card');
    var status = card && card.querySelector('.download-status');

    btn.addEventListener('click', function () {
      btn.disabled = true;
      if (status) { status.textContent = 'Loading zip tool…'; status.classList.remove('is-error'); }

      var branch;

      loadJSZip()
        .then(function () {
          if (status) status.textContent = 'Looking up repo…';
          return fetch('https://api.github.com/repos/' + repo);
        })
        .then(function (res) {
          if (!res.ok) throw new Error('Could not reach GitHub');
          return res.json();
        })
        .then(function (info) {
          branch = info.default_branch;
          if (status) status.textContent = 'Fetching file list…';
          return fetch('https://api.github.com/repos/' + repo + '/git/trees/' + branch + '?recursive=1');
        })
        .then(function (res) {
          if (!res.ok) throw new Error('Could not list repo files');
          return res.json();
        })
        .then(function (tree) {
          if (tree.truncated) throw new Error('Repo too large to zip this way');
          var files = tree.tree.filter(function (entry) { return entry.type === 'blob'; });
          if (!files.length) throw new Error('No files found');

          var zip = new window.JSZip();
          var tasks = files.map(function (entry) {
            return function () {
              return fetch('https://raw.githubusercontent.com/' + repo + '/' + branch + '/' + entry.path)
                .then(function (res) {
                  if (!res.ok) throw new Error('Failed to fetch ' + entry.path);
                  return res.arrayBuffer();
                })
                .then(function (buf) {
                  zip.file(entry.path, buf);
                });
            };
          });

          return runPool(tasks, 8, function (done, total) {
            if (status) status.textContent = 'Downloading files… (' + done + '/' + total + ')';
          }).then(function () {
            if (status) status.textContent = 'Zipping…';
            return zip.generateAsync({ type: 'blob' });
          });
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
        .catch(function (err) {
          if (status) {
            status.textContent = (err && err.message) || 'Download failed — try again later.';
            status.classList.add('is-error');
          }
        })
        .finally(function () {
          btn.disabled = false;
        });
    });
  });
})();

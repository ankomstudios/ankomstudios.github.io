// Populates the "Updates & Changes" carousel (#updatesCarousel) from
// markdown files instead of hand-written HTML. assets/data/updates/
// holds one .md file per entry (YAML-ish frontmatter for title/by/
// version/date, then a markdown body) plus index.json listing which
// files to load and in what order — add a new release by dropping in
// a .md file and adding its name to index.json, no HTML editing.
// Markdown-to-HTML uses marked.js (loaded in index.html); if that
// script fails to load for some reason, falls back to plain escaped
// text so the page doesn't break.
(function () {
  var DATA_DIR = 'assets/data/updates/';
  var INDEX_URL = DATA_DIR + 'index.json';

  function parseEntry(raw) {
    var match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
    if (!match) return { meta: {}, body: raw };

    var meta = {};
    match[1].split(/\r?\n/).forEach(function (line) {
      var idx = line.indexOf(':');
      if (idx === -1) return;
      meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    });

    return { meta: meta, body: match[2].trim() };
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderMarkdown(md) {
    if (window.marked && typeof window.marked.parse === 'function') {
      return window.marked.parse(md);
    }
    // Fallback with no markdown library present: escape and turn
    // blank-line-separated chunks into paragraphs.
    return md
      .split(/\r?\n\r?\n/)
      .map(function (block) { return '<p>' + escapeHtml(block).replace(/\r?\n/g, '<br>') + '</p>'; })
      .join('');
  }

  function buildCard(entry) {
    var card = document.createElement('div');
    card.className = 'update-card';

    var title = document.createElement('p');
    title.className = 'update-card-title';
    title.textContent = entry.meta.title || 'Update';
    card.appendChild(title);

    var meta = document.createElement('div');
    meta.className = 'update-card-meta';
    if (entry.meta.by) {
      var by = document.createElement('span');
      by.className = 'update-card-by';
      by.textContent = 'by ' + entry.meta.by;
      meta.appendChild(by);
    }
    if (entry.meta.date) {
      var date = document.createElement('span');
      date.className = 'update-card-date';
      date.textContent = entry.meta.date;
      meta.appendChild(date);
    }
    card.appendChild(meta);

    var body = document.createElement('div');
    body.className = 'update-card-body';
    body.innerHTML = renderMarkdown(entry.body);
    card.appendChild(body);

    return card;
  }

  // Top-right header badge (per the revision plan) tracks whichever
  // entry the arrows currently have in view — mirrors the wraparound
  // math in assets/js/asset-carousel.js's own go(), which is safe
  // here since every .update-card is full-width (one per view).
  function initVersionBadge(root, entries) {
    var badge = document.getElementById('updatesVersionBadge');
    if (!badge || !entries.length) return;

    var index = 0;

    function render() {
      var version = entries[index].meta.version;
      badge.textContent = version ? 'v' + version : '';
    }

    var prevBtn = root.querySelector('.asset-carousel-prev');
    var nextBtn = root.querySelector('.asset-carousel-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        index = (index - 1 + entries.length) % entries.length;
        render();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        index = (index + 1) % entries.length;
        render();
      });
    }

    render();
  }

  function init() {
    var root = document.getElementById('updatesCarousel');
    var track = root && root.querySelector('.asset-carousel-track');
    if (!track) return;

    fetch(INDEX_URL)
      .then(function (res) { return res.json(); })
      .then(function (files) {
        return Promise.all(files.map(function (name) {
          return fetch(DATA_DIR + name)
            .then(function (res) { return res.text(); })
            .then(parseEntry);
        }));
      })
      .then(function (entries) {
        entries.forEach(function (entry) { track.appendChild(buildCard(entry)); });
        if (window.AssetCarousel) {
          window.AssetCarousel.initCarousel(root);
        }
        initVersionBadge(root, entries);
      })
      .catch(function (err) {
        console.error('updates-loader: failed to load changelog entries', err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

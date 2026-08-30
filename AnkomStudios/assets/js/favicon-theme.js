(function () {
  function setThemeImage(isDark, themeImage) {
    var image = document.querySelector('#theme-brand-icon');
    var themePath = isDark ? '/assets/images/darkFav.png' : '/assets/images/lightFav.png';

    if (themeImage) {
      themeImage.src = themePath;
    }

    if (image) {
      image.src = themePath;
    }
  }

  function setFavicon(isDark) {
    var link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'shortcut icon';
      document.head.appendChild(link);
    }
    link.href = isDark
      ? '/assets/images/darkFav.png'
      : '/assets/images/lightFav.png';
  }

  function setThemeClass(isDark) {
    document.documentElement.classList.toggle('theme-dark', isDark);
  }

  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  setFavicon(mq.matches);
  setThemeImage(mq.matches);
  setThemeClass(mq.matches);

  mq.addEventListener('change', function (e) {
    setFavicon(e.matches);
    setThemeImage(e.matches);
    setThemeClass(e.matches);
  });
})();

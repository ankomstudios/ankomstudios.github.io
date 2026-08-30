// Sign Up / Log In modal. Forms are wired to Supabase Auth
// (see assets/js/supabase-client.js) — no custom backend needed.
(function () {
  var overlay = document.getElementById('authOverlay');
  if (!overlay) return;

  var openBtn = document.querySelector('[data-auth-open]');
  var lastFocused = null;

  var title = document.getElementById('authModalTitle');
  var views = {
    signup: document.getElementById('authSignupView'),
    login: document.getElementById('authLoginView'),
  };

  function showView(name) {
    Object.keys(views).forEach(function (key) {
      if (views[key]) views[key].hidden = key !== name;
    });
    if (title) title.textContent = name === 'login' ? 'Log In' : 'Sign Up';
    var firstField = views[name] && views[name].querySelector('input');
    if (firstField) firstField.focus();
  }

  overlay.querySelectorAll('[data-auth-switch]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      showView(link.getAttribute('data-auth-switch'));
    });
  });

  function openModal() {
    lastFocused = document.activeElement;

    // Lock background scroll without letting the page shift sideways:
    // if the vertical scrollbar was taking up space, add that same
    // amount back as right padding before removing it.
    var scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = scrollbarWidth + 'px';
    }
    document.body.style.overflow = 'hidden';

    overlay.hidden = false;
    showView('signup');
  }

  function closeModal() {
    overlay.hidden = true;
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  if (openBtn) {
    openBtn.addEventListener('click', openModal);
  }

  overlay.addEventListener('click', function (e) {
    if (e.target.hasAttribute('data-auth-close')) closeModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !overlay.hidden) closeModal();
  });

  // Password show/hide toggle
  overlay.querySelectorAll('[data-auth-toggle-pw]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = document.getElementById(btn.getAttribute('data-auth-toggle-pw'));
      if (!input) return;
      var showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      btn.classList.toggle('is-visible', !showing);
    });
  });

  // Forms wired to Supabase Auth — signUp() sends its own verification
  // email (Authentication -> Email Templates in the Supabase dashboard),
  // signInWithPassword() blocks unverified accounts automatically.
  ['authLoginForm', 'authSignupForm'].forEach(function (id) {
    var form = document.getElementById(id);
    if (!form) return;

    var status = document.createElement('p');
    status.className = 'auth-status';
    form.appendChild(status);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.textContent = '';
      status.classList.remove('is-error');

      var email = form.querySelector('input[type="email"]').value;
      var password = form.querySelector('input[type="password"]').value;
      var isLogin = id === 'authLoginForm';

      var call = isLogin
        ? window.supabaseClient.auth.signInWithPassword({ email: email, password: password })
        : window.supabaseClient.auth.signUp({ email: email, password: password });

      call.then(function (result) {
        if (result.error) {
          status.textContent = result.error.message || 'Something went wrong.';
          status.classList.add('is-error');
          return;
        }
        status.textContent = isLogin
          ? 'Logged in.'
          : 'Account created. Check your email to verify it.';
        if (isLogin) {
          setTimeout(closeModal, 800);
        }
      });
    });
  });
})();
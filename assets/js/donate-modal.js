// Donate modal (/donate/ page): pick a preset amount or type a custom
// one, then "Donate" kicks off Stripe Checkout via a server endpoint
// (POST /api/create-donation-checkout) that doesn't exist yet — this
// file is written to work the moment that endpoint ships (it expects
// back { url: "https://checkout.stripe.com/..." } and redirects
// there), but until then it fails with a friendly status message
// instead of a silent broken button.
(function () {
  var openBtn = document.querySelector('[data-donate-open]');
  var overlay = document.getElementById('donateOverlay');
  if (!openBtn || !overlay) return;

  var amountButtons = Array.prototype.slice.call(overlay.querySelectorAll('.donate-amount-btn'));
  var customInput = document.getElementById('donateCustomAmount');
  var submitBtn = document.getElementById('donateSubmitBtn');
  var status = document.getElementById('donateStatus');
  var lastFocused = null;
  var selectedAmount = null;

  function setStatus(message, isError) {
    if (!status) return;
    status.textContent = message || '';
    status.classList.toggle('is-error', !!isError);
  }

  function selectAmount(amount) {
    selectedAmount = amount;
    amountButtons.forEach(function (btn) {
      btn.classList.toggle('is-selected', Number(btn.getAttribute('data-amount')) === amount);
    });
    if (customInput && amount !== null) customInput.value = '';
  }

  amountButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectAmount(Number(btn.getAttribute('data-amount')));
    });
  });

  if (customInput) {
    customInput.addEventListener('input', function () {
      amountButtons.forEach(function (btn) { btn.classList.remove('is-selected'); });
      var value = parseFloat(customInput.value);
      selectedAmount = value > 0 ? value : null;
    });
  }

  function openModal() {
    lastFocused = document.activeElement;
    selectAmount(null);
    setStatus('');

    var scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) document.body.style.paddingRight = scrollbarWidth + 'px';
    document.body.style.overflow = 'hidden';

    overlay.hidden = false;
  }

  function closeModal() {
    overlay.hidden = true;
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  openBtn.addEventListener('click', openModal);

  overlay.addEventListener('click', function (e) {
    if (e.target.hasAttribute('data-donate-close')) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !overlay.hidden) closeModal();
  });

  if (submitBtn) {
    submitBtn.addEventListener('click', function () {
      if (!selectedAmount || selectedAmount <= 0) {
        setStatus('Pick an amount first.', true);
        return;
      }

      setStatus('');
      submitBtn.disabled = true;

      fetch('/api/create-donation-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: selectedAmount }),
      })
        .then(function (res) {
          if (!res.ok) throw new Error('bad response');
          return res.json();
        })
        .then(function (data) {
          if (!data || !data.url) throw new Error('no checkout url');
          window.location.href = data.url;
        })
        .catch(function () {
          setStatus("Online donations aren't live yet — check back soon, or reach out on Discord in the meantime!", true);
          submitBtn.disabled = false;
        });
    });
  }
})();

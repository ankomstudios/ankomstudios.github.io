// Live "total raised" counter (/donate/ page). Reads a single-row
// table, public.donation_totals(id, total_cents), and subscribes to
// Postgres changes so the number updates live for anyone with the
// page open — no polling. See assets/data/sql/donation_totals.sql for
// the table + RLS policy this depends on (public can SELECT; nothing
// else can write to it directly — only a server-side process holding
// the Supabase service-role key, e.g. the Stripe webhook handler,
// should ever update it).
//
// Until that table exists (or a webhook has actually written to it),
// this just shows $0 — it fails quiet, not broken, since donations
// going live is a separate step from this page shipping.
(function () {
  if (!window.supabaseClient) return;

  var amountEl = document.getElementById('donationTotalAmount');
  if (!amountEl) return;

  var formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  function render(totalCents) {
    amountEl.textContent = formatter.format((totalCents || 0) / 100);
  }

  function fetchTotal() {
    window.supabaseClient
      .from('donation_totals')
      .select('total_cents')
      .eq('id', 1)
      .maybeSingle()
      .then(function (result) {
        if (result.error) {
          console.warn('donation-counter: could not read donation_totals (has the table been created yet?)', result.error.message);
          render(0);
          return;
        }
        render(result.data ? result.data.total_cents : 0);
      });
  }

  fetchTotal();

  window.supabaseClient
    .channel('donation-totals-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'donation_totals' },
      function (payload) {
        var row = payload.new;
        render(row ? row.total_cents : 0);
      }
    )
    .subscribe();
})();

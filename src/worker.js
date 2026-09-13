// Cloudflare Worker for ankomstudios.com. Handles the two Stripe-related
// API routes below, then falls through to serving the site's static
// files (env.ASSETS — see wrangler.jsonc's assets.binding) for
// everything else, so this doesn't change how the rest of the site is
// served.
//
// Required Worker secrets (set with `wrangler secret put <NAME>`,
// never committed to the repo or pasted in chat):
//   STRIPE_SECRET_KEY          sk_test_... (or sk_live_... once verified)
//   STRIPE_WEBHOOK_SECRET      whsec_... — from the Stripe Dashboard
//                              webhook endpoint pointing at
//                              https://<your-domain>/api/stripe-webhook
//   SUPABASE_SERVICE_ROLE_KEY  from Supabase → Project Settings → API
//                              (bypasses RLS — server-side only, this
//                              is the one credential that must never
//                              reach the browser)
//
// Non-secret config lives in wrangler.jsonc's "vars" (SUPABASE_URL).

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/api/create-donation-checkout') {
      return handleCreateCheckout(request, env);
    }
    if (request.method === 'POST' && url.pathname === '/api/stripe-webhook') {
      return handleStripeWebhook(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

// ---- Donate button -> Stripe Checkout ----

async function handleCreateCheckout(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const amount = Number(body && body.amount);
  if (!Number.isFinite(amount) || amount < 1 || amount > 10000) {
    return jsonResponse({ error: 'Amount must be between $1 and $10,000' }, 400);
  }

  if (!env.STRIPE_SECRET_KEY) {
    return jsonResponse({ error: 'Stripe is not configured yet' }, 501);
  }

  const amountCents = Math.round(amount * 100);
  const origin = new URL(request.url).origin;

  try {
    const session = await createCheckoutSession(env, amountCents, origin);
    return jsonResponse({ url: session.url });
  } catch (err) {
    return jsonResponse({ error: String((err && err.message) || err) }, 502);
  }
}

async function createCheckoutSession(env, amountCents, origin) {
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('submit_type', 'donate');
  params.set('line_items[0][price_data][currency]', 'usd');
  params.set('line_items[0][price_data][product_data][name]', 'Donation to Ankom Studios');
  params.set('line_items[0][price_data][unit_amount]', String(amountCents));
  params.set('line_items[0][quantity]', '1');
  params.set('success_url', origin + '/donate/?donated=1');
  params.set('cancel_url', origin + '/donate/?canceled=1');

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data.error && data.error.message) || 'Stripe error creating checkout session');
  }
  return data;
}

// ---- Stripe webhook -> Supabase donation_totals ----

async function handleStripeWebhook(request, env) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return new Response('Webhook not configured', { status: 501 });
  }

  const payload = await request.text();
  const sigHeader = request.headers.get('Stripe-Signature') || '';

  const valid = await verifyStripeSignature(payload, sigHeader, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    return new Response('Invalid signature', { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(payload);
  } catch (err) {
    return new Response('Invalid payload', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const amountTotal = session.amount_total; // cents
    if (amountTotal) {
      const ok = await incrementDonationTotal(env, amountTotal);
      // Non-2xx makes Stripe retry the webhook later instead of
      // silently losing a donation if Supabase hiccupped.
      if (!ok) return new Response('Failed to record donation', { status: 500 });
    }
  }

  return new Response('ok', { status: 200 });
}

async function verifyStripeSignature(payload, sigHeader, secret) {
  var parts = {};
  sigHeader.split(',').forEach(function (part) {
    var idx = part.indexOf('=');
    if (idx === -1) return;
    parts[part.slice(0, idx)] = part.slice(idx + 1);
  });

  var timestamp = parts.t;
  var signature = parts.v1;
  if (!timestamp || !signature) return false;

  // 5 minute tolerance guards against replay of an old captured request.
  var ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false;

  var key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  var signedPayload = timestamp + '.' + payload;
  var sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  var expectedHex = Array.prototype.map
    .call(new Uint8Array(sigBuffer), function (b) { return b.toString(16).padStart(2, '0'); })
    .join('');

  return timingSafeEqual(expectedHex, signature);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  var result = 0;
  for (var i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function incrementDonationTotal(env, amountCents) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    return false;
  }

  var res = await fetch(env.SUPABASE_URL + '/rest/v1/rpc/increment_donation_total', {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: amountCents }),
  });

  if (!res.ok) {
    console.error('Failed to increment donation total:', await res.text());
    return false;
  }
  return true;
}

// ---- helpers ----

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

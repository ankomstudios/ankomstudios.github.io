-- Run this once in the Supabase SQL editor (project njtosjlucqvevymjxsqb)
-- to back the live "Total Raised" counter on /donate/ and the Stripe
-- webhook handler that updates it (src/worker.js).
--
-- Single-row table holding the running total, in cents (avoids float
-- rounding on money). Publicly readable so the counter works for
-- anonymous visitors too; nothing is publicly writable directly —
-- updates only happen through the increment_donation_total() function
-- below, which only the service-role key can call.

create table if not exists public.donation_totals (
  id int primary key default 1,
  total_cents bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint donation_totals_singleton check (id = 1)
);

insert into public.donation_totals (id, total_cents)
values (1, 0)
on conflict (id) do nothing;

alter table public.donation_totals enable row level security;

create policy "Public can read the donation total"
  on public.donation_totals
  for select
  using (true);

-- Enable Realtime for this table so assets/js/donation-counter.js's
-- postgres_changes subscription actually fires on updates. If your
-- project already has a `supabase_realtime` publication (most do by
-- default), this just adds the table to it:
alter publication supabase_realtime add table public.donation_totals;

-- Atomic increment, called by the Stripe webhook handler (Cloudflare
-- Worker, src/worker.js) after a checkout.session.completed event —
-- avoids a read-then-write race if two donations complete close
-- together. SECURITY DEFINER so it can update the table despite RLS;
-- the revoke/grant below is what actually matters for security here —
-- Postgres grants EXECUTE on new functions to PUBLIC by default, which
-- would let anyone holding the anon key (i.e. anyone, it's public by
-- design) call this directly over the REST API and inflate the total
-- for free. Only the service-role key (used solely by the Worker,
-- never shipped to the browser) should be able to call it.
create or replace function public.increment_donation_total(amount bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.donation_totals
  set total_cents = total_cents + amount,
      updated_at = now()
  where id = 1;
$$;

revoke execute on function public.increment_donation_total(bigint) from public, anon, authenticated;
grant execute on function public.increment_donation_total(bigint) to service_role;

-- PROPOSAL ONLY. Not a migration. Do not apply to any hosted database.
-- FXM-005 Lane A. Director G3 approval has to name the environment before this
-- text is copied under supabase/migrations.
--
-- Does not rewrite historical leads.business_id.
-- Does not mark assigned_vendor_ids membership as accepted.
-- Does not grant anonymous SELECT on leads.

-- Live event_location is a single free-text column. Offered vendors must not
-- see a street. These two columns are the split the application types already use.
alter table public.leads
  add column if not exists event_city text,
  add column if not exists event_street text;

comment on column public.leads.event_city is
  'City or public venue safe for an offered marketplace summary. Never a private street.';
comment on column public.leads.event_street is
  'Street or precise address. Visible to a vendor only after that vendor accepts.';

create table public.vendor_lead_state (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  assignment_status text not null check (assignment_status in ('offered', 'accepted', 'declined', 'revoked', 'expired')),
  stage public.lead_stage not null default 'new',
  notes text,
  quote text,
  thread_id uuid,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, business_id)
);

create table public.vendor_lead_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null,
  lead_id uuid not null references public.leads(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  sender_role text not null,
  sender_user_id uuid,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.vendor_lead_assignment_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  command text not null check (command in ('offer', 'accept', 'decline', 'revoke', 'expire', 'reassign', 'map_legacy')),
  from_status text,
  to_status text not null,
  actor_kind text not null,
  created_at timestamptz not null default now()
);

-- unique (lead_id, business_id) is the one-row rule. Commands refuse a second
-- offered/accepted row for that pair. Declined, revoked, and expired stay on the same row.

alter table public.vendor_lead_state enable row level security;
alter table public.vendor_lead_messages enable row level security;
alter table public.vendor_lead_assignment_events enable row level security;

-- Vendors read only their own state row. They do not select the shared leads row
-- for a marketplace inquiry. Drop the wide matched-inquiry policy in the same
-- migration so assigned_vendor_ids cannot leak contact fields or shared notes.
--
-- drop policy if exists "owners read matched event inquiries" on public.leads;

create policy "owners read own vendor lead state"
  on public.vendor_lead_state for select
  using (public.owns_business(auth.uid(), business_id));

create policy "admins read vendor lead state"
  on public.vendor_lead_state for select
  using (public.is_admin(auth.uid()));

-- No vendor update of assignment_status. Stage, notes, and quote only while accepted.
create policy "accepted vendors update own crm"
  on public.vendor_lead_state for update
  using (public.owns_business(auth.uid(), business_id) and assignment_status = 'accepted')
  with check (public.owns_business(auth.uid(), business_id) and assignment_status = 'accepted');

create policy "owners read own accepted thread"
  on public.vendor_lead_messages for select
  using (
    public.owns_business(auth.uid(), business_id)
    and exists (
      select 1 from public.vendor_lead_state s
      where s.thread_id = vendor_lead_messages.thread_id
        and s.business_id = vendor_lead_messages.business_id
        and s.lead_id = vendor_lead_messages.lead_id
        and s.assignment_status = 'accepted'
    )
  );

create policy "admins read vendor messages"
  on public.vendor_lead_messages for select
  using (public.is_admin(auth.uid()));

create policy "admins read assignment events"
  on public.vendor_lead_assignment_events for select
  using (public.is_admin(auth.uid()));

-- Owners do not get a policy on assignment events or on other businesses' rows.
-- Anonymous role has no select grant on these tables or on leads.

-- Legacy slots become offered CRM shells. Do not set accepted, notes, quote, or thread.
-- Direct leads (business_id is not null) are not copied into this table.
insert into public.vendor_lead_state (lead_id, business_id, assignment_status, stage, notes, quote, thread_id)
select l.id, slot.business_id, 'offered', 'new', null, null, null
from public.leads l
cross join lateral unnest(l.assigned_vendor_ids) as slot(business_id)
where l.business_id is null
  and l.lead_type = 'event_inquiry'
  and not exists (
    select 1 from public.vendor_lead_state s
    where s.lead_id = l.id and s.business_id = slot.business_id
  );

-- Security-definer commands (sketch):
-- accept(lead, business): owner, offered -> accepted. This is the only unlock for customer columns.
-- decline(lead, business): owner, offered -> declined. Does not delete the lead or messages.
-- revoke(lead, business): admin, offered|accepted -> revoked.
-- expire(lead, business): admin or later expire-offers job, same privacy as revoke.
-- offer(lead, business): admin. Inserts offered, or reopens a declined|revoked|expired row. Refuses a second active row.
-- reassign(lead, from, to): admin. Revokes the active source row and offers the target. Writes two assignment events.
-- map_legacy(lead): admin. Same insert as above for that lead. Does not touch rows that already exist.
-- submit_direct_inquiry(payload) returns uuid. Replaces anonymous insert().select('id').
--   Grant execute to anon and authenticated. Do not add an anonymous select policy on leads.
-- Vendor-facing delete stays limited to leads.business_id = the owned direct lead.
-- There is no owner delete policy for marketplace rows (business_id is null).

-- Projection function returns allowlisted columns only.
-- Offered / declined / revoked / expired: event type, request type, date, times,
-- guest count, event_city, cuisine, budget, estimated_value, service style, frequency,
-- plus that vendor's own stage, notes, and quote.
-- Customer name, email, phone, message, event_street, event_zip, and legacy event_location
-- are returned only when assignment_status = 'accepted'.
-- admin_notes, other vendors' state, and the raw leads row are never returned to a vendor.

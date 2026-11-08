# FXM-005 per-vendor lead state

Proposal only. This is not a migration, not a production write, and not authorization to apply SQL. Production stays `https://foodxmobile.com` (`7314f8bd…`, Supabase `akhmgnjmhvvmprvnwusp`). Do not target `truckhub.lovable.app`.

The application types follow the Director's Lane A contract, including the 2026-11-08 about 2:20 PM CST location lock and the about 2:23 PM CST `estimated_value` amendment. No status union was renamed. Matching (FXM-006 / #19) and manual lead capture (FXM-015) stay type-only pointers. Preference defaults for a vendor with no saved row belong to FXM-006, not this change.

This is a mock contract plus a direct-lead compatibility adapter. Mock and client tests are not proof of deployed row-level security or of a real database. This draft does not claim head CI until a workflow run exists, and it does not repair live RLS.

## Integration scope

This is not a mock-only change. `OwnerLeads`, `OwnerMessages`, `Book.tsx`, and `BookFoodTruck.tsx` call `LeadDirectory`. `createSupabaseLeadDirectory` wraps the existing direct-lead insert, update, delete, and `submit_event_inquiry` RPC.

These constraints stay in force:

- The live Supabase adapter returns direct `business_id` leads only.
- It does not treat `assigned_vendor_ids` as permission to read a marketplace row.
- Marketplace commands (`offer`, `accept`, `decline`, `revoke`, `expire`, `reassign`, `mapLegacy`, and admin marketplace reads or mutations) throw `migration_required` until a named migration is authorized.
- New live writes do not add columns or statements beyond what production already does: the direct booking insert, owner updates of stage, internal notes, and estimated value, owner delete of a direct lead, and the existing marketplace RPC.
- `BookFoodTruck` still sends the previous `submit_event_inquiry` body: the form spread, `category_id` normalized, `consent: true`, and the honeypot removed.

## What the app does now

Owner Leads and Messages read `LeadDirectory`, not `leads.business_id OR assigned_vendor_ids`.

- The mock directory used by tests projects marketplace leads through `VendorLeadState`. Those tests do not prove hosted RLS.
- The Supabase directory, which the live owner pages use until a migration is approved, returns **direct** `business_id` rows only. It does not select marketplace rows and does not read `assigned_vendor_ids` as permission.

## Anonymous receipts

The helper returns `{ saved: true, id }` and nothing else. That shape is not proof of the locked receipt or read-denial boundary.

- `insert().select("id")` on the direct booking form is an existing compatibility hazard. Trimming the client response does not prove an anonymous caller cannot read the row.
- A later `submit_direct_inquiry` RPC is proposal-only and is not authorized.
- Mock and client-side tests are not proof of deployed row-level security.

The marketplace path still calls existing `submit_event_inquiry`, which already returns a uuid. The helper keeps only that id.

## Visibility

| Actor | Direct lead | Offered | Accepted | Declined, revoked, expired | Never assigned |
|---|---|---|---|---|---|
| Owning vendor | Own customer and CRM | Request summary only. Own empty CRM. No thread. | Customer fields, own stage, notes, quote, thread | Own notes and quote. No customer fields. No thread. | No row |
| Other vendor | No | No | No | No | No |
| Admin | Shared row and direct CRM | All of the above, labeled per vendor | Same | Same, including the closed thread | Shared row, no invented state |
| Anonymous | No | No | No | No | No |

Request summary: event or request type, date and time window, guest count, cuisine, budget range, service style, frequency, and `estimated_value` as shared customer budget. It is not a vendor quote and vendors cannot write it. A city or public venue is included only when it was stored separately from the street. Live `event_location` is never parsed into that field.

Customer fields, only after that vendor's `accept`: name, email, phone, message, `event_location` as the precise address, and `event_zip` as the postal code.

`assigned_vendor_ids` is not a read permission. Legacy slots stay invisible until an admin runs `mapLegacyAssignmentSlots`, which inserts `offered` rows with stage `new` and null notes, quote, and thread. Existing rows are not changed, so an accepted vendor is not rewritten and a slot is never silently marked accepted.

`(leadId, businessId)` is unique. A business has at most one active (`offered` or `accepted`) row per lead. Decline, revoke, and expire keep the row. Reassignment revokes the previous active row and either inserts a new `offered` row or reopens a terminal row for the target business. Notes on the closed row stay with that business. The new offer does not copy them and does not unlock customer fields. Assignment events record the transition.

Vendor delete of a marketplace lead is forbidden. Decline does not delete the shared inquiry or anyone's messages. Direct-lead delete still removes that one owned `business_id` row.

Owners cannot patch `assignmentStatus`. Commands are `accept`, `decline` (offered vendor, own row), `revoke` (admin), `expire` (admin or a later `expire-offers` job), and `offer` / `reassign` (admin).

## estimated_value (Director lock, 2026-11-08 about 2:23 PM CST)

On a marketplace inquiry (`business_id` null), `estimated_value` is shared customer budget. A vendor must not overwrite it. That vendor's price lives only on `VendorLeadState.quote` and may differ from the shared budget and from another vendor's quote.

On a direct lead (`business_id` set to one owner), that owner may update `estimated_value` as the deal estimate on a privately owned inquiry. This is the locked exception, not an extra permission. Direct leads do not get a `VendorLeadState` row. Their stage and internal notes stay on the historical lead row.

## Location columns (Director confirmation, 2026-11-08 about 2:20 PM CST)

Read-only catalog: `public.leads` has nullable text columns `event_location` and `event_zip`. It does not have `event_city` or `event_street`. `event_location` is one free-text field and may contain a private street.

Offered summaries do not use `event_location` as a city or public venue, and the app does not split that text to invent one. Until nullable `event_city` (or a public-venue column) and `event_street` exist and are populated separately, offered `publicLocation` stays null. `event_zip` stays hidden until that vendor accepts. After accept, that vendor may see `event_location` as the precise-address stand-in and `event_zip` as the postal code. Direct leads follow the same address mapping because the owner already sees customer fields.

Adding `event_city` and `event_street` stays proposal-only. It is not an authorized migration. `VendorLeadState` and the status unions are unchanged. The assignment-event list is the audit required to revoke a row instead of overwriting it. The proposal file is fully commented, so executing it is a no-op.

## Rollback, once a future migration exists

Drop `vendor_lead_assignment_events`, `vendor_lead_messages`, and `vendor_lead_state`. Restore the previous owner select policy only if the product still wants the old behavior. Do not rewrite historical `business_id` values; this design does not change them. No backfill marks a legacy slot accepted, so there is no accepted flag to undo.

## Future G2 work, not done by this draft

The proposal file stays fully commented. It does not repair live RLS. These items are still future design, not delivered here:

- UPDATE column-allowlist enforcement so an accepted vendor can write only `stage`, `notes`, and `quote` (column grants or a narrow RPC, not a broad UPDATE policy)
- replacement of the existing wide matched-lead SELECT policy `"owners read matched event inquiries"`
- anonymous grants and receipts without a general `SELECT` on `leads`
- a schema check that refuses `vendor_lead_state` rows for direct `business_id` leads
- transactional reassignment and a durable audit

SQL sketch: `docs/crm/FXM-005-vendor-lead-state.proposal.sql`.

# FXM-005 per-vendor lead state

Proposal only. This is not a migration, not a production write, and not authorization to apply SQL. Production stays `https://foodxmobile.com` (`7314f8bd…`, Supabase `akhmgnjmhvvmprvnwusp`). Do not target `truckhub.lovable.app`.

The application types follow the Director's Lane A contract as amended 2026-11-08 about 2:05 PM CST. No status union was renamed. Matching (FXM-006) and manual lead capture (FXM-015) are extension points only.

## What the app does now

Owner Leads and Messages read `LeadDirectory`, not `leads.business_id OR assigned_vendor_ids`.

- The mock directory used by tests projects marketplace leads through `VendorLeadState`.
- The Supabase directory, which the live owner pages use until a migration is approved, returns **direct** `business_id` rows only. It does not select marketplace rows, does not read `assigned_vendor_ids` as permission, and refuses offer, accept, revoke, expire, and reassign with `migration_required`.
- Anonymous submit returns `{ saved: true, id }` and nothing else. A later read by an anonymous actor is rejected. The marketplace path calls existing `submit_event_inquiry`, which already returns a uuid. The direct path still uses `insert().select("id")` so the current form can notify; the helper discards every column except `id`. That returning clause is a compatibility hazard and should be replaced by the proposed `submit_direct_inquiry` function so anonymous role never needs `SELECT` on `leads`.

## Visibility

| Actor | Direct lead | Offered | Accepted | Declined, revoked, expired | Never assigned |
|---|---|---|---|---|---|
| Owning vendor | Own customer and CRM | Request summary only. Own empty CRM. No thread. | Customer fields, own stage, notes, quote, thread | Own notes and quote. No customer fields. No thread. | No row |
| Other vendor | No | No | No | No | No |
| Admin | Shared row and direct CRM | All of the above, labeled per vendor | Same | Same, including the closed thread | Shared row, no invented state |
| Anonymous | No | No | No | No | No |

Request summary: event or request type, date and time window, guest count, city or public venue, cuisine, budget range, service style, frequency, and `estimated_value` as shared customer budget. It is not a vendor quote and vendors cannot write it.

Customer fields, only after that vendor's `accept`: name, email, phone, message, street, postal code.

`assigned_vendor_ids` is not a read permission. Legacy slots stay invisible until an admin runs `mapLegacyAssignmentSlots`, which inserts `offered` rows with stage `new` and null notes, quote, and thread. Existing rows are not changed, so an accepted vendor is not rewritten and a slot is never silently marked accepted.

`(leadId, businessId)` is unique. A business has at most one active (`offered` or `accepted`) row per lead. Decline, revoke, and expire keep the row. Reassignment revokes the previous active row and either inserts a new `offered` row or reopens a terminal row for the target business. Notes on the closed row stay with that business. The new offer does not copy them and does not unlock customer fields. Assignment events record the transition.

Vendor delete of a marketplace lead is forbidden. Decline does not delete the shared inquiry or anyone's messages. Direct-lead delete still removes that one owned `business_id` row.

Owners cannot patch `assignmentStatus`. Commands are `accept`, `decline` (offered vendor, own row), `revoke` (admin), `expire` (admin or a later `expire-offers` job), and `offer` / `reassign` (admin).

## Direct leads

Historical rows with `business_id` stay the source for stage, internal notes, and estimated value. A vendor-state row is not created for them and cannot replace their stage. Direct owners can still edit those three fields. Marketplace quotes live only on `VendorLeadState.quote`.

## Column the Director should confirm before migration

Live `leads.event_location` is one free-text field. The offered allowlist needs a city or public venue, and the accepted view needs the street the customer typed. The proposal adds nullable `event_city` and `event_street`. Until those exist, offered projections do **not** treat `event_location` as a public location, because it may be a street address. `event_zip` stays private until accept.

No other contract change is requested. `VendorLeadState` and the status unions are the Director's. The assignment-event list is the audit required to revoke a row instead of overwriting it.

## Rollback, once a future migration exists

Drop `vendor_lead_assignment_events`, `vendor_lead_messages`, and `vendor_lead_state`. Restore the previous owner select policy only if the product still wants the old behavior. Do not rewrite historical `business_id` values; this design does not change them. No backfill marks a legacy slot accepted, so there is no accepted flag to undo.

SQL sketch: `docs/crm/FXM-005-vendor-lead-state.proposal.sql`.

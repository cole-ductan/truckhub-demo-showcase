# Schema drift ledger

FXM-004 / [GitHub #17](https://github.com/cole-ductan/truckhub-demo-showcase/issues/17).  
Staging rules: [STAGING_AND_REGRESSION_PLAN.md](./STAGING_AND_REGRESSION_PLAN.md) ([GitHub #15](https://github.com/cole-ductan/truckhub-demo-showcase/issues/15)).  
The CRM lifecycle this ledger describes was already requested in [GitHub #11](https://github.com/cole-ductan/truckhub-demo-showcase/issues/11): complete, archive, and remove a CRM record without deleting the listing.  
Observed 2026-11-08. This ledger does not change production.

Code base: `main` `7314f8bd1cd506c4c697a41c60748f237a5ce157`.  
Production: https://foodxmobile.com against Supabase host `akhmgnjmhvvmprvnwusp`.  
Out of scope: https://truckhub.lovable.app.

## Expected versus observed

| Object | Expected by current code | Observed live (Phase 0) | In this repo |
|---|---|---|---|
| `business_outreach.crm_state` | `AdminOutreach.tsx` selects it and defaults a missing value to `active` | Column absent from the public column inventory | Generated `Database` types omit it. `supabase/migrations/20260607020000_workflow_polish_pass_3_backend.sql` adds it, together with unrelated claim and owner-assignment changes. That file is not evidence the column is live. |
| `set_business_outreach_crm_state(uuid, text)` | Outreach drawer calls it for active, completed, archived, and deleted | Absent from the public routine list | Same June 7 migration defines it. Generated `Functions` omit it. `update_business_outreach_pipeline` and `mark_business_ready_for_outreach` are in the generated types. |
| `completed_at`, `archived_at`, `deleted_at` on `business_outreach` | Set by the RPC above | Not reported as live columns | Defined only in that same wide migration. |
| `review_event_import` | Crawler-branch notes described it. Main `App.tsx` has no event-import screen. | Absent from the public routine list | No migration on `main` defines it. This ledger does not restore it. FXM-011 / GitHub #24 owns that later. |
| Business listing review | `/admin/listing-review` loads `draft` and `unclaimed` businesses, then drops rows whose outreach is `ready_to_contact` or later | Not the same thing as 219 pending event imports. Phase 0 did not publish a review-queue count. | Page title is now “Business listing review” and says it is not the event import queue. Sidebar label is “Listing review”. |
| Event import queue | No admin route on `main`. Table `event_import_queue` exists in types and in `20260625224822`. | 219 rows, all `pending_review`, `published_at` empty | Left untouched. |
| Lead totals | Admin dashboard counted `leads` rows and treated a failed read as an empty list | 6 leads = 5 direct + 1 marketplace row with null `business_id` and 2 assignment slots. Slots are not extra leads. | Scope helper reconciles direct and marketplace. Dashboard shows an alert instead of zero when the read fails. |
| Bookings | `OwnerBookings.tsx` reads lead stages `quote_sent`, `pending`, `booked`, `completed`. It does not read `bookings`. | `bookings` has 0 rows. Lead stages in the census were only `new` and `contacted`, so the lead-derived view can also be empty for a different reason. | Empty copy now says “No lead-stage bookings” and says the bookings table is a separate count. A failed lead query is an alert. |
| `assign_business_owner` | Generated types include the RPC | Body was not read in Phase 0. The June 7 migration's version writes `crm_state`. The June 6 version does not. | Do not assume the June 7 body is live. The proposal does not replace this function. If the column is absent, the live function cannot be writing `crm_state`. |

## Smallest reversible fix

Proposal only: `docs/proposals/fxm-004-business-outreach-crm-state.sql`.

It adds `crm_state` plus the three timestamps, a check constraint, an index, and `set_business_outreach_crm_state`. The function updates `business_outreach` and inserts one `business_outreach_activities` row. It does not `UPDATE` or `DELETE` `businesses`. Admin check stays inside the function. Execute is revoked from `PUBLIC` and `anon`.

The file is commented and labeled do not execute. There is no new file under `supabase/migrations`. Applying it, or replaying `20260607020000`, needs a G3 approval that names the database and the rollback. A separate paid staging database is **NOT approved**, so this branch does not apply the proposal anywhere.

`review_event_import` is omitted on purpose.

## Tests that lock the ledger

`npm test` covers:

- generated types omit `crm_state`, `set_business_outreach_crm_state`, and `review_event_import`
- `AdminOutreach.tsx` still selects and calls the missing CRM objects
- no migration on `main` mentions `review_event_import`
- the June 7 migration is wider than the proposal because it also alters `claim_requests`
- a local stub returns “does not exist” for the two absent RPCs and does not open a network URL
- an in-memory CRM transition archives a record and leaves the business id unchanged
- business listing review and the event import queue use different labels and different synthetic counts

# Schema drift ledger

FXM-004 / [GitHub #17](https://github.com/cole-ductan/truckhub-demo-showcase/issues/17).  
Staging rules: [STAGING_AND_REGRESSION_PLAN.md](./STAGING_AND_REGRESSION_PLAN.md) ([GitHub #15](https://github.com/cole-ductan/truckhub-demo-showcase/issues/15)).  
The CRM lifecycle this ledger describes was already requested in [GitHub #11](https://github.com/cole-ductan/truckhub-demo-showcase/issues/11): complete, archive, and remove a CRM record without deleting the listing.  
Observed 2026-11-08. This ledger does not change production.

Code base: `main` `7314f8bd1cd506c4c697a41c60748f237a5ce157`.  
Production: https://foodxmobile.com against Supabase host `akhmgnjmhvvmprvnwusp`.  
Out of scope: https://truckhub.lovable.app.

Catalog facts below come from the read-only metadata check on 2026-11-08 about 2:13 PM CST. That check read function, trigger, column, bucket, and `schema_migrations` names. It did not read customer rows.

## Expected versus observed

| ID | Object | Expected by current code or a GitHub file | Observed in the production catalog | In this repo |
|---|---|---|---|---|
| D-01 | `business_outreach.crm_state`, `completed_at`, `archived_at`, `deleted_at` | `AdminOutreach.tsx` selects `crm_state`. Pass-3 SQL adds all four columns. | All four absent. Live outreach columns are `business_id`, `outreach_status`, `priority`, `assigned_to`, `next_follow_up_at`, `last_contacted_at`, `preferred_contact_method`, `contact_attempt_count`, `source`, `created_at`, `updated_at`. | Generated `Database` types omit `crm_state`. Do not replay `20260607020000_workflow_polish_pass_3_backend.sql`. |
| D-02 | `set_business_outreach_crm_state(uuid, text)` | Outreach drawer calls it. | Absent. | Same pass-3 file defines it. Generated `Functions` omit it. Proposal stays commented under `docs/proposals/`. |
| D-03 | `review_event_import` | Open PR #13's crawler migration defines it. Main `App.tsx` has no event-import screen. | Absent. | No migration on `main` defines it. This ledger does not restore it. FXM-011 / GitHub #24 owns that later. |
| D-04 | Competing event-intake migration | [PR #13](https://github.com/cole-ductan/truckhub-demo-showcase/pull/13) is still open. It adds `supabase/migrations/20260625090000_event_crawler_intake.sql` on `feature/gcp-event-crawler-mvp`, including `event_sources`, `event_import_queue`, and `review_event_import()`. | `event_import_queue` already exists from the Lovable-applied intake migration. `review_event_import` does not. | `main` already has `20260625224822_bc285de2-bbdc-40cd-b0c6-06aa1185e556.sql` for the queue tables and does not define that RPC. PR #13 is a second intake line. Leave PR #13 open. Do not rebase, merge, or close it from this lane. |
| — | Business listing review | `/admin/listing-review` loads `draft` and `unclaimed` businesses, then drops rows whose outreach is `ready_to_contact` or later. The visible title is still "Review Queue". | Not the same thing as 219 pending event imports. Phase 0 did not publish a review-queue count. | The predicate is `isBusinessListingReviewEligible`. User-visible renames are not in this PR. |
| — | Event import queue | No admin route on `main`. Table exists in types and in `20260625224822`. | 219 rows, all `pending_review`, `published_at` empty. Catalog confirms the table. | Left untouched. |
| — | Lead totals | Admin dashboard counted `leads` rows and treated a failed read as an empty list. | 6 leads = 5 direct + 1 marketplace row with null `business_id` and 2 assignment slots. Slots are not extra leads. | Scope helper reconciles direct and marketplace. Dashboard shows an alert instead of zero when the read fails. |
| — | Bookings | `OwnerBookings.tsx` reads lead stages `quote_sent`, `pending`, `booked`, `completed`. It does not read `bookings`. | `bookings` has 0 rows. Lead stages in the census were only `new` and `contacted`. | A failed lead query is an alert. The empty sentence is still "No bookings here yet." The harness helper separates table rows from lead-stage rows without changing that sentence. |
| — | `assign_business_owner` | Generated types include the RPC. The June 7 file's version writes `crm_state` and updates `claim_requests`. The June 6 version does not write `crm_state`. | Present. Admin-only. Refuses archived listings. Sets `owner_id` and `listing_status = 'claimed_free'`. Upserts `business_outreach.outreach_status = 'claimed'` and writes a `status_changed` activity. It does not update `claim_requests`. | Do not replay the June 7 body. The proposal does not replace this function. |
| — | `claim_requests.requester_user_id` | Pass-3 SQL drops NOT NULL and uses `ON DELETE SET NULL`. | Nullable `uuid`. Foreign key `claim_requests_requester_user_id_fkey` uses `ON DELETE CASCADE`, not `SET NULL`. | Another reason not to replay pass 3. |
| — | Archive helpers | Pass-3 and later GitHub files define `enforce_archived_business_unpublished`, `archive_business_listing`, `reject_obvious_claim_email_typos`, `businesses_force_archived_unpublished`, and `businesses_block_implicit_archived_restore`. | All five absent. Triggers present on the checked tables are `trg_businesses_ensure_outreach_row`, `trg_businesses_touch`, `trg_business_outreach_touch`, and `claim_requests_touch_updated_at`. | Not part of the CRM-state proposal. |
| — | `business-assets` bucket | GitHub file `20260607023000_business_assets_storage.sql`. | Bucket `business-assets` exists and is public. That filename's version is not in `schema_migrations`. Policies were not re-checked. | Do not treat the storage file as fully verified. |
| — | `update_business_outreach_pipeline`, `mark_business_ready_for_outreach` | Present in generated `Functions` and in main migrations. | Not part of the catalog routine check. Do not mark them live. | Listed as `EXPECTED_BY_GENERATED_TYPES`, not as catalog-verified. |

`business_outreach` and `event_import_queue` are catalog-verified tables (`CATALOG_VERIFIED_LIVE_TABLES`).

## Applied migrations versus GitHub files

`supabase_migrations.schema_migrations` has 27 versions. They line up, two to three seconds earlier, with the 27 Lovable UUID-named files on `main` (for example repo `20260625224822_bc285de2-….sql` versus applied `20260625224820`).

None of the 15 GitHub-authored descriptive filenames match an applied version:

- `20260603170000_add_map_coordinates.sql`
- `20260603171000_seed_demo_map_coordinates.sql`
- `20260603172000_keep_map_pins_in_sync.sql`
- `20260603172100_scope_demo_map_helpers.sql`
- `20260604013000_sync_inventory_coordinates_to_live_map.sql`
- `20260604023500_harden_claim_workflow.sql`
- `20260604033000_lock_down_public_security_definer_execute.sql`
- `20260604034500_harden_outreach_crm.sql`
- `20260604041000_guard_ready_for_outreach_transition.sql`
- `20260604044500_allow_admin_business_insert.sql`
- `20260607020000_workflow_polish_pass_3_backend.sql`
- `20260607023000_business_assets_storage.sql`
- `20260607024500_public_archive_guards_and_email_validation.sql`
- `20260607030000_lock_archived_listings.sql`
- `20260608000000_workflow_polish_pass_3_review_fixes.sql`

Merging one of those files to `main` does not mean production applied it. `20260607020009` is applied and sits next to Lovable file `20260607020012_59e746ee-….sql`. It is not `20260607020000_workflow_polish_pass_3_backend.sql`, and the pass-3 outreach objects are still missing, so that applied version is not "pass 3 ran." Some effects of an unapplied filename can still exist by another path. The `business-assets` bucket is the clear example.

## Smallest reversible fix

Proposal only: `docs/proposals/fxm-004-business-outreach-crm-state.sql`. This is not F-1 applied. The statements stay commented. Do not execute them and do not copy them into `supabase/migrations`.

The forward text adds `crm_state` plus the three timestamps, a check constraint, an index, and `set_business_outreach_crm_state`. The function updates `business_outreach` and inserts one `business_outreach_activities` row. It does not `UPDATE` or `DELETE` `businesses`. Admin check stays inside the function. Execute is revoked from `PUBLIC` and `anon`.

Applying it, or replaying `20260607020000`, needs a G3 approval that names the database and the rollback. A separate paid staging database is **NOT approved**. This branch does not apply the proposal anywhere. Local Docker Supabase, migration replay, and real RLS/JWT tests are the next increment, not this pass.

`review_event_import` is omitted on purpose.

## Tests that lock the ledger

`npm test` covers:

- generated types omit `crm_state`, `set_business_outreach_crm_state`, and `review_event_import`
- `AdminOutreach.tsx` still selects and calls the missing CRM objects
- catalog-verified tables are only `business_outreach` and `event_import_queue`
- the two outreach RPCs above are expected by generated types, not catalog-verified
- no migration on `main` mentions `review_event_import`
- the 15 descriptive GitHub filenames are not in the recorded applied version list
- the June 7 migration is wider than the proposal because it also alters `claim_requests`
- a local stub returns "does not exist" for the two absent RPCs and does not open a network URL
- an in-memory CRM transition archives a record and leaves the business id unchanged
- business listing review eligibility stays draft or unclaimed, plus missing, `not_contacted`, or `researching` outreach
- the visible admin title remains "Review Queue"

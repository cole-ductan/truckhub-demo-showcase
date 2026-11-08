# Local ephemeral Supabase: migration replay + per-role JWT RLS

Generated: Sunday, November 8, 2026 at 2:47:58 PM CST
HEAD at run: `fc996b3c1a93f13998dbb3d6aece43c182daf706`
Label: local ephemeral Supabase: migration replay + per-role JWT RLS

This run used the Supabase CLI and Docker on the VM. The API host was `127.0.0.1`. It does not prove production RLS. GitHub #15 and #17 cannot close from this increment.

Production https://foodxmobile.com was not queried, not migrated, and not used as a test target. No hosted Supabase project was provisioned. `docs/proposals/fxm-004-business-outreach-crm-state.sql` was not executed. No file was added under `supabase/migrations`. PR #13 was not rebased, merged, or closed. `review_event_import` was not restored. The vendor-lead-state migration from PR #36 was not implemented.

The script does not read a .env file. Shell variables that already pointed at a hosted project were discarded before clients were created: none were set.
Migration files changed in this worktree versus HEAD: none.

## S5 replay

`supabase db reset --local --no-seed` exit 0.
Files: 42. Applied: 42.
Log: [s5-migration-replay.txt](./s5-migration-replay.txt).

- Host net.bridge.bridge-nf-call-iptables=0.
- Local schema_migrations has 42 versions after replay. 15 of those versions are the 15 descriptive GitHub filenames. 0 of the 27 recorded production version strings match a local version exactly. Production versions sit a few seconds earlier than the Lovable filenames, so an exact match is not expected. Local version rows are a replay record, not proof those filenames were applied on the hosted database.
- claim_requests.requester_user_id foreign key on the live-shaped baseline is SET NULL. The 2026-11-08 catalog recorded ON DELETE CASCADE. This shaper does not rewrite that constraint, so the replayed pass-3 SET NULL behavior remains. That residual is not a production change.
- assign_business_owner on the live-shaped baseline is present=true, mentions crm_state=true, mentions claim_requests=true. The catalog says the live function does not update claim_requests. This shaper does not replace the function body.
- Policies whose expression mentions account_status: 0. Suspension is not an RLS predicate in this replay.

### Files

| File | Version | Applied | Descriptive GitHub filename |
|---|---|---|---|
| 20260428163412_0de71e35-560d-4fbd-be58-ab9d1b7da317.sql | 20260428163412 | yes | no |
| 20260428163435_2c9b2301-fb55-4037-8acd-0e4cedd3099c.sql | 20260428163435 | yes | no |
| 20260428165025_9ddb53e2-2718-4838-bf4e-2fd6fa1b6e47.sql | 20260428165025 | yes | no |
| 20260428170428_a22ddb29-f55a-4840-b10c-d0333356d37a.sql | 20260428170428 | yes | no |
| 20260428191320_d1637dd9-1f9c-4757-9b0e-d4e7427c4053.sql | 20260428191320 | yes | no |
| 20260428203549_3ef1b70e-09e0-4409-96ab-5d9997c8248c.sql | 20260428203549 | yes | no |
| 20260428204711_5e5a6961-af30-4d8b-8756-379550114306.sql | 20260428204711 | yes | no |
| 20260507214443_3900d4be-a60e-4de9-84e3-60797d591dba.sql | 20260507214443 | yes | no |
| 20260508033451_93c74554-af38-48bc-99d0-2e656590fafe.sql | 20260508033451 | yes | no |
| 20260508043213_0e58a359-63bb-4cb9-9753-9819288b438f.sql | 20260508043213 | yes | no |
| 20260515223428_c8244c95-1a53-4249-91f7-dd64feec7c92.sql | 20260515223428 | yes | no |
| 20260603170000_add_map_coordinates.sql | 20260603170000 | yes | yes |
| 20260603171000_seed_demo_map_coordinates.sql | 20260603171000 | yes | yes |
| 20260603172000_keep_map_pins_in_sync.sql | 20260603172000 | yes | yes |
| 20260603172100_scope_demo_map_helpers.sql | 20260603172100 | yes | yes |
| 20260603203912_a724b2c1-00f1-48ab-a9ac-81228792a636.sql | 20260603203912 | yes | no |
| 20260603231612_c7a2ec97-4af1-464c-9d8f-ce0f9c719b87.sql | 20260603231612 | yes | no |
| 20260604013000_sync_inventory_coordinates_to_live_map.sql | 20260604013000 | yes | yes |
| 20260604013610_db13627d-c8cb-4e58-9833-73c5f1894546.sql | 20260604013610 | yes | no |
| 20260604015325_b426caae-9f67-4319-9213-96c91fe3292f.sql | 20260604015325 | yes | no |
| 20260604020813_6cea2fee-fdd2-440d-be01-57bfaf188105.sql | 20260604020813 | yes | no |
| 20260604023500_harden_claim_workflow.sql | 20260604023500 | yes | yes |
| 20260604024617_37e13721-94a4-412c-9557-e4c1c57bc3b9.sql | 20260604024617 | yes | no |
| 20260604030300_62992864-1e8c-48c2-bc49-e4ede1ba7cc2.sql | 20260604030300 | yes | no |
| 20260604033000_lock_down_public_security_definer_execute.sql | 20260604033000 | yes | yes |
| 20260604033627_2708f3c0-b318-48c2-9896-54a16ea10afe.sql | 20260604033627 | yes | no |
| 20260604034500_harden_outreach_crm.sql | 20260604034500 | yes | yes |
| 20260604041000_guard_ready_for_outreach_transition.sql | 20260604041000 | yes | yes |
| 20260604044500_allow_admin_business_insert.sql | 20260604044500 | yes | yes |
| 20260604073536_2797877a-7660-43b6-984a-75cc00b25941.sql | 20260604073536 | yes | no |
| 20260604074639_1d948751-6512-4c6d-925c-74678d663cfb.sql | 20260604074639 | yes | no |
| 20260606235746_4e644f64-65f5-4137-bb98-b59cca64c662.sql | 20260606235746 | yes | no |
| 20260607020000_workflow_polish_pass_3_backend.sql | 20260607020000 | yes | yes |
| 20260607020012_59e746ee-86d7-417a-9021-56b2b5d11ac3.sql | 20260607020012 | yes | no |
| 20260607023000_business_assets_storage.sql | 20260607023000 | yes | yes |
| 20260607024500_public_archive_guards_and_email_validation.sql | 20260607024500 | yes | yes |
| 20260607030000_lock_archived_listings.sql | 20260607030000 | yes | yes |
| 20260608000000_workflow_polish_pass_3_review_fixes.sql | 20260608000000 | yes | yes |
| 20260608203656_d63c8f60-76f2-4368-97cd-860c45663595.sql | 20260608203656 | yes | no |
| 20260609041233_4faec305-a932-4e0a-af13-dff22ef4f871.sql | 20260609041233 | yes | no |
| 20260609041308_388d8ef7-1126-43b6-bb77-2377d4d034be.sql | 20260609041308 | yes | no |
| 20260625224822_bc285de2-bbdc-40cd-b0c6-06aa1185e556.sql | 20260625224822 | yes | no |

## Baselines

Repo-shaped is the replay. Live-shaped starts from that database and runs `scripts/local-supabase/live-shape.sql`, which only drops objects the 2026-11-08 catalog confirmed absent. The public `business-assets` bucket is kept.

| Object | Repo-shaped | Live-shaped |
|---|---|---|
| business_outreach columns | archived_at, assigned_to, business_id, completed_at, contact_attempt_count, created_at, crm_state, deleted_at, last_contacted_at, next_follow_up_at, outreach_status, preferred_contact_method, priority, source, updated_at | assigned_to, business_id, contact_attempt_count, created_at, last_contacted_at, next_follow_up_at, outreach_status, preferred_contact_method, priority, source, updated_at |
| business-assets public | true | true |
| claim FK on delete | SET NULL | SET NULL |
| assign_business_owner mentions crm_state | true | true |

Matched lead policy on the live-shaped baseline:

```
((lead_type = 'event_inquiry'::text) AND (business_id IS NULL) AND (auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.owner_id = auth.uid()) AND (b.id = ANY (leads.assigned_vendor_ids))))))
```

## S6 role matrix

Real JWTs: anon key role `anon`, signed-in users role `authenticated`. The service role seeded rows and was not the caller for allow/deny cells.

Synthetic contacts use `@fxm-synthetic.test`. Businesses are North Pier Kitchen, Fox Lantern Bakery, Charlie Fixture Coffee, Declined Fixture Cart, and Revoked Fixture Cart. OWN-A and OWN-B are both in `assigned_vendor_ids` on one marketplace lead. Declined and revoked businesses are not in that array. ML-2 is assigned only to Charlie Fixture Coffee.

Cells: 192. Failed: 0. Deny cells that failed closed: 104. Deny cells that did not fail closed: 0.

### FXM-005 / #18

On the live-shaped baseline, OWN-A and OWN-B are both in assigned_vendor_ids for one marketplace lead and both SELECT the same stage and internal_notes. That is the known FXM-005 / #18 gap. Separate note bodies were stored as lead_messages because the table has no per-vendor note.
Confirmed: true.

This is a known gap. It is not a passing isolation result, and it was not patched in this branch.

### Mutation spot-check

Permissive policy `fxm_s7_mutation_leak_leads` made OWN-B read OWN-A's direct lead: true. After drop, the read failed closed again: true.

## Matrix

| Baseline | Role | Operation | Expect | Observed | Pass |
|---|---|---|---|---|---|
| repo-shaped | harness | supabase db reset --local | all migration files applied | 42 versions | pass |
| repo-shaped | harness | inspect service role claim | service_role | service_role | pass |
| repo-shaped | ANON | anon key role claim | anon | anon | pass |
| repo-shaped | ANON | select leads | deny | error: permission denied for function is_admin | pass |
| repo-shaped | ANON | select lead_messages | deny | error: permission denied for function is_admin | pass |
| repo-shaped | ANON | select business_outreach | deny | rows 0 | pass |
| repo-shaped | ANON | select claim_requests | deny | rows 0 | pass |
| repo-shaped | ANON | select event_import_queue | deny | rows 0 | pass |
| repo-shaped | ANON | select event_sources | deny | rows 0 | pass |
| repo-shaped | ANON | select vendor_lead_preferences | deny | error: permission denied for function owns_business | pass |
| repo-shaped | ANON | select owner_preferences | deny | error: permission denied for function owns_business | pass |
| repo-shaped | ANON | select user_roles | deny | error: permission denied for function is_admin | pass |
| repo-shaped | ANON | select archived business | deny | error: permission denied for function is_admin | pass |
| repo-shaped | ANON | select draft business | deny | error: permission denied for function is_admin | pass |
| repo-shaped | ANON | select published North Pier | finding: query aborts on is_admin EXECUTE | permission denied for function is_admin | pass |
| repo-shaped | ANON | insert direct lead | finding: insert aborts on is_admin EXECUTE | permission denied for function is_admin | pass |
| repo-shaped | ANON | read back inserted direct lead | deny | error: permission denied for function is_admin | pass |
| repo-shaped | ANON | submit_event_inquiry | allow | returned id | pass |
| repo-shaped | ANON | read back event inquiry | deny | error: permission denied for function is_admin | pass |
| repo-shaped | OWN-A | read own direct lead | allow | rows 1 | pass |
| repo-shaped | OWN-A | read OWN-B direct lead | deny | rows 0 | pass |
| repo-shaped | OWN-B | read own direct lead | allow | rows 1 | pass |
| repo-shaped | OWN-B | read OWN-A direct lead | deny | rows 0 | pass |
| repo-shaped | OWN-A | read OWN-B lead message | deny | rows 0 | pass |
| repo-shaped | OWN-B | read OWN-A lead message | deny | rows 0 | pass |
| repo-shaped | OWN-A | read own lead message | allow | rows 1 | pass |
| repo-shaped | OWN-A | update OWN-B business | deny | update rows 0; tagline=null | pass |
| repo-shaped | OWN-B | update OWN-A business | deny | rows 0 | pass |
| repo-shaped | OWN-A | update OWN-B menu | deny | rows 0 | pass |
| repo-shaped | OWN-B | update OWN-A menu | deny | rows 0 | pass |
| repo-shaped | OWN-A | read OWN-B private event | deny | rows 0 | pass |
| repo-shaped | OWN-B | read OWN-A private event | deny | rows 0 | pass |
| repo-shaped | OWN-A | read own private event | allow | rows 1 | pass |
| repo-shaped | ANON | read private event | deny | error: permission denied for function is_admin | pass |
| repo-shaped | OWN-B | read OWN-A vendor prefs | deny | rows 0 | pass |
| repo-shaped | OWN-A | read OWN-B vendor prefs | deny | rows 0 | pass |
| repo-shaped | OWN-A | read own vendor prefs | allow | rows 1 | pass |
| repo-shaped | OWN-B | read OWN-A owner prefs | deny | rows 0 | pass |
| repo-shaped | OWN-A | read OWN-B owner prefs | deny | rows 0 | pass |
| repo-shaped | OWN-A | update OWN-B saved location | deny | rows 0 | pass |
| repo-shaped | OWN-B | update OWN-A saved location | deny | rows 0 | pass |
| repo-shaped | OWN-A | read shared marketplace lead | allow | rows 1 | pass |
| repo-shaped | OWN-B | read shared marketplace lead | allow | rows 1 | pass |
| repo-shaped | OWN-A/OWN-B | read shared leads.stage and internal_notes | known #18 gap if both accepted owners see the same values | both see stage=quote_sent | pass |
| repo-shaped | OWN-A/OWN-B | read per-vendor lead_messages on the shared lead | record visibility; other vendor body must not be returned | A=[] B=[] | pass |
| repo-shaped | OWN-A | update marketplace internal_notes | deny write | update closed=true; note remains shared=true | pass |
| repo-shaped | DECLINED | read marketplace lead | deny | rows 0 | pass |
| repo-shaped | REVOKED | read marketplace lead | deny | rows 0 | pass |
| repo-shaped | DECLINED | read North Pier note message | deny | rows 0 | pass |
| repo-shaped | DECLINED | read Fox Lantern note message | deny | rows 0 | pass |
| repo-shaped | REVOKED | read North Pier note message | deny | rows 0 | pass |
| repo-shaped | REVOKED | read Fox Lantern note message | deny | rows 0 | pass |
| repo-shaped | OWN-C | read ML-1 | deny | rows 0 | pass |
| repo-shaped | OWN-C | read ML-2 | allow | rows 1 | pass |
| repo-shaped | OWN-A | read ML-2 | deny | rows 0 | pass |
| repo-shaped | OWN-B | read ML-2 | deny | rows 0 | pass |
| repo-shaped | CLM | read leads | deny | rows 0 | pass |
| repo-shaped | CLM | read vendor prefs | deny | rows 0 | pass |
| repo-shaped | CLM | read outreach | deny | rows 0 | pass |
| repo-shaped | suspended | select leads | observation only; RLS does not consult account_status | rows 0 | pass |
| repo-shaped | ADM | read both direct leads | allow | rows 2 | pass |
| repo-shaped | ADM | read marketplace lead | allow | rows 1 | pass |
| repo-shaped | ADM | read outreach | allow | rows 1 | pass |
| repo-shaped | OWN-A | read outreach | deny | rows 0 | pass |
| repo-shaped | OWN-B | read outreach | deny | rows 0 | pass |
| repo-shaped | ADM | read event import | allow | rows 1 | pass |
| repo-shaped | OWN-A | read event import | deny | rows 0 | pass |
| repo-shaped | OWN-A | read event sources | deny | rows 0 | pass |
| repo-shaped | ADM | read one row per live outreach_status | not_contacted,researching,ready_to_contact,contacted,follow_up_needed,interested,claim_invited,claimed,not_interested,do_not_contact | claim_invited,claimed,contacted,do_not_contact,follow_up_needed,interested,not_contacted,not_interested,ready_to_contact,researching | pass |
| repo-shaped | ADM | select crm_state | allow | rows 1 | pass |
| repo-shaped | OWN-A | select crm_state | deny | rows 0 | pass |
| repo-shaped | OWN-A | set_business_outreach_crm_state | deny | admin only | pass |
| repo-shaped | ANON | set_business_outreach_crm_state | deny | admin only | pass |
| repo-shaped | ADM | set_business_outreach_crm_state | allow on ephemeral data | returned row | pass |
| repo-shaped | ADM | review_event_import | function does not exist | Could not find the function public.review_event_import(_decision, _extra, _id, _notes) in the schema cache | pass |
| repo-shaped | OWN-A | approve_claim_request | deny | admin only | pass |
| repo-shaped | ADM | approve_claim_request missing id | admin guard allows the call and the row is not found | claim request not found | pass |
| repo-shaped | OWN-A | archive_business_listing | deny | admin only | pass |
| repo-shaped | CLM | insert own claim | allow | inserted | pass |
| repo-shaped | CLM | read own claim | allow | rows 1 | pass |
| repo-shaped | OWN-A | read claimant claim | deny | rows 0 | pass |
| repo-shaped | ANON | read claims after insert | deny | rows 0 | pass |
| repo-shaped | CLM | insert claim with .con email | trigger rejects | That email domain looks mistyped. Please review and correct the email address. | pass |
| repo-shaped | harness | routine set_business_outreach_crm_state | present after replay | present | pass |
| live-shaped | harness | routine set_business_outreach_crm_state | absent | absent | pass |
| repo-shaped | harness | routine enforce_archived_business_unpublished | present after replay | present | pass |
| live-shaped | harness | routine enforce_archived_business_unpublished | absent | absent | pass |
| repo-shaped | harness | routine archive_business_listing | present after replay | present | pass |
| live-shaped | harness | routine archive_business_listing | absent | absent | pass |
| repo-shaped | harness | routine reject_obvious_claim_email_typos | present after replay | present | pass |
| live-shaped | harness | routine reject_obvious_claim_email_typos | absent | absent | pass |
| repo-shaped | harness | routine prevent_implicit_archived_business_restore | present after replay | present | pass |
| live-shaped | harness | routine prevent_implicit_archived_business_restore | absent | absent | pass |
| repo-shaped | harness | routine review_event_import | absent on main replay | absent | pass |
| live-shaped | harness | routine review_event_import | absent | absent | pass |
| repo-shaped | harness | business_outreach.crm_state | present | present | pass |
| live-shaped | harness | business_outreach.crm_state | absent | absent | pass |
| repo-shaped | harness | business_outreach.completed_at | present | present | pass |
| live-shaped | harness | business_outreach.completed_at | absent | absent | pass |
| repo-shaped | harness | business_outreach.archived_at | present | present | pass |
| live-shaped | harness | business_outreach.archived_at | absent | absent | pass |
| repo-shaped | harness | business_outreach.deleted_at | present | present | pass |
| live-shaped | harness | business_outreach.deleted_at | absent | absent | pass |
| live-shaped | harness | businesses_force_archived_unpublished | absent | absent | pass |
| live-shaped | harness | businesses_block_implicit_archived_restore | absent | absent | pass |
| live-shaped | harness | claim_requests_reject_obvious_email_typos | absent | absent | pass |
| repo-shaped | harness | storage.buckets business-assets | present and public | public=true | pass |
| repo-shaped | harness | review_event_import | absent | absent | pass |
| live-shaped | harness | storage.buckets business-assets | present and public | public=true | pass |
| live-shaped | harness | review_event_import | absent | absent | pass |
| live-shaped | ANON | select leads | deny | error: permission denied for function is_admin | pass |
| live-shaped | ANON | select lead_messages | deny | error: permission denied for function is_admin | pass |
| live-shaped | ANON | select business_outreach | deny | rows 0 | pass |
| live-shaped | ANON | select claim_requests | deny | rows 0 | pass |
| live-shaped | ANON | select event_import_queue | deny | rows 0 | pass |
| live-shaped | ANON | select event_sources | deny | rows 0 | pass |
| live-shaped | ANON | select vendor_lead_preferences | deny | error: permission denied for function owns_business | pass |
| live-shaped | ANON | select owner_preferences | deny | error: permission denied for function owns_business | pass |
| live-shaped | ANON | select user_roles | deny | error: permission denied for function is_admin | pass |
| live-shaped | ANON | select archived business | deny | error: permission denied for function is_admin | pass |
| live-shaped | ANON | select draft business | deny | error: permission denied for function is_admin | pass |
| live-shaped | ANON | select published North Pier | finding: query aborts on is_admin EXECUTE | permission denied for function is_admin | pass |
| live-shaped | ANON | insert direct lead | finding: insert aborts on is_admin EXECUTE | permission denied for function is_admin | pass |
| live-shaped | ANON | read back inserted direct lead | deny | error: permission denied for function is_admin | pass |
| live-shaped | ANON | submit_event_inquiry | allow | returned id | pass |
| live-shaped | ANON | read back event inquiry | deny | error: permission denied for function is_admin | pass |
| live-shaped | OWN-A | read own direct lead | allow | rows 1 | pass |
| live-shaped | OWN-A | read OWN-B direct lead | deny | rows 0 | pass |
| live-shaped | OWN-B | read own direct lead | allow | rows 1 | pass |
| live-shaped | OWN-B | read OWN-A direct lead | deny | rows 0 | pass |
| live-shaped | OWN-A | read OWN-B lead message | deny | rows 0 | pass |
| live-shaped | OWN-B | read OWN-A lead message | deny | rows 0 | pass |
| live-shaped | OWN-A | read own lead message | allow | rows 1 | pass |
| live-shaped | OWN-A | update OWN-B business | deny | update rows 0; tagline=null | pass |
| live-shaped | OWN-B | update OWN-A business | deny | rows 0 | pass |
| live-shaped | OWN-A | update OWN-B menu | deny | rows 0 | pass |
| live-shaped | OWN-B | update OWN-A menu | deny | rows 0 | pass |
| live-shaped | OWN-A | read OWN-B private event | deny | rows 0 | pass |
| live-shaped | OWN-B | read OWN-A private event | deny | rows 0 | pass |
| live-shaped | OWN-A | read own private event | allow | rows 1 | pass |
| live-shaped | ANON | read private event | deny | error: permission denied for function is_admin | pass |
| live-shaped | OWN-B | read OWN-A vendor prefs | deny | rows 0 | pass |
| live-shaped | OWN-A | read OWN-B vendor prefs | deny | rows 0 | pass |
| live-shaped | OWN-A | read own vendor prefs | allow | rows 1 | pass |
| live-shaped | OWN-B | read OWN-A owner prefs | deny | rows 0 | pass |
| live-shaped | OWN-A | read OWN-B owner prefs | deny | rows 0 | pass |
| live-shaped | OWN-A | update OWN-B saved location | deny | rows 0 | pass |
| live-shaped | OWN-B | update OWN-A saved location | deny | rows 0 | pass |
| live-shaped | OWN-A | read shared marketplace lead | allow | rows 1 | pass |
| live-shaped | OWN-B | read shared marketplace lead | allow | rows 1 | pass |
| live-shaped | OWN-A/OWN-B | read shared leads.stage and internal_notes | known #18 gap if both accepted owners see the same values | both see stage=quote_sent | pass |
| live-shaped | OWN-A/OWN-B | read per-vendor lead_messages on the shared lead | record visibility; other vendor body must not be returned | A=[] B=[] | pass |
| live-shaped | OWN-A | update marketplace internal_notes | deny write | update closed=true; note remains shared=true | pass |
| live-shaped | DECLINED | read marketplace lead | deny | rows 0 | pass |
| live-shaped | REVOKED | read marketplace lead | deny | rows 0 | pass |
| live-shaped | DECLINED | read North Pier note message | deny | rows 0 | pass |
| live-shaped | DECLINED | read Fox Lantern note message | deny | rows 0 | pass |
| live-shaped | REVOKED | read North Pier note message | deny | rows 0 | pass |
| live-shaped | REVOKED | read Fox Lantern note message | deny | rows 0 | pass |
| live-shaped | OWN-C | read ML-1 | deny | rows 0 | pass |
| live-shaped | OWN-C | read ML-2 | allow | rows 1 | pass |
| live-shaped | OWN-A | read ML-2 | deny | rows 0 | pass |
| live-shaped | OWN-B | read ML-2 | deny | rows 0 | pass |
| live-shaped | CLM | read leads | deny | rows 0 | pass |
| live-shaped | CLM | read vendor prefs | deny | rows 0 | pass |
| live-shaped | CLM | read outreach | deny | rows 0 | pass |
| live-shaped | suspended | select leads | observation only; RLS does not consult account_status | rows 0 | pass |
| live-shaped | ADM | read both direct leads | allow | rows 2 | pass |
| live-shaped | ADM | read marketplace lead | allow | rows 1 | pass |
| live-shaped | ADM | read outreach | allow | rows 1 | pass |
| live-shaped | OWN-A | read outreach | deny | rows 0 | pass |
| live-shaped | OWN-B | read outreach | deny | rows 0 | pass |
| live-shaped | ADM | read event import | allow | rows 1 | pass |
| live-shaped | OWN-A | read event import | deny | rows 0 | pass |
| live-shaped | OWN-A | read event sources | deny | rows 0 | pass |
| live-shaped | ADM | read one row per live outreach_status | not_contacted,researching,ready_to_contact,contacted,follow_up_needed,interested,claim_invited,claimed,not_interested,do_not_contact | claim_invited,claimed,contacted,do_not_contact,follow_up_needed,interested,not_contacted,not_interested,ready_to_contact,researching | pass |
| live-shaped | ADM | select crm_state | error, not an empty success | column business_outreach.crm_state does not exist | pass |
| live-shaped | ADM | set_business_outreach_crm_state | function does not exist | Could not find the function public.set_business_outreach_crm_state(_business_id, _crm_state) in the schema cache | pass |
| live-shaped | OWN-A | set_business_outreach_crm_state | function does not exist | Could not find the function public.set_business_outreach_crm_state(_business_id, _crm_state) in the schema cache | pass |
| live-shaped | ANON | set_business_outreach_crm_state | function does not exist | Could not find the function public.set_business_outreach_crm_state(_business_id, _crm_state) in the schema cache | pass |
| live-shaped | ADM | review_event_import | function does not exist | Could not find the function public.review_event_import(_decision, _extra, _id, _notes) in the schema cache | pass |
| live-shaped | OWN-A | approve_claim_request | deny | admin only | pass |
| live-shaped | ADM | approve_claim_request missing id | admin guard allows the call and the row is not found | claim request not found | pass |
| live-shaped | ADM | archive_business_listing | function does not exist | Could not find the function public.archive_business_listing(_business_id) in the schema cache | pass |
| live-shaped | CLM | read own claim | allow | rows 1 | pass |
| live-shaped | OWN-A | read claimant claim | deny | rows 0 | pass |
| live-shaped | ANON | read claims after insert | deny | rows 0 | pass |
| live-shaped | CLM | insert claim with .con email | trigger absent, insert succeeds | inserted | pass |
| live-shaped | ANON | upload business-assets | deny | new row violates row-level security policy | pass |
| live-shaped | OWN-B | upload into OWN-A prefix | deny | new row violates row-level security policy | pass |
| live-shaped | OWN-A | upload into own prefix | allow | uploaded | pass |
| live-shaped | OWN-B | temporary permissive lead policy | negative test fails open, then closes again | open=true; restored=true | pass |

## What this does not prove

- Production RLS on the hosted database was not executed.
- F-1 was not applied, including on the local live-shaped database.
- Admin and owner screens were not browser-tested against this database.
- GitHub Actions for this repo runs `npm test` only. Docker-in-GitHub-Actions was not added. If that runner cannot start Docker, this VM log is the S5/S6 evidence.
- #15 and #17 cannot close.

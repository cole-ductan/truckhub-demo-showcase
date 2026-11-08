# Staging and baseline regression plan

Status: proposal for FXM-002 / [GitHub #15](https://github.com/cole-ductan/truckhub-demo-showcase/issues/15) and the test half of FXM-004 / [GitHub #17](https://github.com/cole-ductan/truckhub-demo-showcase/issues/17).  
Related CRM lifecycle work already tracked in [GitHub #11](https://github.com/cole-ductan/truckhub-demo-showcase/issues/11).  
This document does not approve a database, a deploy, a migration, or any message to a business.

## Branch base

Feature branches for this work start from `main` at `7314f8bd1cd506c4c697a41c60748f237a5ce157` (“Added crawler intake tables”). That commit is the GitHub `main` tip and the commit marker served by https://foodxmobile.com.

Do not start this QA work from `feature/gcp-event-crawler-mvp` (`4e29f39341f597057a5530e4dda37b19c235d691`). That branch is later than `main` and holds the crawler worker. It is not the live site, and it is the wrong base for admin CRM drift tests. FXM-010 still has to reconcile that branch before crawler changes.

## What this environment is

Production is https://foodxmobile.com, deployment `02375315-0d81-481b-9278-809ade0c6026`, talking to Supabase host `akhmgnjmhvvmprvnwusp`. https://truckhub.lovable.app is a different project and must not be opened, changed, or used as a staging target.

A separate paid staging database is **NOT approved**. This plan does not clone production, restore a backup into a new project, reset a database, or seed live rows. Until a later approval names a staging project, regression evidence comes from:

- `npm test`, which runs Vitest with no hosted credentials
- synthetic fixtures in `src/test/fixtures/syntheticWorld.ts`
- mocked Supabase clients in component tests
- the Phase 0 census in `src/lib/qa/phase0Audit.ts`, stored as an audit observation

The harness points `VITE_SUPABASE_URL` at `http://127.0.0.1:59999` and uses the placeholder key `fxm-test-publishable-placeholder`. Tests fail if a hosted Supabase URL or a JWT-shaped key is loaded. Do not put service-role keys, customer records, or owner passwords in the repo, the workflow, or this document.

## Synthetic fixtures

The fixture world is labeled `source: "synthetic"` and `importable: true`. It is not a copy of production.

| Actor | Id | What the tests check |
|---|---|---|
| Anonymous customer | no user id | Public discovery is allowed. Lead contact fields and vendor notes are hidden. `/admin` and `/owner` redirect to auth. |
| Admin | `synth-admin` | Can read every lead, can edit assignment, and is the only role allowed to call the outreach CRM RPC. |
| Owner A, North Pier Kitchen | `synth-owner-a` / `synth-biz-north-pier` | Owns one direct booked lead. Accepted on the marketplace inquiry, with a note Owner B cannot see. |
| Owner B, Fox Lantern Bakery | `synth-owner-b` / `synth-biz-fox-lantern` | Owns a different direct lead. Also accepted on the same marketplace inquiry, with a separate note. |
| Declined vendor | `synth-owner-declined` / `synth-biz-declined-cart` | Assignment status `declined`. No customer fields and no assignment notes. |
| Revoked vendor | `synth-owner-revoked` / `synth-biz-revoked-cart` | Assignment status `revoked`. No customer fields and no assignment notes. |
| Suspended owner | `synth-owner-suspended` | Owner route resolves to suspended. Customer fields stay hidden. |

Matched vendors: North Pier Kitchen and Fox Lantern Bakery are both `accepted` on `synth-lead-marketplace`.  
Unmatched vendor: `synth-biz-unmatched-cart` is a published demo listing with no owner and no marketplace slot.

Contacts use `@fxm-synthetic.test` only. Names are Ada Fixture, Ben Fixture, and Casey Fixture. The fixture set is not the Phase 0 census (8 businesses, 3 leads, 3 event-import rows, 0 bookings-table rows). A helper, `datasetMayBeSeeded`, rejects the audit object.

The current owner screens still filter `leads.business_id`. Tests lock that behavior: both accepted owners miss the null-business marketplace lead. A separate privacy helper records the rule those screens do not implement yet: an accepted vendor may see that inquiry and only that vendor's note. Declined, revoked, and unmatched vendors may not. These helpers do not execute RLS.

## Phase 0 counts are observations

Observed 2026-11-08 against the production database. Do not import these numbers as rows.

| Scope | Observed |
|---|---|
| Businesses, all | 9 |
| Published / unpublished | 7 / 2 |
| Demo / non-demo | 6 / 3 |
| Published demo / published non-demo | 6 / 1 |
| Businesses with an owner | 2 |
| Leads, all | 6 |
| Direct leads | 5 (4 demo, 1 non-demo) |
| Marketplace lead with null `business_id` | 1, with 2 assignment slots on that same row |
| Bookings table | 0 |
| Event import queue | 219, all `pending_review`, none published |
| Outreach rows | 9 (6 `not_contacted`, 3 `claimed`) |
| Business events / vendor lead preferences / claim requests / lead messages / deposit requests / event sources | 10 / 0 / 3 / 2 / 0 / 2 |

Business listing review was not given a single Phase 0 count. Do not invent one from the outreach total or from the 219 event-import rows. Those are different queues. See `docs/SCHEMA_DRIFT_LEDGER.md`.

Zero bookings-table rows do not mean the owner Bookings screen is empty. That screen lists leads in Quote Sent, Pending, Booked, or Completed. The synthetic world keeps the table empty and still has one booked lead. `describeBookingsSurface` records that split. The owner screen still says "No bookings here yet." Visible copy that distinguishes the two counts is outside this pull request.

## Count scopes the harness reconciles

`countScopes` computes these from one synthetic world:

- all businesses, and demo versus non-demo
- published versus unpublished
- active: published and not archived
- business listing review: `draft` or `unclaimed`, and outreach missing, `not_contacted`, or `researching`
- outreach records, plus the handoff subset at `ready_to_contact` or later (including `claimed`)
- direct leads versus marketplace leads (`business_id` null)
- bookings table rows versus lead-derived booking stages
- event import queue versus pending event imports

Invariants: demo + non-demo = all, published + unpublished = all, active is not larger than published, direct + marketplace = all leads. Review count and event-import count come from different arrays and stay labeled apart (`Business listing review` versus `Event import queue`).

## Query errors

Failed reads must not render as zero or as “nothing here.”

- `classifyQuery` / `countFromQuery` return an error when `error` is set, even if `count` is 0.
- `QueryStateNotice` renders `role="alert"` for a failure and a quiet note for an empty success.
- Admin dashboard, business listing review, outreach CRM, and owner Bookings use that split.
- Outreach still toasts the PostgREST message. The page no longer also shows an empty CRM list or a live total of zero for that failure.
- A missing `crm_state` column is the expected live failure shape. The test stubs it locally. Nothing in the suite calls foodxmobile.com or the production API.

## CI

`.github/workflows/baseline-regression.yml` runs `npm ci` and `npm test` on pull requests and on `cursor/**` branches. The job has no secrets and no Supabase CLI step. `src/test/example.test.ts` is still the old placeholder; the files under `src/test/qa/` are the baseline suite.

Local command: `npm test`. It does not need production credentials.

## Backup, access, and rollback

- No new backup is taken here. Production backups stay with the hosted Supabase project. This branch does not download or restore them.
- Rollback for this change is reverting the pull request. No migration is applied, so there is no database rollback to run.
- Access for the harness is a local or CI Node process. It does not sign in as a production admin, owner, or customer.
- The only SQL in this branch is `docs/proposals/fxm-004-business-outreach-crm-state.sql`. The file says do not execute. It is commented so running it as a script does not alter a database. Applying it later needs a G3 approval that names the environment, the change, and the rollback section in that file.
- Provisioning a separate paid staging database is **NOT approved**.
- Do not send email or SMS. Do not contact businesses. Do not deploy. Do not merge this branch to `main` as part of the QA setup.

## What is still not proven

Authenticated production clicks, GCP Cloud Run ownership, email delivery, and a real staging project are out of scope. The privacy helper is an assumption the current owner queries do not satisfy; FXM-005 / GitHub #18 owns that behavior change. `review_event_import` stays absent until FXM-011 / GitHub #24.

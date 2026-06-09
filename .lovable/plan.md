
# FoodXMobile Claim Intake + Owner Provisioning + Admin Users Rebuild

This is a large multi-phase patch. Below is the scoped plan. I'll execute phases sequentially after approval, then deliver the QA checklist.

## Phase 1 — Inspect & preserve
Audit existing tables (`claim_requests`, `businesses`, `profiles`, `user_roles`), RLS, RPCs (`approve_claim_request`, `claim_business`, etc.), admin pages (`AdminClaimRequests`, `AdminUsers`), and owner routes. Reuse — do not duplicate. Report any conflicts before replacing.

## Phase 2 — Schema migration
- Extend `claim_requests`:
  - Make `requester_user_id` nullable (already is).
  - Add: `preferred_contact_method` (text), `best_contact_time` (text), `claimant_message` (text), `approved_owner_user_id` (uuid), `authorized_confirmed` (bool).
  - Extend `claim_request_status` enum with: `submitted`, `contacted`, `awaiting_verification`, `archived`. Map legacy `pending` → `submitted` in app code (keep enum value to avoid breaking history).
- Add `claim_activities` table (id, claim_id, action_type, note, performed_by, created_at) with admin-only RLS.
- Extend `profiles`: `must_change_password bool default false`, `account_status text default 'active'` (active/invited/suspended), `phone` if missing, `preferred_contact_method`, `admin_notes`.
- Add `admin_account_audit` table for account actions (no plaintext passwords ever).
- RLS:
  - `claim_requests` INSERT: allow `anon` for eligible unclaimed/published businesses (no requester_user_id required).
  - SELECT/UPDATE: admin only (keep existing owner self-view of approved claims).
  - GRANT INSERT to `anon` on claim_requests; SELECT/UPDATE/DELETE to admins via existing policies.

## Phase 3 — Edge functions (admin-only, JWT + has_role check)
Create/extend functions using service role:
- `admin-create-owner-from-claim` — generates temp pw via `crypto`, creates auth user (email_confirm=true), upserts profile (`must_change_password=true`, `account_status='invited'`), assigns role `owner`, sets `businesses.owner_id`, marks claim approved, logs audit, sends onboarding email. Handles "email already exists" (link existing, don't overwrite pw) and "listing already owned" (require `force_replace` flag).
- `admin-resend-onboarding` — regenerates temp pw, updates user via admin API, sets `must_change_password=true`, sends email.
- `admin-send-password-reset` — triggers `resetPasswordForEmail` server-side.
- `admin-update-user-email` — admin API update + audit.
- `admin-suspend-user` / `admin-reactivate-user` — toggles `account_status`.
- `admin-assign-business` / `admin-remove-business-access` — toggles `businesses.owner_id` (single-owner model preserved; multi-owner not introduced in this patch — flagged as conflict).
- Reuse existing `delete-account` for delete.
- Onboarding email: use existing transactional email infra if scaffolded; otherwise inline branded HTML via `send-transactional-email` if available — will detect and adapt during Phase 3.

## Phase 4 — Public claim form
- New route `/food-trucks/:slug/claim` (replaces existing `/claim/:businessSlug` auth-gated flow).
- Anonymous form: name, role, email, phone, preferred contact (email/phone/text), best time, message, authorized checkbox.
- Submits via direct `supabase.from('claim_requests').insert(...)` as anon (new RLS allows).
- Success state with "Return to Listing" CTA. No auth, no redirect.
- Update `TruckProfile` "Claim This Listing" CTA to new route.

## Phase 5 — Admin claims dashboard
Update existing `AdminClaimRequests` + add detail page `/admin/claim-requests/:id`:
- Row: listing, claimant name/email/phone, preferred method, status, dates.
- Detail: listing summary + links, claimant details, internal notes, activity log, status actions (contacted, awaiting_verification, more_info, approve, deny, withdraw, archive), approved-state panel with owner link.

## Phase 6 — Approve & create owner modal
On claim detail, "Approve Claim & Create Owner Account" modal:
- Owner name/email (editable), business (locked), tier (claimed_free default), generated temp pw with regen/show/copy, send-email + force-change checkboxes.
- Handles existing-email and existing-owner edge cases with explicit admin confirmation.
- Temp pw shown only in modal + email, never stored.

## Phase 7 — Admin Users profile pages
- Make rows in `AdminUsers` clickable → `/admin/users/:userId`.
- Profile page sections: header, contact info (editable), roles + assigned businesses (clickable) + linked claims, account actions (reset pw, resend onboarding, change email, suspend/reactivate, delete), audit history from `admin_account_audit`.
- Show account_status badges in list.

## Phase 8 — First-login password gate
- New page `/owner/set-password`.
- `OwnerLayout` guard: if `profile.must_change_password=true` → redirect; if `account_status='suspended'` → block with message; if no business owned → block.
- Submitting calls `supabase.auth.updateUser({password})` then sets `must_change_password=false`.

## Phase 9 — Remove old claimant flow
- Delete `/owner/claims` route + `OwnerClaims.tsx` + sidebar link.
- Delete old `/claim/:businessSlug` route (replaced).
- Remove `claim_business` direct-claim RPC call sites (keep RPC for now; flagged as unused).
- Remove auth requirement from claim CTA.

## Phase 10 — Onboarding email
Branded HTML via existing transactional email infra (will scaffold if missing). Variables: owner_name, owner_login_url (`/auth`), owner_email, temporary_password, support_email.

## Phase 11 — Legacy cleanup
Owner guard blocks unapproved legacy claimants (no owned business → blocked). Admin can find/suspend/delete via Users page.

## Phase 12 — QA checklist
Delivered as final message with the checklist from the spec + summary of migrations, functions, routes added/removed.

## Notable architectural decisions / flagged conflicts
1. **Multi-owner support**: current schema uses `businesses.owner_id` (single FK). The spec says "preserve multi-business owner support" (one user → many businesses ✓ already supported) but Phase 6 mentions "add another authorized owner" (many users → one business). This would require a new `business_owners` join table — **out of scope for this patch** unless you confirm. I'll implement single-owner with "replace" option only; "add another owner" will show a "not yet supported" notice.
2. **Existing `claim_business` RPC** (demo direct-claim) and `submit_new_business_request` (creates business + claim for signed-in user) — preserved, not part of this flow.
3. **Onboarding email**: will check if transactional email infra exists; if not, will scaffold it (one-time setup). Requires email domain — if absent will surface setup dialog.
4. **Temp password**: 16-char crypto-random, shown in modal once + emailed. Never stored.

## Execution
Phases run sequentially. Database migration first (requires your approval), then edge functions + frontend in batches. Estimated ~15-20 file changes + 1 migration + 6-8 edge functions.

Approve to proceed, or tell me which phases to skip/modify (e.g. defer email infra, skip multi-owner question).

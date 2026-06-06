# Workflow Polish Pass 2

Scope is large but tightly bounded: no Checkpoint D, no Stripe PR changes. Below is the full plan, grouped so each chunk lands cleanly.

## 1. Reviewed new-business submission flow

**Migration (single new file):**
- RPC `public.submit_new_business_request(_name text, _slug text, _category_id uuid, _phone text, _requester_name text, _requester_email text, _requester_phone text)`
  - `SECURITY DEFINER`, requires `auth.uid()`
  - Validate name, normalize/validate slug (re-uses slug rules, rejects `/` and unsafe chars), enforce unique slug
  - Reject if requester already has an active (`pending` / `more_info_requested`) submission for this slug, OR a duplicate active submission tied to (requester, name)
  - Insert `businesses` row: `owner_id=null`, `listing_status='draft'`, `is_published=false`, name, slug, optional category, optional phone, `is_demo=false`
  - Insert `claim_requests` row: `business_id`, `requester_user_id=auth.uid()`, requester name/email/phone, `relationship_to_business='creator'`, `verification_notes='New business submission for admin review.'`, `status='pending'`
  - Upsert `business_admin_metadata`: `outreach_email = requester_email`, append `[YYYY-MM-DD] New business submitted for admin review` to `internal_notes`
  - Upsert `business_outreach` (the existing `ensure_business_outreach_row` trigger will have run on insert; this call updates `source='self_submitted'`, `outreach_status='not_contacted'`)
  - Insert `business_outreach_activities` row: `activity_type='status_changed'`, `summary='New business submitted for admin review'`
  - `GRANT EXECUTE ... TO authenticated`
- Loosen the existing `users insert own claim requests` policy to also accept `listing_status='draft'` (the RPC is `SECURITY DEFINER` so policy doesn't gate the insert, but keep it consistent for resubmission).

**Frontend (`src/components/owner/Onboarding.tsx`):**
- Replace direct `businesses` insert with `supabase.rpc('submit_new_business_request', {...})`
- Capture: business name, slug (auto from name, normalize on blur), category, phone, requester name (default to profile display name), requester email (default to `user.email`), optional requester phone, optional relationship note
- On success: toast "Submitted for admin review", `navigate('/owner/claims')`
- Keep demo-claim block unchanged (demo only)

**Owner routing:**
- Existing `useOwnerBusiness` returns nothing until `owner_id` is set, so operational pages stay locked. Verify `OwnerLayout` redirects unowned users to onboarding/claims; add a small banner-friendly empty state on `/owner/claims` referencing the new submission.

## 2. Claim-request deep-link status

- `AdminBusinesses.tsx` claim badges: add `&status=pending|more_info_requested|approved` to existing `/admin/claim-requests?biz=...` links.
- `AdminClaimRequests.tsx`:
  - On mount, read `status` from `useSearchParams`, set initial `filter`
  - When `biz` is set and the chosen filter yields zero rows, auto-pick the first status that has rows for that biz; if none, fall back to `all`.
  - Keep tab clicks updating the URL via `setParams` so deep links stay stable.

## 3. Admin Businesses table clarity + sortable columns

`src/pages/admin/AdminBusinesses.tsx`:
- Column rename: header "Listing" → "Lifecycle"; header "Status" → "Public visibility" with two labels only: `Published` / `Unpublished` (no Draft). Keep Featured column.
- Add click-to-sort on: Business, Owner, Claims, City, Category, Lifecycle, Public visibility, Leads, Updated. Use a small `SortableTh` helper, asc/desc chevron from lucide. Sort is in-memory over already-fetched rows.

## 4. Admin owner assignment

**Migration:**
- RPC `assign_business_owner(_business_id uuid, _user_id uuid)`:
  - admin only
  - reject if `listing_status='archived'`
  - reject if business already has same owner (no-op success ok)
  - set `owner_id=_user_id`, `listing_status='claimed_free'`
  - upsert `business_outreach` to `outreach_status='claimed'`
  - insert `business_outreach_activities` `status_changed` summary "Owner assigned by admin"
  - leave claim history intact (do NOT auto-deny pending claims; admin can handle)
  - `GRANT EXECUTE TO authenticated`
- RPC `remove_business_owner(_business_id uuid)` (admin only): clears `owner_id`, sets `listing_status='unclaimed'`, logs activity. Use this if not already present so UI refresh is consistent.

**Frontend:**
- Admin Businesses detail sheet: add "Assign owner" with searchable user picker (query `profiles` by `display_name` ilike + show id). On submit call RPC, refresh row + sheet.
- Keep existing Remove owner; after success re-fetch list + sheet so the change is visible.

## 5. Safe listing deletion (Danger Zone)

**Migration:**
- RPC `delete_unlinked_business(_business_id uuid)`:
  - admin only
  - require: `owner_id IS NULL`, no `claim_requests` in (`pending`,`more_info_requested`,`approved`), no `leads`, no `deposit_requests`
  - on failure raise message: "Listing has linked records. Archive instead."
  - on success delete dependent rows (`business_admin_metadata`, `business_outreach`, `business_outreach_activities`, `business_photos`, `business_subcategories`, `business_events`, `menu_items`, `menu_categories`, `saved_locations`, `owner_preferences`, denied/withdrawn `claim_requests`) then the business
  - `GRANT EXECUTE TO authenticated`

**Frontend (`AdminBusinessEdit.tsx`):** add bottom Danger Zone card with:
- Archive listing (sets `listing_status='archived'`, `is_published=false`)
- Delete permanently (AlertDialog confirm → RPC; show server message on failure)

## 6. Slug UX

Update both `Onboarding.tsx` and `AdminBusinessNew.tsx`:
- Allow free typing in the slug input (no per-keystroke `slugify`)
- Normalize on blur and at submit
- Reject `/`, whitespace, and unsafe URL chars at submit with a clear toast
- Show final URL preview `foodxmobile.com/food-trucks/<normalized>`
- Add `normalizeSlug` helper in `src/lib/listingStatus.ts` (or new util) used everywhere

## 7. Demo tour visibility

`src/components/demo/DemoLauncher.tsx` (and any header mount): only render when
- `new URLSearchParams(location.search).get('demo') === '1'`, OR
- `localStorage.getItem('fxm.demo_mode') === '1'` (set by Demo Tools)
Admin layout: stop auto-mounting unless one of those conditions holds.

## 8. Owner editor focus-loss fix

`OwnerProfile.tsx` (Truck Page editor sheet):
- Stop closing on visibility/blur. Audit any `useEffect` watching `document.visibilitychange`, `window.blur`, `onOpenChange` that depends on focus state — remove that coupling.
- Track `isDirty` against initial snapshot; show "Unsaved changes" pill.
- Sheet `onOpenChange`: if closing while dirty, show confirm dialog before actually closing.
- Add `beforeunload` warning while dirty.

## 9. Image URL preview + validation

In owner and admin business editors (`OwnerProfile.tsx`, `AdminBusinessEdit.tsx`):
- Small preview thumbnail next to `hero_image_url` and `logo_url`
- Track load error per field; show "Image failed to load. Use a direct HTTPS image URL." helper text
- Skip validation when value starts with `asset:` (bundled assets)
- Note in UI: "Storage uploads coming soon"

## 10. Verification

- `tsc --noEmit` + production build via harness
- Report: migration file path, new RPCs, grants, files changed, behavior notes per area above

## Technical details (for reviewer)

- Migration file: `supabase/migrations/<ts>_workflow_polish_pass_2.sql` containing all four new RPCs + grants. No table schema changes.
- All new RPCs are `SECURITY DEFINER` with `set search_path = public` and explicit `GRANT EXECUTE TO authenticated`.
- `submit_new_business_request` relies on existing `ensure_business_outreach_row` trigger; afterwards updates `source` + `outreach_status` to keep exactly one outreach row.
- Sort state stored in component via `useState<{key, dir}>`; rows sorted with a stable comparator.
- User picker queries `profiles` with `select id, display_name` + `ilike` filter, limit 20.
- No edits to `src/integrations/supabase/{client,types}.ts`, `.env`, `supabase/config.toml`.

Stopping after Pass 2. Will not touch Stripe PR or start Checkpoint D.

# Hierarchical Categories Refactor

Move TruckHub from a flat `business_categories` table to a parent/child category tree with multi-select specialties per truck.

## 1. Database (single migration)

Reuse the existing `business_categories` table (it already has `name, slug, emoji, sort_order, is_active`) and extend it rather than creating a parallel `food_categories` table — this preserves existing data and FK references on `businesses.category_id`.

Changes:
- `business_categories`: add `parent_id uuid references business_categories(id) on delete cascade` (nullable). Add index on `parent_id`.
- `businesses`: keep `category_id` as the **primary category** (rename intent only — no column rename to avoid breaking generated types/code in flight). Add validation comment.
- New pivot `business_subcategories`:
  - `id uuid pk`, `business_id uuid not null`, `category_id uuid not null`, `created_at`
  - Unique `(business_id, category_id)`
  - RLS: public read for published businesses; owners manage own; admins manage all.
- Backfill: every existing row in `business_categories` stays as a parent (parent_id null).
- Seed: insert the parent + subcategory list from the brief, using `on conflict (slug) do nothing` so re-runs are safe.

## 2. Admin Categories page (`src/pages/admin/AdminCategories.tsx`)

Replace the flat table with a nested list:
- Parent rows expand/collapse to show children.
- "New Parent" and inline "Add subcategory" button on each parent.
- Edit name / emoji / sort / active inline (existing pattern).
- Delete blocked if parent has children OR if any business uses it (primary or specialty).
- Slug auto-generated from name (existing helper).

Drag-sort is deferred — use numeric `sort_order` field (already supported) to keep scope tight. Note this in the UI as "Sort #".

## 3. Owner dashboard (`src/pages/owner/OwnerProfile.tsx`)

Add a "Categories" section:
- **Primary Category**: single `Select` of parent categories → writes `businesses.category_id`.
- **Specialties**: multi-select chips. Show subcategories grouped by parent; toggling adds/removes rows in `business_subcategories`. Searchable input filters the list.

## 4. Public directory (`src/pages/FoodTrucks.tsx`)

- Existing category pill row becomes parent categories only.
- When a parent is selected, reveal a second row of its subcategory chips.
- Filtering: parent match uses `category_id`; subcategory match joins `business_subcategories`. Combined = AND.
- Mobile: chips wrap, horizontal scroll on overflow.

## 5. SEO routes

Add two routes in `src/App.tsx`:
- `/category/:slug` → directory pre-filtered to that parent
- `/specialty/:slug` → directory pre-filtered to that subcategory

Implement by reading `:slug` in `FoodTrucks.tsx` and seeding filter state. `useSEO` title/description derived from the category name.

## 6. Truck profile (`src/pages/TruckProfile.tsx`)

Show primary category badge + specialty chips under the hero. Link each chip to `/specialty/:slug`.

## Out of scope (call out, don't build)
- Drag-and-drop sorting (use numeric sort).
- Renaming `businesses.category_id` → `business_primary_category_id` (would require regenerating types and touching ~10 files; semantics are identical).
- Auto-mapping seed parents to existing trucks beyond what's already set.

## Approval needed
Reply "go" to proceed. I'll run the migration first (requires your approval), then ship the UI changes in one batch.
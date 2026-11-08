/**
 * Read-only production catalog recorded 2026-11-08 about 2:13 PM CST.
 * Versions and object names only. Not a connection string and not seed data.
 * GitHub descriptive migration filenames are not applied schema_migrations versions.
 */
export const CATALOG_OBSERVED_ON = "2026-11-08";

export const APPLIED_SCHEMA_MIGRATION_VERSIONS = [
  "20260428163409",
  "20260428163432",
  "20260428165022",
  "20260428170426",
  "20260428191318",
  "20260428203547",
  "20260428204708",
  "20260507214441",
  "20260508033449",
  "20260508043208",
  "20260515223426",
  "20260603203910",
  "20260603231607",
  "20260604013608",
  "20260604015323",
  "20260604020811",
  "20260604024615",
  "20260604030258",
  "20260604033625",
  "20260604073533",
  "20260604074637",
  "20260606235744",
  "20260607020009",
  "20260608203654",
  "20260609041230",
  "20260609041306",
  "20260625224820",
] as const;

/** These 15 GitHub filenames have no matching applied schema_migrations version. */
export const GITHUB_DESCRIPTIVE_MIGRATIONS = [
  "20260603170000_add_map_coordinates.sql",
  "20260603171000_seed_demo_map_coordinates.sql",
  "20260603172000_keep_map_pins_in_sync.sql",
  "20260603172100_scope_demo_map_helpers.sql",
  "20260604013000_sync_inventory_coordinates_to_live_map.sql",
  "20260604023500_harden_claim_workflow.sql",
  "20260604033000_lock_down_public_security_definer_execute.sql",
  "20260604034500_harden_outreach_crm.sql",
  "20260604041000_guard_ready_for_outreach_transition.sql",
  "20260604044500_allow_admin_business_insert.sql",
  "20260607020000_workflow_polish_pass_3_backend.sql",
  "20260607023000_business_assets_storage.sql",
  "20260607024500_public_archive_guards_and_email_validation.sql",
  "20260607030000_lock_archived_listings.sql",
  "20260608000000_workflow_polish_pass_3_review_fixes.sql",
] as const;

export const CATALOG_CLAIM_REQUESTS = {
  requesterUserIdNullable: true,
  requesterUserIdOnDelete: "CASCADE",
} as const;

export const CATALOG_STORAGE_BUCKETS = [{ name: "business-assets", public: true }] as const;

/** Live assign_business_owner does not update claim_requests. Body was catalog-read, not replayed. */
export const CATALOG_ASSIGN_BUSINESS_OWNER = {
  present: true,
  updatesClaimRequests: false,
} as const;

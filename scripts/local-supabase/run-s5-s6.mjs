/**
 * S5 migration replay and S6 per-role JWT RLS on local ephemeral Supabase.
 * Label: local ephemeral Supabase: migration replay + per-role JWT RLS.
 * This does not prove production RLS. It does not close GitHub #15 or #17.
 *
 * The root .env is never loaded. API and database URLs come from `supabase status`
 * and must be localhost. docs/proposals/fxm-004-business-outreach-crm-state.sql is not executed.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  assertLocalSupabaseUrl,
  localApiUrlFromStatus,
  localDbUrlFromStatus,
  valueFromStatusEnv,
} from "./assertLocalSupabase.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const shapeFile = path.join(root, "scripts/local-supabase/live-shape.sql");
const evidenceDir = path.join(root, "docs/qa");
const LOCAL_PASSWORD = "local-only-fxm-s6";
const EXCLUDE = [
  "studio",
  "realtime",
  "edge-runtime",
  "logflare",
  "vector",
  "imgproxy",
  "postgres-meta",
  "mailpit",
  "supavisor",
];

const IDS = {
  northPier: "11111111-1111-4111-8111-111111111111",
  foxLantern: "22222222-2222-4222-8222-222222222222",
  charlie: "33333333-3333-4333-8333-333333333333",
  declined: "44444444-4444-4444-8444-444444444444",
  revoked: "55555555-5555-4555-8555-555555555555",
  unmatched: "66666666-6666-4666-8666-666666666666",
  draft: "77777777-7777-4777-8777-777777777777",
  archived: "88888888-8888-4888-8888-888888888888",
  ready: "99999999-9999-4999-8999-999999999999",
  typoProbe: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  directA: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
  directB: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
  ml1: "cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
  ml2: "cccccccc-cccc-4ccc-8ccc-ccccccccccc2",
  menuCatA: "dddddddd-dddd-4ddd-8ddd-ddddddddddd1",
  menuCatB: "dddddddd-dddd-4ddd-8ddd-ddddddddddd2",
  menuItemA: "dddddddd-dddd-4ddd-8ddd-ddddddddddd3",
  menuItemB: "dddddddd-dddd-4ddd-8ddd-ddddddddddd4",
  eventA: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1",
  eventB: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2",
  locA: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3",
  locB: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4",
  msgDirectA: "ffffffff-ffff-4fff-8fff-fffffffffff1",
  msgDirectB: "ffffffff-ffff-4fff-8fff-fffffffffff2",
  msgMlA: "ffffffff-ffff-4fff-8fff-fffffffffff3",
  msgMlB: "ffffffff-ffff-4fff-8fff-fffffffffff4",
  importRow: "12121212-1212-4212-8212-121212121212",
  sourceRow: "12121212-1212-4212-8212-121212121213",
};

const SHARED_STAGE = "quote_sent";
const SHARED_NOTE = "shared marketplace stage note";
const NOTE_A = "North Pier quote note";
const NOTE_B = "Fox Lantern quote note";
const PRIVATE_A = "North Pier private note";
const PRIVATE_B = "Fox Lantern private note";
const CHARLIE_NOTE = "Charlie Fixture marketplace note";

const report = {
  label: "local ephemeral Supabase: migration replay + per-role JWT RLS",
  provesProductionRls: false,
  canCloseIssues: false,
  cells: [],
  failures: [],
  notes: [],
  catalogs: {},
  migrations: [],
  mutation: null,
  finding18: null,
};

function redact(value) {
  return String(value ?? "")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted-jwt]")
    .replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, "[redacted-db-url]")
    .replace(/local-only-fxm-s6/g, "[redacted-local-password]");
}

function note(text) {
  report.notes.push(text);
}

function cell(entry) {
  const row = { ...entry, detail: redact(entry.detail ?? "") };
  report.cells.push(row);
  if (!row.pass) report.failures.push(row);
  return row;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    ...options,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function psql(dbUrl, args) {
  assertLocalPostgres(dbUrl);
  const result = run("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", ...args]);
  if (result.status !== 0) {
    throw new Error(redact(`${result.stderr}\n${result.stdout}`.trim()));
  }
  return result.stdout;
}

function assertLocalPostgres(dbUrl) {
  localDbUrlFromStatus(`DB_URL=${dbUrl}`);
}

function psqlJson(dbUrl, sql) {
  const wrapped = `SELECT coalesce(json_agg(row_to_json(q)), '[]'::json) FROM (${sql}) q`;
  const out = psql(dbUrl, ["-At", "-c", wrapped]);
  return JSON.parse(out.trim() || "[]");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function discardHostedShellEnv() {
  const hosted = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
    .filter((name) => {
      const value = process.env[name] ?? "";
      return /supabase\.co|foodxmobile\.com|akhmgnjmhvvmprvnwusp|truckhub\.lovable\.app/i.test(value);
    });
  for (const name of ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PROJECT_ID", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
    delete process.env[name];
  }
  report.discardedHostedShellVariables = hosted.length > 0;
  if (hosted.length > 0) {
    note("A hosted Supabase URL or key was present in the shell and was discarded before any client was created.");
  }
}

function ensureStarted() {
  const status = run("supabase", ["status", "-o", "env"]);
  if (status.status === 0 && status.stdout.includes("API_URL=")) return;
  note(`Starting local Supabase without ${EXCLUDE.join(", ")}.`);
  const started = run("supabase", ["start", "-x", EXCLUDE.join(","), "--yes"]);
  if (started.status !== 0) {
    throw new Error(redact(`supabase start failed\n${started.stderr}\n${started.stdout}`));
  }
}

function readStatus() {
  const status = run("supabase", ["status", "-o", "env"]);
  if (status.status !== 0) {
    throw new Error(redact(`supabase status failed\n${status.stderr}`));
  }
  const apiUrl = localApiUrlFromStatus(status.stdout);
  const dbUrl = localDbUrlFromStatus(status.stdout);
  assertLocalSupabaseUrl(apiUrl);
  const anonKey = valueFromStatusEnv(status.stdout, "ANON_KEY");
  const serviceKey = valueFromStatusEnv(status.stdout, "SERVICE_ROLE_KEY");
  if (!anonKey.startsWith("eyJ") || !serviceKey.startsWith("eyJ")) {
    throw new Error("Local status keys were not JWTs. Refusing to continue.");
  }
  return { apiUrl, dbUrl, anonKey, serviceKey };
}

function jwtPayload(token) {
  const part = token.split(".")[1];
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

function migrationFiles() {
  return readdirSync(path.join(root, "supabase/migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

function productionVersionsFromCatalogSource() {
  const source = readFileSync(path.join(root, "src/lib/qa/liveCatalog.ts"), "utf8");
  const block = source.split("APPLIED_SCHEMA_MIGRATION_VERSIONS")[1].split("] as const")[0];
  return [...block.matchAll(/"(\d{14})"/g)].map((match) => match[1]);
}

function descriptiveFilenames() {
  const source = readFileSync(path.join(root, "src/lib/qa/liveCatalog.ts"), "utf8");
  const block = source.split("GITHUB_DESCRIPTIVE_MIGRATIONS")[1].split("] as const")[0];
  return [...block.matchAll(/"([^"]+\.sql)"/g)].map((match) => match[1]);
}

async function replayMigrations(dbUrl) {
  const files = migrationFiles();
  const reset = run("supabase", ["db", "reset", "--local", "--no-seed", "--yes"]);
  report.migrationReset = {
    status: reset.status,
    log: redact(`${reset.stdout}\n${reset.stderr}`).trim(),
  };
  writeFileSync(path.join(evidenceDir, "s5-migration-replay.txt"), `${report.migrationReset.log}\n`);
  let versions = [];
  if (reset.status === 0) {
    versions = psqlJson(dbUrl, "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version").map(
      (row) => row.version,
    );
  }
  const applied = new Set(versions);
  report.migrations = files.map((filename) => {
    const version = filename.slice(0, 14);
    return {
      filename,
      version,
      applied: applied.has(version),
      descriptiveGithubFilename: descriptiveFilenames().includes(filename),
    };
  });
  const failed = report.migrations.filter((item) => !item.applied);
  cell({
    id: "s5-replay",
    baseline: "repo-shaped",
    role: "harness",
    operation: "supabase db reset --local",
    expect: "all migration files applied",
    observed: reset.status === 0 ? `${applied.size} versions` : `reset exit ${reset.status}`,
    pass: reset.status === 0 && failed.length === 0 && files.length === 42,
    detail:
      reset.status === 0
        ? failed.length
          ? `Missing versions: ${failed.map((item) => item.filename).join(", ")}`
          : `${files.length} files recorded in local schema_migrations`
        : "Reset failed. The migration file was not edited.",
  });
  const production = new Set(productionVersionsFromCatalogSource());
  const localDescriptive = report.migrations.filter((item) => item.descriptiveGithubFilename && item.applied);
  const productionVersionsAlsoLocal = [...production].filter((version) => applied.has(version));
  note(
    `Local schema_migrations has ${applied.size} versions after replay. ${localDescriptive.length} of those versions are the 15 descriptive GitHub filenames. ${productionVersionsAlsoLocal.length} of the 27 recorded production version strings match a local version exactly. Production versions sit a few seconds earlier than the Lovable filenames, so an exact match is not expected. Local version rows are a replay record, not proof those filenames were applied on the hosted database.`,
  );
  report.versionComparison = {
    localCount: applied.size,
    descriptiveApplied: localDescriptive.map((item) => item.filename),
    productionVersionExactMatches: productionVersionsAlsoLocal,
  };
  if (reset.status !== 0) {
    throw new Error("Migration replay failed. S6 was not run against a partial database.");
  }
}

function catalog(dbUrl) {
  const columns = psqlJson(
    dbUrl,
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'business_outreach'
     ORDER BY column_name`,
  ).map((row) => row.column_name);
  const routines = psqlJson(
    dbUrl,
    `SELECT p.proname AS name,
            pg_get_function_identity_arguments(p.oid) AS args,
            p.prosecdef AS security_definer,
            coalesce(array_to_string(p.proconfig, ','), '') AS config
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = ANY (ARRAY[
         'submit_event_inquiry','approve_claim_request','set_business_outreach_crm_state',
         'archive_business_listing','enforce_archived_business_unpublished',
         'reject_obvious_claim_email_typos','review_event_import','assign_business_owner',
         'prevent_implicit_archived_business_restore','is_admin'
       ])
     ORDER BY 1`,
  );
  const triggers = psqlJson(
    dbUrl,
    `SELECT c.relname AS table_name, t.tgname AS trigger_name
     FROM pg_trigger t
     JOIN pg_class c ON c.oid = t.tgrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND NOT t.tgisinternal
       AND t.tgname = ANY (ARRAY[
         'businesses_force_archived_unpublished',
         'businesses_block_implicit_archived_restore',
         'claim_requests_reject_obvious_email_typos',
         'trg_businesses_ensure_outreach_row'
       ])
     ORDER BY 1, 2`,
  );
  const buckets = psqlJson(dbUrl, "SELECT id, name, public FROM storage.buckets ORDER BY id");
  const claimFk = psqlJson(
    dbUrl,
    `SELECT conname,
            CASE confdeltype WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'a' THEN 'NO ACTION' ELSE confdeltype::text END AS on_delete
     FROM pg_constraint
     WHERE conname = 'claim_requests_requester_user_id_fkey'`,
  );
  const policies = psqlJson(
    dbUrl,
    `SELECT pol.polname AS name, pg_get_expr(pol.polqual, pol.polrelid) AS using_expr
     FROM pg_policy pol
     JOIN pg_class cls ON cls.oid = pol.polrelid
     JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
     WHERE nsp.nspname = 'public' AND cls.relname = 'leads'
     ORDER BY 1`,
  );
  const accountStatusPolicies = psqlJson(
    dbUrl,
    `SELECT count(*)::int AS policies
     FROM pg_policies
     WHERE schemaname = 'public' AND (coalesce(qual, '') ILIKE '%account_status%' OR coalesce(with_check, '') ILIKE '%account_status%')`,
  );
  const assign = routines.find((item) => item.name === "assign_business_owner");
  let assignBodyFlags = { present: Boolean(assign), mentionsCrmState: false, mentionsClaimRequests: false };
  if (assign) {
    const body = psqlJson(
      dbUrl,
      `SELECT pg_get_functiondef('public.assign_business_owner(uuid, uuid)'::regprocedure) AS def`,
    )[0]?.def ?? "";
    assignBodyFlags = {
      present: true,
      mentionsCrmState: body.includes("crm_state"),
      mentionsClaimRequests: body.includes("claim_requests"),
    };
  }
  return { columns, routines, triggers, buckets, claimFk, policies, accountStatusPolicies, assignBodyFlags };
}

function routineNames(snapshot) {
  return new Set(snapshot.routines.map((item) => item.name));
}

function triggerNames(snapshot) {
  return new Set(snapshot.triggers.map((item) => item.trigger_name));
}

function compareCatalogs(repo, live) {
  const expectAbsent = [
    "set_business_outreach_crm_state",
    "enforce_archived_business_unpublished",
    "archive_business_listing",
    "reject_obvious_claim_email_typos",
    "prevent_implicit_archived_business_restore",
    "review_event_import",
  ];
  const expectColumnsAbsent = ["crm_state", "completed_at", "archived_at", "deleted_at"];
  const expectTriggersAbsent = [
    "businesses_force_archived_unpublished",
    "businesses_block_implicit_archived_restore",
    "claim_requests_reject_obvious_email_typos",
  ];
  for (const name of expectAbsent) {
    cell({
      id: `catalog-repo-has-or-records-${name}`,
      baseline: "repo-shaped",
      role: "harness",
      operation: `routine ${name}`,
      expect: name === "review_event_import" ? "absent on main replay" : "present after replay",
      observed: routineNames(repo).has(name) ? "present" : "absent",
      pass: name === "review_event_import" ? !routineNames(repo).has(name) : routineNames(repo).has(name),
      detail: "Presence comes from replaying supabase/migrations. review_event_import is not in those files.",
    });
    cell({
      id: `catalog-live-absent-${name}`,
      baseline: "live-shaped",
      role: "harness",
      operation: `routine ${name}`,
      expect: "absent",
      observed: routineNames(live).has(name) ? "present" : "absent",
      pass: !routineNames(live).has(name),
      detail: "Removed locally to match the confirmed-absent catalog. Not a production change.",
    });
  }
  for (const column of expectColumnsAbsent) {
    cell({
      id: `catalog-repo-column-${column}`,
      baseline: "repo-shaped",
      role: "harness",
      operation: `business_outreach.${column}`,
      expect: "present",
      observed: repo.columns.includes(column) ? "present" : "absent",
      pass: repo.columns.includes(column),
      detail: "Repo-shaped keeps the pass-3 columns created by the replay.",
    });
    cell({
      id: `catalog-live-column-${column}`,
      baseline: "live-shaped",
      role: "harness",
      operation: `business_outreach.${column}`,
      expect: "absent",
      observed: live.columns.includes(column) ? "present" : "absent",
      pass: !live.columns.includes(column),
      detail: "Live-shaped drops the four outreach columns confirmed absent.",
    });
  }
  for (const trigger of expectTriggersAbsent) {
    cell({
      id: `catalog-live-trigger-${trigger}`,
      baseline: "live-shaped",
      role: "harness",
      operation: trigger,
      expect: "absent",
      observed: triggerNames(live).has(trigger) ? "present" : "absent",
      pass: !triggerNames(live).has(trigger),
      detail: "Archive-guard and claim-email typo triggers are confirmed absent live.",
    });
  }
  for (const [baseline, snapshot] of [
    ["repo-shaped", repo],
    ["live-shaped", live],
  ]) {
    const bucket = snapshot.buckets.find((item) => item.name === "business-assets" || item.id === "business-assets");
    cell({
      id: `catalog-bucket-${baseline}`,
      baseline,
      role: "harness",
      operation: "storage.buckets business-assets",
      expect: "present and public",
      observed: bucket ? `public=${bucket.public}` : "absent",
      pass: Boolean(bucket) && bucket.public === true,
      detail: "Kept even though 20260607023000_business_assets_storage.sql is not a production schema_migrations version.",
    });
    cell({
      id: `catalog-review-import-${baseline}`,
      baseline,
      role: "harness",
      operation: "review_event_import",
      expect: "absent",
      observed: routineNames(snapshot).has("review_event_import") ? "present" : "absent",
      pass: !routineNames(snapshot).has("review_event_import"),
      detail: "PR #13 was not merged or replayed. The RPC stays absent on both baselines.",
    });
  }
  const fk = live.claimFk[0];
  note(
    `claim_requests.requester_user_id foreign key on the live-shaped baseline is ${fk ? fk.on_delete : "missing"}. The 2026-11-08 catalog recorded ON DELETE CASCADE. This shaper does not rewrite that constraint, so the replayed pass-3 SET NULL behavior remains. That residual is not a production change.`,
  );
  note(
    `assign_business_owner on the live-shaped baseline is present=${live.assignBodyFlags.present}, mentions crm_state=${live.assignBodyFlags.mentionsCrmState}, mentions claim_requests=${live.assignBodyFlags.mentionsClaimRequests}. The catalog says the live function does not update claim_requests. This shaper does not replace the function body.`,
  );
  note(
    `Policies whose expression mentions account_status: ${live.accountStatusPolicies[0]?.policies ?? 0}. Suspension is not an RLS predicate in this replay.`,
  );
}

function clientOptions() {
  return { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
}

async function signIn(apiUrl, anonKey, email) {
  const opener = createClient(apiUrl, anonKey, clientOptions());
  const signed = await opener.auth.signInWithPassword({ email, password: LOCAL_PASSWORD });
  if (signed.error || !signed.data.session) {
    throw new Error(`Sign-in failed for ${email}: ${signed.error?.message ?? "no session"}`);
  }
  const client = createClient(apiUrl, anonKey, clientOptions());
  const session = await client.auth.setSession({
    access_token: signed.data.session.access_token,
    refresh_token: signed.data.session.refresh_token,
  });
  if (session.error) throw new Error(session.error.message);
  const payload = jwtPayload(signed.data.session.access_token);
  if (payload.role !== "authenticated") {
    throw new Error(`Expected authenticated JWT role for ${email}, saw ${payload.role}`);
  }
  return { client, userId: payload.sub, role: payload.role };
}

async function seed(apiUrl, anonKey, serviceKey) {
  const service = createClient(apiUrl, serviceKey, clientOptions());
  const servicePayload = jwtPayload(serviceKey);
  cell({
    id: "jwt-service-role-not-used-for-rls",
    baseline: "repo-shaped",
    role: "harness",
    operation: "inspect service role claim",
    expect: "service_role",
    observed: servicePayload.role,
    pass: servicePayload.role === "service_role",
    detail: "The service role is used only to seed. Role assertions use signed-in user JWTs or the anon key.",
  });

  const accounts = [
    ["ownerA", "owner.a@fxm-synthetic.test", "Owner A Fixture"],
    ["ownerB", "owner.b@fxm-synthetic.test", "Owner B Fixture"],
    ["ownerC", "owner.c@fxm-synthetic.test", "Owner C Fixture"],
    ["admin", "admin@fxm-synthetic.test", "Admin Fixture"],
    ["declined", "declined.owner@fxm-synthetic.test", "Declined Fixture"],
    ["revoked", "revoked.owner@fxm-synthetic.test", "Revoked Fixture"],
    ["claimant", "claimant@fxm-synthetic.test", "Claimant Fixture"],
    ["suspended", "suspended.owner@fxm-synthetic.test", "Suspended Fixture"],
  ];
  const users = {};
  for (const [key, email, display] of accounts) {
    const created = await service.auth.admin.createUser({
      email,
      password: LOCAL_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: display },
    });
    if (created.error || !created.data.user) {
      throw new Error(`Create user ${email} failed: ${created.error?.message}`);
    }
    users[key] = created.data.user.id;
  }
  const adminRole = await service.from("user_roles").insert({ user_id: users.admin, role: "admin" }).select("role");
  if (adminRole.error) throw new Error(adminRole.error.message);
  const suspended = await service
    .from("profiles")
    .update({ account_status: "suspended" })
    .eq("id", users.suspended);
  if (suspended.error) throw new Error(suspended.error.message);

  const businesses = [
    [IDS.northPier, users.ownerA, "North Pier Kitchen", "fxm-synth-north-pier", true, false, "claimed_free", "claimed"],
    [IDS.foxLantern, users.ownerB, "Fox Lantern Bakery", "fxm-synth-fox-lantern", true, false, "claimed_free", "contacted"],
    [IDS.charlie, users.ownerC, "Charlie Fixture Coffee", "fxm-synth-charlie-coffee", true, false, "claimed_free", "interested"],
    [IDS.declined, users.declined, "Declined Fixture Cart", "fxm-synth-declined-cart", true, false, "claimed_free", "follow_up_needed"],
    [IDS.revoked, users.revoked, "Revoked Fixture Cart", "fxm-synth-revoked-cart", true, false, "claimed_free", "claim_invited"],
    [IDS.unmatched, null, "Unmatched Fixture Cart", "fxm-synth-unmatched-cart", true, true, "unclaimed", "not_contacted"],
    [IDS.draft, null, "Draft Fixture Stand", "fxm-synth-draft-stand", false, false, "draft", "researching"],
    [IDS.archived, null, "Archived Fixture Stand", "fxm-synth-archived-stand", false, true, "archived", "not_interested"],
    [IDS.ready, null, "Ready Fixture Truck", "fxm-synth-ready-truck", false, true, "unclaimed", "ready_to_contact"],
    [IDS.typoProbe, null, "Typo Probe Fixture Stand", "fxm-synth-typo-probe", true, false, "unclaimed", "do_not_contact"],
  ];
  for (const [id, owner, name, slug, published, demo, listing, outreach] of businesses) {
    const inserted = await service.from("businesses").insert({
      id,
      owner_id: owner,
      name,
      slug,
      is_published: published,
      is_demo: demo,
      listing_status: listing,
      email: owner ? null : "listing@fxm-synthetic.test",
      phone: "555-0100",
      city: "Synthetic Bay",
    });
    if (inserted.error) throw new Error(`${name}: ${inserted.error.message}`);
    const status = await service
      .from("business_outreach")
      .update({ outreach_status: outreach })
      .eq("business_id", id);
    if (status.error) throw new Error(`${name} outreach: ${status.error.message}`);
  }

  const leads = await service.from("leads").insert([
    {
      id: IDS.directA,
      business_id: IDS.northPier,
      contact_name: "Ada Fixture",
      contact_email: "ada.customer@fxm-synthetic.test",
      contact_phone: "555-0101",
      stage: "booked",
      internal_notes: PRIVATE_A,
      lead_type: "vendor_direct",
      assigned_vendor_ids: [],
      matched_vendor_count: 0,
      source: "synthetic",
    },
    {
      id: IDS.directB,
      business_id: IDS.foxLantern,
      contact_name: "Ben Fixture",
      contact_email: "ben.customer@fxm-synthetic.test",
      contact_phone: "555-0102",
      stage: "new",
      internal_notes: PRIVATE_B,
      lead_type: "vendor_direct",
      assigned_vendor_ids: [],
      matched_vendor_count: 0,
      source: "synthetic",
    },
    {
      id: IDS.ml1,
      business_id: null,
      contact_name: "Casey Fixture",
      contact_email: "casey.marketplace@fxm-synthetic.test",
      contact_phone: "555-0103",
      stage: SHARED_STAGE,
      internal_notes: SHARED_NOTE,
      lead_type: "event_inquiry",
      assigned_vendor_ids: [IDS.northPier, IDS.foxLantern],
      matched_vendor_count: 2,
      distribution_status: "matched",
      source: "synthetic",
    },
    {
      id: IDS.ml2,
      business_id: null,
      contact_name: "Quinn Fixture",
      contact_email: "quinn.marketplace@fxm-synthetic.test",
      contact_phone: "555-0104",
      stage: "new",
      internal_notes: CHARLIE_NOTE,
      lead_type: "event_inquiry",
      assigned_vendor_ids: [IDS.charlie],
      matched_vendor_count: 1,
      distribution_status: "matched",
      source: "synthetic",
    },
  ]);
  if (leads.error) throw new Error(leads.error.message);

  const messages = await service.from("lead_messages").insert([
    { id: IDS.msgDirectA, lead_id: IDS.directA, sender_user_id: users.ownerA, sender_role: "owner", body: PRIVATE_A },
    { id: IDS.msgDirectB, lead_id: IDS.directB, sender_user_id: users.ownerB, sender_role: "owner", body: PRIVATE_B },
    { id: IDS.msgMlA, lead_id: IDS.ml1, sender_user_id: users.ownerA, sender_role: "owner", body: NOTE_A },
    { id: IDS.msgMlB, lead_id: IDS.ml1, sender_user_id: users.ownerB, sender_role: "owner", body: NOTE_B },
  ]);
  if (messages.error) throw new Error(messages.error.message);

  const prefs = await service.from("vendor_lead_preferences").insert([
    { business_id: IDS.northPier, service_area: "North Pier Fixture area" },
    { business_id: IDS.foxLantern, service_area: "Fox Lantern Fixture area" },
    { business_id: IDS.charlie, service_area: "Charlie Fixture area" },
  ]);
  if (prefs.error) throw new Error(prefs.error.message);
  const ownerPrefs = await service.from("owner_preferences").insert([
    { business_id: IDS.northPier },
    { business_id: IDS.foxLantern },
    { business_id: IDS.charlie },
  ]);
  if (ownerPrefs.error) throw new Error(ownerPrefs.error.message);
  const locations = await service.from("saved_locations").insert([
    { id: IDS.locA, business_id: IDS.northPier, label: "North Pier Fixture dock" },
    { id: IDS.locB, business_id: IDS.foxLantern, label: "Fox Lantern Fixture dock" },
  ]);
  if (locations.error) throw new Error(locations.error.message);
  const categories = await service.from("menu_categories").insert([
    { id: IDS.menuCatA, business_id: IDS.northPier, name: "North Pier Fixture menu" },
    { id: IDS.menuCatB, business_id: IDS.foxLantern, name: "Fox Lantern Fixture menu" },
  ]);
  if (categories.error) throw new Error(categories.error.message);
  const items = await service.from("menu_items").insert([
    { id: IDS.menuItemA, business_id: IDS.northPier, category_id: IDS.menuCatA, name: "North Pier Fixture plate" },
    { id: IDS.menuItemB, business_id: IDS.foxLantern, category_id: IDS.menuCatB, name: "Fox Lantern Fixture plate" },
  ]);
  if (items.error) throw new Error(items.error.message);
  const events = await service.from("business_events").insert([
    { id: IDS.eventA, business_id: IDS.northPier, title: "North Pier Fixture private event", is_public: false, notes: PRIVATE_A },
    { id: IDS.eventB, business_id: IDS.foxLantern, title: "Fox Lantern Fixture private event", is_public: false, notes: PRIVATE_B },
  ]);
  if (events.error) throw new Error(events.error.message);
  const source = await service.from("event_sources").insert({
    id: IDS.sourceRow,
    source_name: "Synthetic Fixture Calendar",
    source_url: "https://events.fxm-synthetic.test/calendar",
  });
  if (source.error) throw new Error(source.error.message);
  const imported = await service.from("event_import_queue").insert({
    id: IDS.importRow,
    source_id: IDS.sourceRow,
    source_name: "Synthetic Fixture Calendar",
    source_url: "https://events.fxm-synthetic.test/calendar",
    title: "Synthetic Fixture Import",
    event_fingerprint: "fxm-synthetic-fingerprint-1",
    review_status: "pending_review",
  });
  if (imported.error) throw new Error(imported.error.message);

  const sessions = {
    anon: createClient(apiUrl, anonKey, clientOptions()),
    service,
  };
  for (const key of ["ownerA", "ownerB", "ownerC", "admin", "declined", "revoked", "claimant", "suspended"]) {
    const email = accounts.find((item) => item[0] === key)[1];
    sessions[key] = await signIn(apiUrl, anonKey, email);
  }
  const anonPayload = jwtPayload(anonKey);
  cell({
    id: "jwt-anon-role",
    baseline: "repo-shaped",
    role: "ANON",
    operation: "anon key role claim",
    expect: "anon",
    observed: anonPayload.role,
    pass: anonPayload.role === "anon",
    detail: "Anonymous calls use the local anon key and no user session.",
  });
  return { users, sessions };
}

async function query(builder) {
  try {
    const result = await builder;
    return { error: result.error ?? null, data: result.data ?? null };
  } catch (error) {
    return { error: { message: error.message }, data: null };
  }
}

function closed(result) {
  if (result.error) {
    if (/fetch failed|ECONNREFUSED|ENOTFOUND/i.test(result.error.message ?? "")) return false;
    return true;
  }
  if (Array.isArray(result.data)) return result.data.length === 0;
  return result.data == null;
}

function opened(result) {
  if (result.error || result.data == null) return false;
  if (Array.isArray(result.data)) return result.data.length > 0;
  return true;
}

function missingObject(result) {
  const message = result.error?.message ?? "";
  return /does not exist|schema cache|Could not find the function|Could not find the 'crm_state'|PGRST20/i.test(message);
}

function helperExecuteDenied(result) {
  return /permission denied for function (is_admin|owns_business|has_role)/i.test(result.error?.message ?? "");
}

function bodies(result) {
  if (!Array.isArray(result.data)) return [];
  return result.data.map((row) => row.body).filter(Boolean);
}

async function expectClosed(baseline, role, operation, builder) {
  const result = await query(builder);
  cell({
    id: `${baseline}-${role}-${operation}`.replace(/\s+/g, "-").toLowerCase(),
    baseline,
    role,
    operation,
    expect: "deny",
    observed: result.error ? `error: ${result.error.message}` : `rows ${Array.isArray(result.data) ? result.data.length : 0}`,
    pass: closed(result),
    detail: helperExecuteDenied(result)
      ? "Fail closed because EXECUTE is denied on an RLS helper. No row was returned. This is not an empty-filter proof."
      : "Negative test must fail closed.",
  });
  return result;
}

async function expectOpen(baseline, role, operation, builder) {
  const result = await query(builder);
  cell({
    id: `${baseline}-${role}-${operation}`.replace(/\s+/g, "-").toLowerCase(),
    baseline,
    role,
    operation,
    expect: "allow",
    observed: result.error ? `error: ${result.error.message}` : `rows ${Array.isArray(result.data) ? result.data.length : 0}`,
    pass: opened(result),
    detail: "Allowed cell returned at least one row.",
  });
  return result;
}

async function runMatrix(baseline, db, sessions) {
  const anon = sessions.anon;
  const ownerA = sessions.ownerA.client;
  const ownerB = sessions.ownerB.client;
  const ownerC = sessions.ownerC.client;
  const admin = sessions.admin.client;
  const declined = sessions.declined.client;
  const revoked = sessions.revoked.client;
  const claimant = sessions.claimant.client;
  const suspended = sessions.suspended.client;

  await expectClosed(baseline, "ANON", "select leads", anon.from("leads").select("id"));
  await expectClosed(baseline, "ANON", "select lead_messages", anon.from("lead_messages").select("id"));
  await expectClosed(baseline, "ANON", "select business_outreach", anon.from("business_outreach").select("business_id"));
  await expectClosed(baseline, "ANON", "select claim_requests", anon.from("claim_requests").select("id"));
  await expectClosed(baseline, "ANON", "select event_import_queue", anon.from("event_import_queue").select("id"));
  await expectClosed(baseline, "ANON", "select event_sources", anon.from("event_sources").select("id"));
  await expectClosed(baseline, "ANON", "select vendor_lead_preferences", anon.from("vendor_lead_preferences").select("business_id"));
  await expectClosed(baseline, "ANON", "select owner_preferences", anon.from("owner_preferences").select("business_id"));
  await expectClosed(baseline, "ANON", "select user_roles", anon.from("user_roles").select("role"));
  await expectClosed(baseline, "ANON", "select archived business", anon.from("businesses").select("id").eq("id", IDS.archived));
  await expectClosed(baseline, "ANON", "select draft business", anon.from("businesses").select("id").eq("id", IDS.draft));
  const published = await query(anon.from("businesses").select("id").eq("id", IDS.northPier));
  cell({
    id: `${baseline}-anon-select-published-business`,
    baseline,
    role: "ANON",
    operation: "select published North Pier",
    expect: "finding: query aborts on is_admin EXECUTE",
    observed: published.error ? published.error.message : `rows ${published.data?.length ?? 0}`,
    pass: helperExecuteDenied(published),
    detail:
      "20260604033000 revokes anon EXECUTE on is_admin, and a businesses SELECT policy calls it. That filename is not a production schema_migrations version. The replay was not edited. No row was returned. This does not prove production browsing is broken.",
  });

  const directInsert = await query(
    anon.from("leads").insert({
      business_id: IDS.northPier,
      contact_name: "Ada Fixture",
      contact_email: "ada.customer@fxm-synthetic.test",
      contact_phone: "555-0101",
      source: "synthetic-anon",
    }),
  );
  cell({
    id: `${baseline}-anon-insert-direct-lead`,
    baseline,
    role: "ANON",
    operation: "insert direct lead",
    expect: "finding: insert aborts on is_admin EXECUTE",
    observed: directInsert.error ? directInsert.error.message : "inserted",
    pass: helperExecuteDenied(directInsert),
    detail:
      "The insert policy reads businesses as the caller. The same unapplied lockdown file makes that check raise. submit_event_inquiry still returns an id because it is SECURITY DEFINER. The migration was not edited.",
  });
  await expectClosed(
    baseline,
    "ANON",
    "read back inserted direct lead",
    anon.from("leads").select("id, contact_email").eq("source", "synthetic-anon"),
  );

  const inquiry = await query(
    anon.rpc("submit_event_inquiry", {
      _payload: {
        contact_name: "Casey Fixture",
        contact_email: "casey.marketplace@fxm-synthetic.test",
        contact_phone: "555-0103",
        event_date: "2026-12-01",
        event_location: "Synthetic Park",
        guest_count: "25",
        consent: true,
        category_id: "00000000-0000-4000-8000-000000000099",
      },
    }),
  );
  cell({
    id: `${baseline}-anon-submit-event-inquiry`,
    baseline,
    role: "ANON",
    operation: "submit_event_inquiry",
    expect: "allow",
    observed: inquiry.error ? inquiry.error.message : "returned id",
    pass: !inquiry.error && Boolean(inquiry.data),
    detail: "Valid payload with an unmatched category id. No rate-limit or honeypot parameter exists on this function.",
  });
  if (inquiry.data) {
    await expectClosed(baseline, "ANON", "read back event inquiry", anon.from("leads").select("id").eq("id", inquiry.data));
  }

  await expectOpen(baseline, "OWN-A", "read own direct lead", ownerA.from("leads").select("id, internal_notes").eq("id", IDS.directA));
  await expectClosed(baseline, "OWN-A", "read OWN-B direct lead", ownerA.from("leads").select("id, internal_notes").eq("id", IDS.directB));
  await expectOpen(baseline, "OWN-B", "read own direct lead", ownerB.from("leads").select("id, internal_notes").eq("id", IDS.directB));
  await expectClosed(baseline, "OWN-B", "read OWN-A direct lead", ownerB.from("leads").select("id, internal_notes").eq("id", IDS.directA));
  await expectClosed(baseline, "OWN-A", "read OWN-B lead message", ownerA.from("lead_messages").select("body").eq("id", IDS.msgDirectB));
  await expectClosed(baseline, "OWN-B", "read OWN-A lead message", ownerB.from("lead_messages").select("body").eq("id", IDS.msgDirectA));
  await expectOpen(baseline, "OWN-A", "read own lead message", ownerA.from("lead_messages").select("body").eq("id", IDS.msgDirectA));

  const hijackName = await query(ownerA.from("businesses").update({ tagline: "hijack" }).eq("id", IDS.foxLantern).select("id"));
  const nameAfter = await query(sessions.service.from("businesses").select("tagline").eq("id", IDS.foxLantern).single());
  cell({
    id: `${baseline}-own-a-cannot-update-own-b-business`,
    baseline,
    role: "OWN-A",
    operation: "update OWN-B business",
    expect: "deny",
    observed: `update ${hijackName.error ? hijackName.error.message : "rows " + (hijackName.data?.length ?? 0)}; tagline=${nameAfter.data?.tagline ?? "null"}`,
    pass: closed(hijackName) && (nameAfter.data?.tagline ?? null) === null,
    detail: "Cross-owner business update must not stick.",
  });
  const hijackBack = await query(ownerB.from("businesses").update({ tagline: "hijack" }).eq("id", IDS.northPier).select("id"));
  cell({
    id: `${baseline}-own-b-cannot-update-own-a-business`,
    baseline,
    role: "OWN-B",
    operation: "update OWN-A business",
    expect: "deny",
    observed: hijackBack.error ? hijackBack.error.message : `rows ${hijackBack.data?.length ?? 0}`,
    pass: closed(hijackBack),
    detail: "Cross-owner business update in the other direction.",
  });

  await expectClosed(baseline, "OWN-A", "update OWN-B menu", ownerA.from("menu_items").update({ name: "hijack" }).eq("id", IDS.menuItemB).select("id"));
  await expectClosed(baseline, "OWN-B", "update OWN-A menu", ownerB.from("menu_items").update({ name: "hijack" }).eq("id", IDS.menuItemA).select("id"));
  await expectClosed(baseline, "OWN-A", "read OWN-B private event", ownerA.from("business_events").select("id, notes").eq("id", IDS.eventB));
  await expectClosed(baseline, "OWN-B", "read OWN-A private event", ownerB.from("business_events").select("id, notes").eq("id", IDS.eventA));
  await expectOpen(baseline, "OWN-A", "read own private event", ownerA.from("business_events").select("id").eq("id", IDS.eventA));
  await expectClosed(baseline, "ANON", "read private event", anon.from("business_events").select("id").eq("id", IDS.eventA));
  await expectClosed(baseline, "OWN-B", "read OWN-A vendor prefs", ownerB.from("vendor_lead_preferences").select("service_area").eq("business_id", IDS.northPier));
  await expectClosed(baseline, "OWN-A", "read OWN-B vendor prefs", ownerA.from("vendor_lead_preferences").select("service_area").eq("business_id", IDS.foxLantern));
  await expectOpen(baseline, "OWN-A", "read own vendor prefs", ownerA.from("vendor_lead_preferences").select("service_area").eq("business_id", IDS.northPier));
  await expectClosed(baseline, "OWN-B", "read OWN-A owner prefs", ownerB.from("owner_preferences").select("business_id").eq("business_id", IDS.northPier));
  await expectClosed(baseline, "OWN-A", "read OWN-B owner prefs", ownerA.from("owner_preferences").select("business_id").eq("business_id", IDS.foxLantern));
  await expectClosed(baseline, "OWN-A", "update OWN-B saved location", ownerA.from("saved_locations").update({ label: "hijack" }).eq("id", IDS.locB).select("id"));
  await expectClosed(baseline, "OWN-B", "update OWN-A saved location", ownerB.from("saved_locations").update({ label: "hijack" }).eq("id", IDS.locA).select("id"));

  await expectOpen(baseline, "OWN-A", "read shared marketplace lead", ownerA.from("leads").select("id, stage, internal_notes, contact_email").eq("id", IDS.ml1));
  await expectOpen(baseline, "OWN-B", "read shared marketplace lead", ownerB.from("leads").select("id, stage, internal_notes, contact_email").eq("id", IDS.ml1));
  const seenA = await query(ownerA.from("leads").select("stage, internal_notes").eq("id", IDS.ml1).single());
  const seenB = await query(ownerB.from("leads").select("stage, internal_notes").eq("id", IDS.ml1).single());
  const sharedLeak =
    !seenA.error &&
    !seenB.error &&
    seenA.data?.stage === SHARED_STAGE &&
    seenB.data?.stage === SHARED_STAGE &&
    seenA.data?.internal_notes === SHARED_NOTE &&
    seenB.data?.internal_notes === SHARED_NOTE;
  cell({
    id: `${baseline}-fxm-005-18-shared-lead-crm`,
    baseline,
    role: "OWN-A/OWN-B",
    operation: "read shared leads.stage and internal_notes",
    expect: "known #18 gap if both accepted owners see the same values",
    observed: sharedLeak ? `both see stage=${SHARED_STAGE}` : `A=${seenA.error?.message ?? seenA.data?.stage} B=${seenB.error?.message ?? seenB.data?.stage}`,
    pass: sharedLeak,
    detail:
      "Not an isolation pass. Today's policy returns the whole lead row to every business id in assigned_vendor_ids. There is no per-vendor stage or note column. PR #36 was not applied.",
  });
  if (baseline === "live-shaped") {
    report.finding18 = {
      confirmed: sharedLeak,
      policy: (report.catalogs["live-shaped"]?.policies ?? []).find((item) => item.name === "owners read matched event inquiries") ?? null,
      statement:
        "On the live-shaped baseline, OWN-A and OWN-B are both in assigned_vendor_ids for one marketplace lead and both SELECT the same stage and internal_notes. That is the known FXM-005 / #18 gap. Separate note bodies were stored as lead_messages because the table has no per-vendor note.",
    };
  }

  const notesA = await query(ownerA.from("lead_messages").select("body").eq("lead_id", IDS.ml1));
  const notesB = await query(ownerB.from("lead_messages").select("body").eq("lead_id", IDS.ml1));
  cell({
    id: `${baseline}-separate-note-messages`,
    baseline,
    role: "OWN-A/OWN-B",
    operation: "read per-vendor lead_messages on the shared lead",
    expect: "record visibility; other vendor body must not be returned",
    observed: `A=[${bodies(notesA).join("|")}] B=[${bodies(notesB).join("|")}]`,
    pass: !bodies(notesA).includes(NOTE_B) && !bodies(notesB).includes(NOTE_A),
    detail:
      "lead_messages policies key on leads.business_id. The marketplace lead's business_id is null, so this is not a per-vendor note store.",
  });

  const overwrite = await query(
    ownerA.from("leads").update({ internal_notes: "owner A private overwrite" }).eq("id", IDS.ml1).select("id"),
  );
  const stillShared = await query(sessions.service.from("leads").select("internal_notes").eq("id", IDS.ml1).single());
  cell({
    id: `${baseline}-owners-cannot-write-shared-note`,
    baseline,
    role: "OWN-A",
    operation: "update marketplace internal_notes",
    expect: "deny write",
    observed: `update closed=${closed(overwrite)}; note remains shared=${stillShared.data?.internal_notes === SHARED_NOTE}`,
    pass: closed(overwrite) && stillShared.data?.internal_notes === SHARED_NOTE,
    detail: "Matched owners can read the shared CRM columns and cannot write a private replacement.",
  });

  await expectClosed(baseline, "DECLINED", "read marketplace lead", declined.from("leads").select("id, internal_notes").eq("id", IDS.ml1));
  await expectClosed(baseline, "REVOKED", "read marketplace lead", revoked.from("leads").select("id, internal_notes").eq("id", IDS.ml1));
  await expectClosed(baseline, "DECLINED", "read North Pier note message", declined.from("lead_messages").select("body").eq("id", IDS.msgMlA));
  await expectClosed(baseline, "DECLINED", "read Fox Lantern note message", declined.from("lead_messages").select("body").eq("id", IDS.msgMlB));
  await expectClosed(baseline, "REVOKED", "read North Pier note message", revoked.from("lead_messages").select("body").eq("id", IDS.msgMlA));
  await expectClosed(baseline, "REVOKED", "read Fox Lantern note message", revoked.from("lead_messages").select("body").eq("id", IDS.msgMlB));
  await expectClosed(baseline, "OWN-C", "read ML-1", ownerC.from("leads").select("id").eq("id", IDS.ml1));
  await expectOpen(baseline, "OWN-C", "read ML-2", ownerC.from("leads").select("id, internal_notes").eq("id", IDS.ml2));
  await expectClosed(baseline, "OWN-A", "read ML-2", ownerA.from("leads").select("id").eq("id", IDS.ml2));
  await expectClosed(baseline, "OWN-B", "read ML-2", ownerB.from("leads").select("id").eq("id", IDS.ml2));
  await expectClosed(baseline, "CLM", "read leads", claimant.from("leads").select("id"));
  await expectClosed(baseline, "CLM", "read vendor prefs", claimant.from("vendor_lead_preferences").select("business_id"));
  await expectClosed(baseline, "CLM", "read outreach", claimant.from("business_outreach").select("business_id"));

  const suspendedRead = await query(suspended.from("leads").select("id"));
  cell({
    id: `${baseline}-suspended-rls-observation`,
    baseline,
    role: "suspended",
    operation: "select leads",
    expect: "observation only; RLS does not consult account_status",
    observed: suspendedRead.error ? suspendedRead.error.message : `rows ${suspendedRead.data?.length ?? 0}`,
    pass: true,
    detail: "Recorded so a UI suspension gate is not described as an RLS deny. This user owns no business.",
  });

  await expectOpen(baseline, "ADM", "read both direct leads", admin.from("leads").select("id").in("id", [IDS.directA, IDS.directB]));
  await expectOpen(baseline, "ADM", "read marketplace lead", admin.from("leads").select("id, internal_notes").eq("id", IDS.ml1));
  await expectOpen(baseline, "ADM", "read outreach", admin.from("business_outreach").select("business_id, outreach_status").eq("business_id", IDS.northPier));
  await expectClosed(baseline, "OWN-A", "read outreach", ownerA.from("business_outreach").select("business_id").eq("business_id", IDS.northPier));
  await expectClosed(baseline, "OWN-B", "read outreach", ownerB.from("business_outreach").select("business_id").eq("business_id", IDS.foxLantern));
  await expectOpen(baseline, "ADM", "read event import", admin.from("event_import_queue").select("id, review_status").eq("id", IDS.importRow));
  await expectClosed(baseline, "OWN-A", "read event import", ownerA.from("event_import_queue").select("id"));
  await expectClosed(baseline, "OWN-A", "read event sources", ownerA.from("event_sources").select("id"));

  const adminStatuses = await query(
    admin.from("business_outreach").select("outreach_status").in("business_id", Object.values(IDS).filter((id) => id.startsWith("1111") || id.startsWith("2222") || id.startsWith("3333") || id.startsWith("4444") || id.startsWith("5555") || id.startsWith("6666") || id.startsWith("7777") || id.startsWith("8888") || id.startsWith("9999") || id.startsWith("aaaa"))),
  );
  const statusSet = new Set((adminStatuses.data ?? []).map((row) => row.outreach_status));
  const expectedStatuses = [
    "not_contacted",
    "researching",
    "ready_to_contact",
    "contacted",
    "follow_up_needed",
    "interested",
    "claim_invited",
    "claimed",
    "not_interested",
    "do_not_contact",
  ];
  cell({
    id: `${baseline}-outreach-status-values`,
    baseline,
    role: "ADM",
    operation: "read one row per live outreach_status",
    expect: expectedStatuses.join(","),
    observed: [...statusSet].sort().join(","),
    pass: expectedStatuses.every((status) => statusSet.has(status)),
    detail: "These are outreach_status values. crm_state is not a live-shaped column.",
  });

  if (baseline === "repo-shaped") {
    await expectOpen(baseline, "ADM", "select crm_state", admin.from("business_outreach").select("crm_state").eq("business_id", IDS.northPier));
    await expectClosed(baseline, "OWN-A", "select crm_state", ownerA.from("business_outreach").select("crm_state"));
    const ownerRpc = await query(
      ownerA.rpc("set_business_outreach_crm_state", { _business_id: IDS.draft, _crm_state: "archived" }),
    );
    cell({
      id: "repo-own-a-crm-rpc-denied",
      baseline,
      role: "OWN-A",
      operation: "set_business_outreach_crm_state",
      expect: "deny",
      observed: ownerRpc.error ? ownerRpc.error.message : "returned data",
      pass: Boolean(ownerRpc.error),
      detail: "Admin-only function from the replayed pass-3 migration. The proposal file was not executed.",
    });
    const anonRpc = await query(
      anon.rpc("set_business_outreach_crm_state", { _business_id: IDS.draft, _crm_state: "archived" }),
    );
    cell({
      id: "repo-anon-crm-rpc-denied",
      baseline,
      role: "ANON",
      operation: "set_business_outreach_crm_state",
      expect: "deny",
      observed: anonRpc.error ? anonRpc.error.message : "returned data",
      pass: Boolean(anonRpc.error),
      detail: "Anonymous execute is denied.",
    });
    const adminRpc = await query(
      admin.rpc("set_business_outreach_crm_state", { _business_id: IDS.draft, _crm_state: "completed" }),
    );
    cell({
      id: "repo-admin-crm-rpc-allowed",
      baseline,
      role: "ADM",
      operation: "set_business_outreach_crm_state",
      expect: "allow on ephemeral data",
      observed: adminRpc.error ? adminRpc.error.message : "returned row",
      pass: !adminRpc.error,
      detail: "Ephemeral only. The column is dropped again when the live-shaped baseline is built.",
    });
  } else {
    const adminColumn = await query(admin.from("business_outreach").select("crm_state").limit(1));
    const adminPlain = await query(admin.from("business_outreach").select("business_id, outreach_status").limit(1));
    cell({
      id: "live-admin-crm-state-errors",
      baseline,
      role: "ADM",
      operation: "select crm_state",
      expect: "error, not an empty success",
      observed: adminColumn.error ? adminColumn.error.message : `rows ${adminColumn.data?.length ?? 0}`,
      pass: missingObject(adminColumn) && opened(adminPlain),
      detail: "The live-shaped list query that names crm_state fails. A select of columns that exist still returns rows, so the failure is not a zero count.",
    });
    const adminRpc = await query(
      admin.rpc("set_business_outreach_crm_state", { _business_id: IDS.draft, _crm_state: "active" }),
    );
    cell({
      id: "live-admin-crm-rpc-missing",
      baseline,
      role: "ADM",
      operation: "set_business_outreach_crm_state",
      expect: "function does not exist",
      observed: adminRpc.error ? adminRpc.error.message : "returned data",
      pass: missingObject(adminRpc),
      detail: "Absence is the live-shaped result. The proposal SQL was not applied to recreate it.",
    });
    for (const [role, client] of [
      ["OWN-A", ownerA],
      ["ANON", anon],
    ]) {
      const rpc = await query(client.rpc("set_business_outreach_crm_state", { _business_id: IDS.draft, _crm_state: "active" }));
      cell({
        id: `live-${role}-crm-rpc-missing`,
        baseline,
        role,
        operation: "set_business_outreach_crm_state",
        expect: "function does not exist",
        observed: rpc.error ? rpc.error.message : "returned data",
        pass: missingObject(rpc),
        detail: "Same absence for non-admin callers.",
      });
    }
  }

  const review = await query(
    admin.rpc("review_event_import", {
      _id: IDS.importRow,
      _decision: "approved",
      _notes: "do-not-publish",
      _extra: "",
    }),
  );
  cell({
    id: `${baseline}-review-event-import-absent`,
    baseline,
    role: "ADM",
    operation: "review_event_import",
    expect: "function does not exist",
    observed: review.error ? review.error.message : "returned data",
    pass: missingObject(review),
    detail: "Not restored. No publication path was added.",
  });

  const approveDenied = await query(ownerA.rpc("approve_claim_request", { _claim_request_id: IDS.importRow }));
  cell({
    id: `${baseline}-own-a-approve-claim-denied`,
    baseline,
    role: "OWN-A",
    operation: "approve_claim_request",
    expect: "deny",
    observed: approveDenied.error ? approveDenied.error.message : "returned data",
    pass: Boolean(approveDenied.error),
    detail: "Uses a non-claim id so a denied call cannot approve a fixture.",
  });
  const approveMissing = await query(admin.rpc("approve_claim_request", { _claim_request_id: IDS.importRow }));
  cell({
    id: `${baseline}-admin-approve-claim-guard-holds`,
    baseline,
    role: "ADM",
    operation: "approve_claim_request missing id",
    expect: "admin guard allows the call and the row is not found",
    observed: approveMissing.error ? approveMissing.error.message : "returned data",
    pass: Boolean(approveMissing.error) && !/admin only/i.test(approveMissing.error?.message ?? ""),
    detail: "Does not approve the claimant fixture.",
  });

  if (baseline === "repo-shaped") {
    const archiveDenied = await query(ownerA.rpc("archive_business_listing", { _business_id: IDS.ready }));
    cell({
      id: "repo-own-a-archive-denied",
      baseline,
      role: "OWN-A",
      operation: "archive_business_listing",
      expect: "deny",
      observed: archiveDenied.error ? archiveDenied.error.message : "returned data",
      pass: Boolean(archiveDenied.error),
      detail: "Archive helper exists only on the repo-shaped replay.",
    });
  } else {
    const archiveMissing = await query(admin.rpc("archive_business_listing", { _business_id: IDS.ready }));
    cell({
      id: "live-archive-function-absent",
      baseline,
      role: "ADM",
      operation: "archive_business_listing",
      expect: "function does not exist",
      observed: archiveMissing.error ? archiveMissing.error.message : "returned data",
      pass: missingObject(archiveMissing),
      detail: "Confirmed-absent archive helper stays absent.",
    });
  }

  const existingClaim = await query(
    sessions.service.from("claim_requests").select("id").eq("business_id", IDS.unmatched).eq("requester_user_id", sessions.claimant.userId),
  );
  if (!opened(existingClaim)) {
    const claim = await query(
      claimant.from("claim_requests").insert({
        business_id: IDS.unmatched,
        requester_user_id: sessions.claimant.userId,
        requester_name: "Claimant Fixture",
        requester_email: "claimant@fxm-synthetic.test",
        requester_phone: "555-0107",
        status: "pending",
        authorized_confirmed: true,
      }).select("id"),
    );
    cell({
      id: `${baseline}-clm-insert-own-claim`,
      baseline,
      role: "CLM",
      operation: "insert own claim",
      expect: "allow",
      observed: claim.error ? claim.error.message : "inserted",
      pass: opened(claim),
      detail: "Pending claim on the unclaimed synthetic cart.",
    });
  }
  await expectOpen(baseline, "CLM", "read own claim", claimant.from("claim_requests").select("id").eq("business_id", IDS.unmatched));
  await expectClosed(baseline, "OWN-A", "read claimant claim", ownerA.from("claim_requests").select("id").eq("business_id", IDS.unmatched));
  await expectClosed(baseline, "ANON", "read claims after insert", anon.from("claim_requests").select("id"));

  const typo = await query(
    claimant.from("claim_requests").insert({
      business_id: IDS.typoProbe,
      requester_user_id: sessions.claimant.userId,
      requester_name: "Claimant Fixture",
      requester_email: "mistyped@fxm-synthetic.con",
      status: "pending",
      authorized_confirmed: true,
    }),
  );
  if (baseline === "repo-shaped") {
    cell({
      id: "repo-typo-email-rejected",
      baseline,
      role: "CLM",
      operation: "insert claim with .con email",
      expect: "trigger rejects",
      observed: typo.error ? typo.error.message : "inserted",
      pass: Boolean(typo.error) && /mistyped|typo|email/i.test(typo.error?.message ?? ""),
      detail: "reject_obvious_claim_email_typos is present only on the repo-shaped replay.",
    });
  } else {
    cell({
      id: "live-typo-email-not-blocked",
      baseline,
      role: "CLM",
      operation: "insert claim with .con email",
      expect: "trigger absent, insert succeeds",
      observed: typo.error ? typo.error.message : "inserted",
      pass: !typo.error,
      detail: "The typo guard is confirmed absent. This insert stays on the local database.",
    });
  }

  if (baseline === "live-shaped") {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    const anonUpload = await anon.storage.from("business-assets").upload(`${IDS.northPier}/anon.png`, png, {
      contentType: "image/png",
      upsert: true,
    });
    const otherUpload = await ownerB.storage.from("business-assets").upload(`${IDS.northPier}/other.png`, png, {
      contentType: "image/png",
      upsert: true,
    });
    const ownUpload = await ownerA.storage.from("business-assets").upload(`${IDS.northPier}/own.png`, png, {
      contentType: "image/png",
      upsert: true,
    });
    cell({
      id: "live-anon-storage-write-denied",
      baseline,
      role: "ANON",
      operation: "upload business-assets",
      expect: "deny",
      observed: anonUpload.error ? anonUpload.error.message : "uploaded",
      pass: Boolean(anonUpload.error),
      detail: "Public bucket read is separate from write.",
    });
    cell({
      id: "live-own-b-storage-write-denied",
      baseline,
      role: "OWN-B",
      operation: "upload into OWN-A prefix",
      expect: "deny",
      observed: otherUpload.error ? otherUpload.error.message : "uploaded",
      pass: Boolean(otherUpload.error),
      detail: "Storage write is limited to the owning business id prefix or an admin.",
    });
    cell({
      id: "live-own-a-storage-write-allowed",
      baseline,
      role: "OWN-A",
      operation: "upload into own prefix",
      expect: "allow",
      observed: ownUpload.error ? ownUpload.error.message : "uploaded",
      pass: !ownUpload.error,
      detail: "Synthetic 1x1 PNG on the local bucket only.",
    });
  }
}

async function reloadRest(dbUrl) {
  psql(dbUrl, ["-c", "NOTIFY pgrst, 'reload schema';"]);
  await sleep(1000);
}

async function mutationCheck(dbUrl, sessions) {
  const policy = "fxm_s7_mutation_leak_leads";
  psql(dbUrl, [
    "-c",
    `CREATE POLICY ${policy} ON public.leads FOR SELECT TO authenticated USING (true);`,
  ]);
  await reloadRest(dbUrl);
  let leaked = await query(sessions.ownerB.client.from("leads").select("id, internal_notes").eq("id", IDS.directA));
  if (!opened(leaked)) {
    const rest = run("docker", ["ps", "--format", "{{.Names}}"]);
    const name = rest.stdout.split("\n").find((item) => item.includes("rest"));
    if (name) {
      run("docker", ["restart", name.trim()]);
      await sleep(4000);
      leaked = await query(sessions.ownerB.client.from("leads").select("id, internal_notes").eq("id", IDS.directA));
    }
  }
  const openedDuringMutation = opened(leaked) && (leaked.data ?? []).some((row) => row.internal_notes === PRIVATE_A);
  psql(dbUrl, ["-c", `DROP POLICY IF EXISTS ${policy} ON public.leads;`]);
  await reloadRest(dbUrl);
  let restored = await query(sessions.ownerB.client.from("leads").select("id").eq("id", IDS.directA));
  if (!closed(restored)) {
    await sleep(1500);
    restored = await query(sessions.ownerB.client.from("leads").select("id").eq("id", IDS.directA));
  }
  report.mutation = {
    policy,
    negativeTestFailedOpen: openedDuringMutation,
    restoredToClosed: closed(restored),
  };
  cell({
    id: "s7-mutation-owner-b-reads-owner-a-lead",
    baseline: "live-shaped",
    role: "OWN-B",
    operation: "temporary permissive lead policy",
    expect: "negative test fails open, then closes again",
    observed: `open=${openedDuringMutation}; restored=${closed(restored)}`,
    pass: openedDuringMutation && closed(restored),
    detail: "A permissive SELECT policy was added and then dropped on the local database only.",
  });
}

function markdownTable(rows) {
  const header = "| Baseline | Role | Operation | Expect | Observed | Pass |\n|---|---|---|---|---|---|";
  const body = rows
    .map((row) => {
      const observed = String(row.observed ?? "").replace(/\|/g, "/").replace(/\n/g, " ");
      return `| ${row.baseline} | ${row.role} | ${row.operation} | ${row.expect} | ${observed} | ${row.pass ? "pass" : "FAIL"} |`;
    })
    .join("\n");
  return `${header}\n${body}`;
}

function writeEvidence() {
  mkdirSync(evidenceDir, { recursive: true });
  const when = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "full",
    timeStyle: "long",
  }).format(new Date());
  const head = run("git", ["rev-parse", "HEAD"]).stdout.trim();
  const migrationDiff = run("git", ["diff", "--name-only", "HEAD", "--", "supabase/migrations"]).stdout.trim();
  const counts = {
    cells: report.cells.length,
    failed: report.failures.length,
    denied: report.cells.filter((item) => item.expect === "deny" && item.pass).length,
    deniedFailed: report.cells.filter((item) => item.expect === "deny" && !item.pass).length,
  };
  const repo = report.catalogs["repo-shaped"];
  const live = report.catalogs["live-shaped"];
  const columnLine = (snapshot) => (snapshot ? snapshot.columns.join(", ") : "not collected");
  const text = `# Local ephemeral Supabase: migration replay + per-role JWT RLS

Generated: ${when}
HEAD at run: \`${head || "unknown"}\`
Label: ${report.label}

This run used the Supabase CLI and Docker on the VM. The API host was \`127.0.0.1\`. It does not prove production RLS. GitHub #15 and #17 cannot close from this increment.

Production https://foodxmobile.com was not queried, not migrated, and not used as a test target. No hosted Supabase project was provisioned. \`docs/proposals/fxm-004-business-outreach-crm-state.sql\` was not executed. No file was added under \`supabase/migrations\`. PR #13 was not rebased, merged, or closed. \`review_event_import\` was not restored. The vendor-lead-state migration from PR #36 was not implemented.

The script does not read a .env file. Shell variables that already pointed at a hosted project were discarded before clients were created: ${report.discardedHostedShellVariables ? "yes" : "none were set"}.
Migration files changed in this worktree versus HEAD: ${migrationDiff || "none"}.

## S5 replay

\`supabase db reset --local --no-seed\` exit ${report.migrationReset?.status ?? "not run"}.
Files: ${report.migrations.length}. Applied: ${report.migrations.filter((item) => item.applied).length}.
Log: [s5-migration-replay.txt](./s5-migration-replay.txt).

${report.notes.map((item) => `- ${item}`).join("\n")}

### Files

| File | Version | Applied | Descriptive GitHub filename |
|---|---|---|---|
${report.migrations
  .map((item) => `| ${item.filename} | ${item.version} | ${item.applied ? "yes" : "no"} | ${item.descriptiveGithubFilename ? "yes" : "no"} |`)
  .join("\n")}

## Baselines

Repo-shaped is the replay. Live-shaped starts from that database and runs \`scripts/local-supabase/live-shape.sql\`, which only drops objects the 2026-11-08 catalog confirmed absent. The public \`business-assets\` bucket is kept.

| Object | Repo-shaped | Live-shaped |
|---|---|---|
| business_outreach columns | ${columnLine(repo)} | ${columnLine(live)} |
| business-assets public | ${repo?.buckets?.find((item) => item.id === "business-assets")?.public ?? "n/a"} | ${live?.buckets?.find((item) => item.id === "business-assets")?.public ?? "n/a"} |
| claim FK on delete | ${repo?.claimFk?.[0]?.on_delete ?? "n/a"} | ${live?.claimFk?.[0]?.on_delete ?? "n/a"} |
| assign_business_owner mentions crm_state | ${repo?.assignBodyFlags?.mentionsCrmState ?? "n/a"} | ${live?.assignBodyFlags?.mentionsCrmState ?? "n/a"} |

Matched lead policy on the live-shaped baseline:

\`\`\`
${live?.policies?.find((item) => item.name === "owners read matched event inquiries")?.using_expr ?? "not collected"}
\`\`\`

## S6 role matrix

Real JWTs: anon key role \`anon\`, signed-in users role \`authenticated\`. The service role seeded rows and was not the caller for allow/deny cells.

Synthetic contacts use \`@fxm-synthetic.test\`. Businesses are North Pier Kitchen, Fox Lantern Bakery, Charlie Fixture Coffee, Declined Fixture Cart, and Revoked Fixture Cart. OWN-A and OWN-B are both in \`assigned_vendor_ids\` on one marketplace lead. Declined and revoked businesses are not in that array. ML-2 is assigned only to Charlie Fixture Coffee.

Cells: ${counts.cells}. Failed: ${counts.failed}. Deny cells that failed closed: ${counts.denied}. Deny cells that did not fail closed: ${counts.deniedFailed}.

### FXM-005 / #18

${report.finding18 ? report.finding18.statement : "The shared-lead check did not run."}
Confirmed: ${report.finding18 ? String(report.finding18.confirmed) : "n/a"}.

This is a known gap. It is not a passing isolation result, and it was not patched in this branch.

### Mutation spot-check

${report.mutation ? `Permissive policy \`${report.mutation.policy}\` made OWN-B read OWN-A's direct lead: ${report.mutation.negativeTestFailedOpen}. After drop, the read failed closed again: ${report.mutation.restoredToClosed}.` : "Not run."}

## Matrix

${markdownTable(report.cells)}

## What this does not prove

- Production RLS on the hosted database was not executed.
- F-1 was not applied, including on the local live-shaped database.
- Admin and owner screens were not browser-tested against this database.
- GitHub Actions for this repo runs \`npm test\` only. Docker-in-GitHub-Actions was not added. If that runner cannot start Docker, this VM log is the S5/S6 evidence.
- #15 and #17 cannot close.
`;
  writeFileSync(path.join(evidenceDir, "S5-S6-LOCAL-EPHEMERAL-SUPABASE.md"), text);
  const json = {
    label: report.label,
    provesProductionRls: false,
    canCloseIssues: false,
    head,
    discardedHostedShellVariables: report.discardedHostedShellVariables,
    versionComparison: report.versionComparison ?? null,
    finding18: report.finding18,
    mutation: report.mutation,
    failures: report.failures.map((item) => ({ id: item.id, observed: item.observed, detail: item.detail })),
    cells: report.cells,
    catalogs: report.catalogs,
  };
  writeFileSync(path.join(evidenceDir, "s5-s6-results.json"), `${JSON.stringify(json, null, 2)}\n`);
}

async function main() {
  discardHostedShellEnv();
  if (!existsSync(shapeFile)) throw new Error("Missing live-shape.sql");
  const proposal = path.join(root, "docs/proposals/fxm-004-business-outreach-crm-state.sql");
  if (!existsSync(proposal)) throw new Error("Proposal file missing; refusing to continue without the do-not-execute artifact.");
  const bridge = run("sysctl", ["-n", "net.bridge.bridge-nf-call-iptables"]);
  note(`Host net.bridge.bridge-nf-call-iptables=${(bridge.stdout || bridge.stderr).trim() || "unread"}.`);
  ensureStarted();
  const { apiUrl, dbUrl, anonKey, serviceKey } = readStatus();
  report.apiHost = new URL(apiUrl).host;
  mkdirSync(evidenceDir, { recursive: true });
  await replayMigrations(dbUrl);
  await reloadRest(dbUrl);
  report.catalogs["repo-shaped"] = catalog(dbUrl);
  const seeded = await seed(apiUrl, anonKey, serviceKey);
  await runMatrix("repo-shaped", dbUrl, seeded.sessions);
  psql(dbUrl, ["-f", shapeFile]);
  await reloadRest(dbUrl);
  report.catalogs["live-shaped"] = catalog(dbUrl);
  compareCatalogs(report.catalogs["repo-shaped"], report.catalogs["live-shaped"]);
  await runMatrix("live-shaped", dbUrl, seeded.sessions);
  await mutationCheck(dbUrl, seeded.sessions);
}

try {
  await main();
} catch (error) {
  const message = redact(error?.stack || error?.message || error);
  note(message);
  cell({
    id: "fatal",
    baseline: "n/a",
    role: "harness",
    operation: "run",
    expect: "complete",
    observed: message.split("\n")[0],
    pass: false,
    detail: message,
  });
} finally {
  try {
    writeEvidence();
  } catch (error) {
    console.error(redact(error?.stack || error?.message || error));
  }
}

const failed = report.failures.length;
console.log(`${report.label}: ${report.cells.length} cells, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

const BANNED_MARKERS = ["supabase.co", "akhmgnjmhvvmprvnwusp", "foodxmobile.com", "truckhub.lovable.app"];

function assertNoBannedMarker(value, label) {
  const haystack = String(value).toLowerCase();
  for (const marker of BANNED_MARKERS) {
    if (haystack.includes(marker)) {
      throw new Error(`Refusing ${label}: it contains ${marker}`);
    }
  }
}

/** Accept only an HTTP API on localhost. Hosted Supabase and the production site are rejected. */
export function assertLocalSupabaseUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Refusing Supabase URL that is not a valid URL");
  }
  if (parsed.protocol !== "http:") {
    throw new Error(`Refusing Supabase URL protocol ${parsed.protocol}`);
  }
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error(`Refusing non-local Supabase host ${parsed.hostname}`);
  }
  assertNoBannedMarker(url, "Supabase API URL");
  return parsed;
}

/** Accept only a Postgres URL on localhost. */
export function assertLocalPostgresUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Refusing database URL that is not a valid URL");
  }
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error(`Refusing database URL protocol ${parsed.protocol}`);
  }
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error(`Refusing non-local database host ${parsed.hostname}`);
  }
  assertNoBannedMarker(url, "database URL");
  return parsed;
}

export function valueFromStatusEnv(statusEnvText, name) {
  const line = statusEnvText
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  if (!line) {
    throw new Error(`supabase status did not report ${name}`);
  }
  return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
}

/** API URL must come from local `supabase status`, never from the repo root .env. */
export function localApiUrlFromStatus(statusEnvText) {
  const url = valueFromStatusEnv(statusEnvText, "API_URL");
  assertLocalSupabaseUrl(url);
  return url;
}

export function localDbUrlFromStatus(statusEnvText) {
  const url = valueFromStatusEnv(statusEnvText, "DB_URL");
  assertLocalPostgresUrl(url);
  return url;
}

const SYNTHETIC_EMAIL = /^[a-z0-9._+-]+@fxm-synthetic\.test$/i;

export type DatasetMarker = {
  source: "synthetic" | "phase0-audit-observation";
  importable: boolean;
};

/** Audit snapshots are observations. Only an explicitly synthetic, importable dataset may be seeded. */
export function datasetMayBeSeeded(dataset: DatasetMarker): boolean {
  return dataset.source === "synthetic" && dataset.importable === true;
}

export function syntheticContactProblems(values: string[]): string[] {
  return values.filter((value) => !SYNTHETIC_EMAIL.test(value));
}

const BANNED_FIXTURE_TEXT = ["akhmgnjmhvvmprvnwusp", "truckhub.lovable.app", "foodxmobile.com"];

export function bannedFixtureText(serialized: string): string[] {
  return BANNED_FIXTURE_TEXT.filter((token) => serialized.includes(token));
}

export type AssignmentStatus = "offered" | "accepted" | "declined" | "revoked" | "expired";

export type Actor =
  | { role: "anonymous" }
  | { role: "admin"; userId: string }
  | { role: "owner"; userId: string; businessId: string; suspended?: boolean };

export type FixtureLead = {
  id: string;
  businessId: string | null;
  contactName: string;
  contactEmail: string;
  stage: string;
  internalNotes: string | null;
  assignments: { businessId: string; status: AssignmentStatus; notes: string | null }[];
};

export type RouteDecision = "allow" | "redirect-auth" | "redirect-owner" | "suspended";

/** Mirrors OwnerLeads / OwnerMessages today: direct business_id only. */
export function currentOwnerLeadIds(ownerBusinessId: string, leads: FixtureLead[]): string[] {
  return leads.filter((lead) => lead.businessId === ownerBusinessId).map((lead) => lead.id);
}

/**
 * Privacy assumption for role tests.
 * Accepted marketplace assignment can see that vendor's own customer view.
 * Offered, declined, revoked, expired, and unmatched vendors cannot.
 * Anonymous callers cannot. Admins can. Owners cannot read another vendor's notes.
 */
export function canReadCustomer(actor: Actor, lead: FixtureLead): boolean {
  if (actor.role === "anonymous") return false;
  if (actor.role === "admin") return true;
  if (actor.suspended) return false;
  if (lead.businessId !== null && lead.businessId === actor.businessId) return true;
  const assignment = lead.assignments.find((item) => item.businessId === actor.businessId);
  return assignment?.status === "accepted";
}

/** Notes on one marketplace assignment. Declined and revoked vendors do not keep access. */
export function assignmentNotesVisibleTo(actor: Actor, lead: FixtureLead): string[] {
  if (actor.role === "admin") {
    return lead.assignments.flatMap((item) => (item.notes ? [item.notes] : []));
  }
  if (actor.role !== "owner" || actor.suspended) return [];
  const own = lead.assignments.find((item) => item.businessId === actor.businessId && item.status === "accepted");
  return own?.notes ? [own.notes] : [];
}

export function canReadVendorNote(actor: Actor, noteBusinessId: string): boolean {
  if (actor.role === "admin") return true;
  if (actor.role !== "owner" || actor.suspended) return false;
  return actor.businessId === noteBusinessId;
}

export function canEditAssignment(actor: Actor): boolean {
  return actor.role === "admin";
}

export function canInvokeOutreachCrmState(actor: Actor): boolean {
  return actor.role === "admin";
}

/** Mirrors AdminLayout: anonymous goes to auth, signed-in non-admins go to /owner. */
export function adminRouteDecision(actor: Actor): RouteDecision {
  if (actor.role === "anonymous") return "redirect-auth";
  if (actor.role !== "admin") return "redirect-owner";
  return "allow";
}

/** Mirrors OwnerLayout's user and suspended-account checks. */
export function ownerRouteDecision(actor: Actor): RouteDecision {
  if (actor.role === "anonymous") return "redirect-auth";
  if (actor.role === "owner" && actor.suspended) return "suspended";
  return "allow";
}

/** Public discovery and inquiry pages do not require an account. */
export function publicDiscoveryAllowed(_actor: Actor): boolean {
  return true;
}

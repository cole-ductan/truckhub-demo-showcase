export type LeadAccessErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "invalid_transition"
  | "migration_required";

export const LEAD_ACCESS_MESSAGE: Record<LeadAccessErrorCode, string> = {
  unauthenticated: "Sign in is required to view leads.",
  forbidden: "You cannot view or change that lead.",
  not_found: "That lead is not available.",
  invalid_transition: "That assignment change is not allowed.",
  migration_required: "Per-vendor marketplace lead state is not available in this database yet.",
};

export class LeadAccessError extends Error {
  readonly code: LeadAccessErrorCode;

  constructor(code: LeadAccessErrorCode, message: string = LEAD_ACCESS_MESSAGE[code]) {
    super(message);
    this.name = "LeadAccessError";
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

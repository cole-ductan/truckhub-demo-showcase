/**
 * Payload for the existing submit_event_inquiry RPC.
 * Matches the previous BookFoodTruck call, which spread the form and then
 * set category_id and consent. The honeypot field is removed.
 */
export function eventInquiryPayloadFromForm(form: object): Record<string, unknown> {
  const source = form as Record<string, unknown>;
  const payload: Record<string, unknown> = { ...source };
  delete payload.hp;
  payload.category_id = source.category_id || null;
  payload.consent = true;
  return payload;
}

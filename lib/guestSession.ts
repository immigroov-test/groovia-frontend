// A guest's identity for consent purposes ONLY - not chat state, and deliberately not
// part of lib/chatStorage.ts's LS_CHAT_KEYS: "New chat" / clearLocalChat() must not
// erase a guest's already-recorded consent, or they'd be re-gated on the Groovia AI
// Terms modal every time they start a fresh conversation.
//
// Used wherever a signed-out visitor needs to be attributed for an active-consent
// write that has no user_id and (not yet) a booking_id - currently the Groovia AI
// Terms gate and the cookie banner's Cookie Policy record.
const KEY = 'ig_guest_consent_session_id';

export function guestConsentSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // Private browsing / storage disabled: fall back to a per-load id. The consent
    // still gets recorded server-side (against this throwaway id); it just won't be
    // recognized as "already accepted" on the next page load, which is the same
    // degraded behaviour every localStorage-dependent feature in this app already has.
    return crypto.randomUUID();
  }
}

# Future Plans

Deferred work that is intentionally not done yet. Each item notes why it is held
and what "done" looks like so it can be picked up as a focused task.

## Tier 2 refactor of the landing/chat flow (`components/ChatInterface.tsx`)

**Status:** Held. Do as a dedicated, runtime-verifiable pass (not bundled with feature work).

**Why held:** `ChatInterface` is the core chat flow (~900 lines) and has been reshaped
repeatedly (guided tour, gating, per-session reset, the mimicked find-a-mentor
mini-conversation, section takeover). A refactor of this size can only be trusted after
clicking through the whole flow on a real browser: upload -> gate -> intent -> topic ->
country -> results -> re-offer, plus the tour, rate-limit, and persistence paths. Verifying
only with `tsc` + build would risk a subtle effect-timing / state-ordering regression that
lands on deploy, in the one place users care about most.

**Scope (do in order, each committed and verified on staging before the next):**

1. Extract isolated hooks (lowest risk first):
   - `useMentorFacets(mentorTopic)` -> `{ facets, facetsLoading, loadFacets, mentorCountries }`
   - `useChatPersistence()` -> hydration (fresh-session reset vs same-session restore),
     the LS persistence effects, and `handleNewChat`
   - `useLandingTour({ scrollRef, section1Ref, section2Ref, landingRef })` -> the guided
     tour + `tourActive` + `skipTour`
2. Introduce a `useReducer` state machine for the flow phase, replacing the scattered
   booleans + LS/session flags. Explicit states:
   `booting -> needsResume -> needsIntent -> mentorTopic -> mentorCountry -> chatting -> gated(needsLogin) -> rateLimited`
   with named events (`RESUME_UPLOADED`, `INTENT_SELECTED`, `MENTOR_TOPIC`, `MENTOR_COUNTRY`,
   `MESSAGE_SENT`, `SESSION_STARTED`, `CLEARED`, `LOGGED_IN`, `RATE_LIMITED`). One reducer
   owns every transition; a single effect persists the relevant slice. This kills the
   "which flag wins" ambiguity that caused the auto-resume-restores-old-chat and
   clear-chat bugs.
3. Split rendering into `<Composer>`, `<MessageList>`, `<IntentPicker>`, `<LandingSections>`.
   `ChatInterface` becomes a ~150-line orchestrator; each piece is unit-testable.
4. Make the tour event-driven (`onAnimationComplete` / a promise from `TypeText`) instead of
   the four hand-tuned `setTimeout`s, so changing an animation duration never desyncs it.

**Optional companion:** replace the `window` CustomEvents (`groovia:history-refresh`) with a
small typed store (Zustand) shared across components.

**Done means:** behavior-preserving (every flow above verified on staging), `ChatInterface`
reduced to an orchestrator, and the persistence bugs structurally impossible via the state
machine.

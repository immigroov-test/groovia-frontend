// Admin-facing copy. Every string an admin reads lives here, so the wording of a panel can be changed
// without touching the component that renders it.
//
// The section subtitles used to be paragraph-length ("A traceable, admin-only log of everything on the
// platform: bookings and status changes, payments, payouts, money-ledger movements, referral
// commissions, and pricing / commission changes. Filter by a booking id to follow one booking end to
// end."). An admin panel is used daily by people who already know what it does, so each is now one
// line that says what the section is for; the detail that mattered is kept, the enumeration is not.
export const ADMIN = {
  title: 'Admin',
  subtitle: 'Manage mentors and review applications.',
  pendingTitle: 'Pending Applications',
  pendingSubtitle: 'Review and approve mentors who have applied to join Immigroov.',
  activeTitle: 'Active Mentors',
  activeSubtitle: 'Currently approved and visible to candidates.',
  suspendedTitle: 'Suspended Mentors',
  suspendedSubtitle: 'Paused profiles - not visible to candidates.',
  empty: 'None.',
  approve: 'Approve',
  reject: 'Reject',
  decline: 'Decline',
  requestChanges: 'Request changes',
  suspend: 'Suspend',
  reinstate: 'Reinstate',

  // Dashboard sections.
  sections: {
    profileUpdates: 'Edits from approved mentors. Their live profile stays up until you approve.',
    sessionTypes: 'New session types from live mentors. They go public once approved.',
    referrals: 'Codes, who used them, and the commission split. Approving one sends it to Payouts.',
    reviews: "Ratings and written reviews. Hiding one removes it from the mentor's public rating.",
    activity: 'Admin-only log of every booking, payment, payout and pricing change. Filter by booking id to follow one end to end.',
    strikes: 'Mentors with accrued no-show strikes. Reset if a dispute is resolved in their favour.',
    pricing: "Platform fee and tax are added on top of the mentor's price, by customer country (DEFAULT is the fallback). Mentor commission is separate and taken out of their price.",
  },
} as const;

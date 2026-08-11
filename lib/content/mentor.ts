// Fixed lists and templates a mentor picks from, plus mentor-facing copy.
// A mentor's areas of expertise (shown as tags on cards + used as browse filters).
// Fixed set so it stays consistent across mentors. Value = stored code, label = shown.
export const EXPERTISE_CATEGORIES = [
  { value: 'job_career',   label: 'Career' },
  { value: 'study_abroad', label: 'Study Abroad' },
  { value: 'visa_pr',      label: 'Visa & PR' },
  { value: 'life_settling', label: 'Life Abroad' },
  { value: 'work_visa',    label: 'Work Visa' },
  { value: 'asylum',       label: 'Asylum & Refugee' },
  { value: 'family_visa',  label: 'Family Reunification' },
  { value: 'entrepreneur', label: 'Entrepreneur & Startup' },
] as const;

export const EXPERTISE_CATEGORY_MAP: Record<string, string> =
  Object.fromEntries(EXPERTISE_CATEGORIES.map((c) => [c.value, c.label]));

// Fixed set of session categories, so mentors pick from a consistent list instead
// of inventing free-text variants (keeps browse/filtering clean).
export const SERVICE_CATEGORIES = [
  'Visa & Immigration',
  'Jobs & Careers',
  'Housing & Relocation',
  'Education & Studies',
  'Finance & Taxes',
  'Culture & Daily Life',
  'Business & Startup',
  'General Guidance',
] as const;

// Starter template pre-filled into a new session's description (rich text). Mentors
// edit the sections; a fuller "choose a template" picker can build on this later.
// When session reminders are sent, in one place so the confirmation page + any other copy stay in
// sync with the actual reminder schedule (backend services/notifications.py _REMINDER_WINDOWS).
export const REMINDER_NOTICE = '24 hours and 30 minutes';

export const SERVICE_DESCRIPTION_TEMPLATE =
  "<p><strong>What we&rsquo;ll cover</strong></p>" +
  "<ul><li>First thing you&rsquo;ll help with</li><li>Second thing</li></ul>" +
  "<p><strong>Who this is for</strong></p>" +
  "<p>Describe the ideal mentee (e.g. recent grads targeting the Dutch job market).</p>" +
  "<p><strong>What you&rsquo;ll walk away with</strong></p>" +
  "<p>The concrete outcome or next steps after the session.</p>";


// Mentor hub sections that aren't built yet. Kept here so the wording is consistent and easy to drop
// once each ships.
export const MENTOR_HUB = {
  referralsSoon: 'Refer new mentees and earn a commission on their first session. Coming soon.',
  webinarsSoon: 'Host group sessions and webinars for multiple attendees.',
  earningsSoon: 'Your session earnings and payout history will appear here.',
} as const;

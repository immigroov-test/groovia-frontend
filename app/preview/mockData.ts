// Mock data for the /preview gallery. Lets the real, backend-driven components
// (booking widget, booking manager) render offline with realistic data.
import type { Mentor } from '../../lib/types';
import type { ManagedBooking } from '../../components/BookingManager';

export const mockMentor: Mentor = {
  id: '1', slug: 'maya-singh', display_name: 'Maya Singh',
  headline: 'Ex-Google PM who moved India → Netherlands on a Blue Card',
  bio: 'Six years navigating the Dutch tech market and the IND sponsor system. I help engineers and PMs land a role, sort the 30% ruling, and settle in Amsterdam without the guesswork.',
  photo_url: null, expertise_country_codes: ['NL', 'DE', 'SE'],
  expertise_categories: ['job_career', 'visa_pr'], languages: ['English', 'Hindi'],
  professional_domains: ['IT'], years_lived_experience: 6, timezone: 'Europe/Amsterdam',
};

export const mockMentors: Mentor[] = [
  mockMentor,
  { ...mockMentor, id: '2', slug: 'lars-jansen', display_name: 'Lars Jansen',
    headline: 'Relocation & housing in Amsterdam for new arrivals',
    expertise_country_codes: ['NL'], expertise_categories: ['life_settling'], languages: ['English', 'Dutch'] },
  { ...mockMentor, id: '3', slug: 'priya-mehta', display_name: 'Priya Mehta',
    headline: 'Study-abroad & student visa guidance for the EU',
    expertise_country_codes: ['DE', 'FR'], expertise_categories: ['study_abroad'], languages: ['English'] },
];

export const mockServices = [
  { id: 's1', title: 'Visa & PR guidance', type: 'video', duration: 60, category: 'Visa & PR',
    description: 'Blue Card, HSM and the IND sponsor route, explained for your exact case.',
    set_price: 60, set_currency: 'EUR' },
  { id: 's2', title: 'Career strategy call', type: 'video', duration: 45, category: 'Career',
    description: 'CV review, job-search plan and interview prep for the Dutch tech market.',
    set_price: 45, set_currency: 'EUR' },
  { id: 's3', title: 'Quick question (chat)', type: 'dm', duration: 30, category: 'Life abroad',
    description: 'A week of async DM follow-ups for smaller questions.',
    set_price: 20, set_currency: 'EUR' },
];

// A fortnight of availability on weekdays, in the viewer's own timezone.
export function mockSlots(): { slot_start: string; slot_end: string }[] {
  const out: { slot_start: string; slot_end: string }[] = [];
  const base = new Date(); base.setHours(0, 0, 0, 0);
  const hours = [9, 10, 11, 14, 15, 16];
  for (let d = 1; d <= 10; d++) {
    const day = new Date(base); day.setDate(base.getDate() + d);
    const wd = day.getDay();
    if (wd === 0 || wd === 6) continue; // skip weekends
    for (const h of hours) {
      const s = new Date(day); s.setHours(h, 0, 0, 0);
      const e = new Date(s); e.setHours(h + 1, 0, 0, 0);
      out.push({ slot_start: s.toISOString(), slot_end: e.toISOString() });
    }
  }
  return out;
}

function isoIn(days: number, hour = 15): string {
  const d = new Date(); d.setDate(d.getDate() + days); d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}
function isoInEnd(days: number, hour = 15): string {
  const d = new Date(); d.setDate(d.getDate() + days); d.setHours(hour + 1, 0, 0, 0);
  return d.toISOString();
}

function emptyBooking(): ManagedBooking {
  return {
    id: '', status: 'confirmed', slot_time: null, slot_end: null, mentor_tz: 'Europe/Amsterdam',
    meeting_url: null, service_title: null, service_duration: 60, other_name: null, other_email: null,
    deadline_state: null, reschedule_count: 0, no_show_by: null, offer_id: null, offer_by: null,
    offer_status: null, range_start: null, range_end: null, selected_time: null, req_id: null,
    req_kind: null, req_initiated_by: null, req_status: null, req_respond_by: null,
  };
}

export function mockBookings(role: 'mentee' | 'mentor'): ManagedBooking[] {
  const other = role === 'mentee' ? 'Maya Singh' : 'Aditya Rao';
  return [
    { ...emptyBooking(), id: 'bk-upcoming', status: 'confirmed',
      slot_time: isoIn(3), slot_end: isoInEnd(3),
      meeting_url: 'https://meet.google.com/abc-defg-hij',
      service_title: 'Visa & PR guidance', service_duration: 60,
      other_name: other, deadline_state: 'free', reschedule_count: 0 },
    { ...emptyBooking(), id: 'bk-past', status: 'completed',
      slot_time: isoIn(-6), slot_end: isoInEnd(-6),
      service_title: 'Career strategy call', service_duration: 45,
      other_name: other, deadline_state: null, reschedule_count: 1 },
  ];
}

export const MOCK_QUOTE = { text: 'People who say it cannot be done should not interrupt those who are doing it.', author: 'George Bernard Shaw' };

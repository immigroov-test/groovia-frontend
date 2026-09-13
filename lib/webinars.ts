export interface Webinar {
  id: string;
  slug: string;
  title: string;
  description: string;
  banner_url?: string | null;
  mentor_id?: string | null;
  mentor?: { display_name: string; slug: string; photo_url?: string | null } | null;
  source?: 'admin' | 'mentor_request';
  status: string;
  starts_at: string;
  duration_minutes: number;
  timezone: string;
  registration_deadline?: string | null;
  capacity: number;
  registration_count?: number;
  is_paid: boolean;
  price: number;
  currency: string;
  meeting_provider?: string;
  meeting_url?: string | null;
  admin_note?: string | null;
}

export function webinarPrice(webinar: Webinar): string {
  if (!webinar.is_paid) return 'Free';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: webinar.currency }).format(webinar.price);
  } catch {
    return `${webinar.currency} ${webinar.price}`;
  }
}

export function webinarWhen(webinar: Webinar): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(webinar.starts_at));
}

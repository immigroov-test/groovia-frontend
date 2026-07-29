// Shared TypeScript types for app data shapes returned by the backend / Supabase.

export interface Mentor {
  id: string;
  slug: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  photo_url: string | null;
  expertise_country_codes: string[];
  expertise_categories: string[];
  service_categories?: string[];   // derived from the mentor's configured services (browse filter facet)
  specializations?: string[];      // mentor's editable free-text tags (feed search)
  languages: string[];
  professional_domains: string[];
  years_lived_experience: number | null;
  years_professional_experience?: number | null;
  city?: string | null;
  country?: string | null;   // ISO-3166 alpha-2 of where the mentor is based
  home_country_code?: string | null;   // ISO-3166 alpha-2 of the mentor's origin / home country
  timezone?: string | null;
  avg_rating?: number | null;
  review_count?: number | null;
  smart_pricing?: boolean | null;
  min_price?: number | null;
  price_currency?: string | null;
}

export interface AvailabilitySlot {
  start_time: number;
  end_time: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

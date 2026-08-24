import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/site';
import { backendBaseUrl } from '../lib/backend';

interface MentorSlug { slug: string }

// BUG-058: no sitemap existed at all, so search engines had no reliable way to discover mentor
// profile pages (there's no other page that links every mentor). Regenerated on each request
// (revalidate) rather than at build time, so a newly-approved mentor shows up without a redeploy.
async function mentorSlugs(): Promise<MentorSlug[]> {
  try {
    const res = await fetch(`${backendBaseUrl()}/mentors?limit=300`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.mentors ?? []).map((m: { slug: string }) => ({ slug: m.slug })).filter((m: MentorSlug) => m.slug);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/home`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/mentors`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/mentor/register`, changeFrequency: 'monthly', priority: 0.6 },
    // The one public legal page - all fourteen documents. /terms is a 308 to here, so
    // it is not listed: advertising a URL that only redirects wastes crawl budget and
    // splits the signal between two addresses for the same content.
    { url: `${SITE_URL}/privacy`, changeFrequency: 'monthly', priority: 0.3 },
  ];
  const mentors = await mentorSlugs();
  return [
    ...staticPages,
    ...mentors.map(({ slug }) => ({
      url: `${SITE_URL}/mentors/${slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}

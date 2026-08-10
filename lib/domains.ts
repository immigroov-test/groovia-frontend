// Domains of expertise, in ONE place. This list used to be duplicated: the onboarding form had the
// full set while the profile edit form carried a stunted 20-item copy, so an existing mentor searching
// "Supply Chain" got "No results" for a domain new mentors could pick freely (BUG-128). Both the
// primary domain and the additional-domains picker read from here, so the two can never disagree.
export const DOMAINS: string[] = [
  // Tech & data
  'Software Engineering', 'Web Development', 'Mobile Development', 'DevOps & Cloud', 'Cybersecurity',
  'Data Science & AI', 'Machine Learning', 'Data Engineering', 'Data Analytics', 'Blockchain & Web3',
  'QA & Testing', 'IT Support & Systems', 'Game Development', 'Embedded & Hardware',
  // Product, design & marketing
  'Product Management', 'Project & Program Management', 'Design (UX/UI)', 'Graphic Design',
  'Marketing', 'Digital Marketing', 'Content & Copywriting', 'SEO & Growth', 'Social Media',
  'Sales', 'Business Development', 'Customer Success',
  // Business, finance & ops
  'Finance & Banking', 'Accounting & Audit', 'Investment & Trading', 'Financial Planning',
  'Consulting', 'Strategy', 'Operations', 'Supply Chain & Logistics', 'Procurement',
  'HR & Recruiting', 'Entrepreneurship', 'Startups', 'E-commerce', 'Real Estate',
  // Science, health & engineering
  'Healthcare', 'Nursing', 'Pharmacy', 'Biotechnology', 'Public Health', 'Mental Health & Therapy',
  'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering', 'Chemical Engineering',
  'Manufacturing', 'Automotive', 'Energy & Utilities', 'Architecture', 'Research',
  // People, public & creative
  'Education & Teaching', 'Academia & PhD', 'Law & Legal', 'Immigration Law',
  'Government & Policy', 'Non-profit & NGO', 'Media & Journalism', 'Film & Video',
  'Music & Audio', 'Writing & Publishing', 'Hospitality & Tourism', 'Aviation',
  'Fashion & Beauty', 'Sports & Fitness', 'Agriculture', 'Skilled Trades',
];

export const DOMAIN_OPTIONS = DOMAINS.map((d) => ({ value: d, label: d }));

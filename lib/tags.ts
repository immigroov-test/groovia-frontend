export interface TagSuggestionInput {
  domains?: string[];             // Domains of Expertise; the first is the mentor's PRIMARY field
  expertiseCountries?: string[];  // (unused now) kept for call-site compatibility
  homeCountry?: string;           // (unused now)
  country?: string;               // (unused now)
}

// Concrete specialization ideas per primary domain, plus generic angles that fit almost any
// profession. These are one-tap examples for the free-text Specializations field, meant to spark the
// mentor's OWN specifics. BUG-107: they must NOT just repeat the Domains of Expertise (or countries)
// the mentor already picked, which made the suggestions pointless.
const GENERIC_SPECIALIZATIONS = [
  'Career transition', 'Interview preparation', 'CV & portfolio review',
  'Salary negotiation', 'Roadmap & upskilling', 'Building your network',
];

const SPECIALIZATIONS_BY_DOMAIN: Record<string, string[]> = {
  'Software Engineering': ['System design', 'Coding interviews', 'Code review', 'Backend architecture'],
  'Web Development': ['React', 'Frontend architecture', 'Full-stack projects', 'Web performance'],
  'Mobile Development': ['iOS', 'Android', 'React Native', 'App store launch'],
  'DevOps & Cloud': ['Kubernetes', 'CI/CD pipelines', 'AWS architecture', 'Infrastructure as code'],
  'Cybersecurity': ['Penetration testing', 'Security audits', 'Cloud security', 'SOC / incident response'],
  'Data Science & AI': ['ML in production', 'Analytics case studies', 'A/B testing', 'Building a portfolio'],
  'Machine Learning': ['Model deployment', 'MLOps', 'Computer vision', 'NLP'],
  'Data Engineering': ['Data pipelines', 'ETL design', 'Warehouse modeling', 'Streaming data'],
  'Data Analytics': ['Dashboards & BI', 'SQL for analysis', 'Product analytics', 'Storytelling with data'],
  'QA & Testing': ['Test automation', 'CI test pipelines', 'Performance testing', 'QA strategy'],
  'Product Management': ['Product strategy', 'Roadmapping', 'PM interviews', 'Stakeholder management'],
  'Project & Program Management': ['Agile delivery', 'PMP prep', 'Risk management', 'Stakeholder alignment'],
  'Design (UX/UI)': ['Portfolio review', 'Design systems', 'User research', 'Prototyping'],
  'Marketing': ['Go-to-market', 'Brand strategy', 'Campaign planning', 'Positioning'],
  'Digital Marketing': ['Paid ads', 'SEO', 'Email marketing', 'Funnel optimization'],
  'Sales': ['Cold outreach', 'Pipeline management', 'Closing deals', 'B2B sales'],
  'Business Development': ['Partnerships', 'Market entry', 'Deal sourcing', 'Go-to-market'],
  'Finance & Banking': ['Financial modeling', 'Valuation', 'IB interviews', 'FP&A'],
  'Accounting & Audit': ['ACCA / CPA prep', 'Audit process', 'Financial reporting', 'Tax basics'],
  'Consulting': ['Case interviews', 'Frameworks', 'Client management', 'Slide writing'],
  'Strategy': ['Market analysis', 'Business cases', 'OKRs & planning', 'Competitive strategy'],
  'Operations': ['Process improvement', 'Lean / Six Sigma', 'KPIs & dashboards', 'Scaling ops'],
  'Supply Chain & Logistics': ['Procurement', 'Inventory optimization', 'Cost management', 'S&OP planning'],
  'HR & Recruiting': ['Resume screening', 'Hiring strategy', 'Employer branding', 'Interviewing'],
  'Entrepreneurship': ['Idea validation', 'Fundraising', 'Go-to-market', 'MVP building'],
  'Startups': ['Fundraising', 'Product-market fit', 'Early hiring', 'Growth'],
  'Healthcare': ['Clinical career paths', 'Licensing abroad', 'Residency applications'],
  'Mechanical Engineering': ['CAD & design', 'Manufacturing processes', 'Project engineering'],
  'Electrical Engineering': ['Circuit design', 'Embedded systems', 'Power systems'],
  'Civil Engineering': ['Structural design', 'Project management', 'Site engineering'],
  'Education & Teaching': ['Curriculum design', 'Admissions & applications', 'Study abroad'],
  'Academia & PhD': ['PhD applications', 'Research proposals', 'Publishing papers', 'Postdoc search'],
  'Law & Legal': ['Contract review', 'Legal career paths', 'Qualifying abroad'],
  'Immigration Law': ['Visa strategy', 'PR / residency paths', 'Work permits', 'Citizenship'],
};

// Returns specialization example chips for the mentor's PRIMARY domain (domains[0]), topped up with
// generic angles. Never echoes the domains/countries themselves.
export function suggestTags({ domains }: TagSuggestionInput): string[] {
  const primary = (domains ?? []).find((d) => (d || '').trim());
  const base = (primary && SPECIALIZATIONS_BY_DOMAIN[primary]) || [];
  const out: string[] = [];
  const push = (t: string) => {
    const v = (t || '').trim();
    if (v && !out.some((x) => x.toLowerCase() === v.toLowerCase())) out.push(v);
  };
  base.forEach(push);
  GENERIC_SPECIALIZATIONS.forEach(push);
  return out.slice(0, 8);
}

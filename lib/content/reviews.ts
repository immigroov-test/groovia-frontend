// Session reviews shown on the homepage. Deliberately not linked to any mentor.
export interface SessionReview {
  quote: string;
  rating: number;
  name: string;
  date: string;
  from: string;
  to: string;
  topic: string;
}

export const SESSION_REVIEWS: SessionReview[] = [
  { rating: 5, name: 'Gopala Krishnan', date: '8 Jun 2025', from: 'IN', to: 'NL', topic: 'Job Abroad & Career Growth',
    quote: 'The mentor gave structured guidance on how to develop my skills strategically and move toward a better job role. The direction was clear, actionable, and motivating.' },
  { rating: 5, name: 'Anish A.', date: '9 Jun 2025', from: 'IN', to: 'GB', topic: 'Country Fit Assessment',
    quote: 'The session felt genuine and transparent. The mentor was patient, listened carefully, and gave practical clarity on every point.' },
  { rating: 5, name: 'Muni Deepak', date: '17 Jun 2025', from: 'IN', to: 'DE', topic: 'Job Abroad & Career Growth',
    quote: 'I received very useful suggestions and actionable tips on how to begin my job search and prepare for interviews in Europe. Simple and realistic advice.' },
  { rating: 5, name: 'Nirmal Jacqueline R.', date: '17 Jun 2025', from: 'IN', to: 'IE', topic: 'Country Fit Assessment',
    quote: 'The mentor offered great clarity about which route suits me best and how to prioritize my next steps. Straightforward and confidence-boosting.' },
  { rating: 5, name: 'Aadarsh Velu', date: '20 Jun 2025', from: 'IN', to: 'SE', topic: 'Country Fit Assessment',
    quote: 'They understood my background before suggesting not only the Netherlands but also Sweden, Luxembourg, and Ireland. The insights on cost of living and utilities were on point.' },
  { rating: 5, name: 'Gandhimathi G.', date: '22 Jun 2025', from: 'IN', to: 'DK', topic: 'Job Abroad & Career Growth',
    quote: 'The mentor shared detailed steps to grab job opportunities in Europe. The examples and resources provided were extremely valuable.' },
  { rating: 4, name: 'Balaji M.', date: '5 Jul 2025', from: 'IN', to: 'NL', topic: 'Job Abroad & Career Growth',
    quote: 'I liked how the mentor guided me through profile creation and CV improvements. The feedback was direct and very practical.' },
  { rating: 4, name: 'Rajesh Gunasekaran', date: '17 Jul 2025', from: 'IN', to: 'NL', topic: 'Job Abroad & Career Growth',
    quote: 'The session was tailored perfectly, from ATS resume techniques to personal branding on LinkedIn. The advice was detailed and implementable.' },
  { rating: 5, name: 'Kumudhini V.', date: '21 Jul 2025', from: 'IN', to: 'GB', topic: 'Job Abroad & Career Growth',
    quote: 'The session was super interactive and easy to follow. The mentor gave honest, clear answers and ensured we understood each concept thoroughly.' },
  { rating: 5, name: 'Veewin Muthukrishnan', date: '22 Jul 2025', from: 'IN', to: 'IE', topic: 'Country Fit Assessment',
    quote: 'I got real clarity from the mentor. The conversation felt personal, friendly, and encouraging, like talking to someone who genuinely cares about your journey.' },
  { rating: 5, name: 'Pandiarajan', date: '9 Aug 2025', from: 'IN', to: 'NL', topic: 'Job Abroad & Career Growth',
    quote: 'The mentor answered all my questions clearly and encouraged me to take structured next steps. The overall experience felt thoughtful and professional.' },
  { rating: 5, name: 'Vignesh KM', date: '20 Aug 2025', from: 'IN', to: 'FR', topic: 'Visa, Residency & Settle Abroad',
    quote: 'Every step of the visa process was explained clearly from scratch. The clarity and depth of information were excellent.' },
  { rating: 4, name: 'Vivek Gaikhe', date: '15 Sep 2025', from: 'IN', to: 'AU', topic: 'Visa, Residency & Settle Abroad',
    quote: 'The mentor shared concise and easy-to-follow information. I now know exactly what documents I need and how to prepare for applications.' },
  { rating: 5, name: 'Kaleeswaran S.M.', date: '18 Sep 2025', from: 'IN', to: 'DE', topic: 'Visa, Residency & Settle Abroad',
    quote: 'The mentor offered practical advice on migrating to Germany, from job platforms to visa steps. Clear, professional, and insightful.' },
];

export const REVIEW_AVERAGE = SESSION_REVIEWS.reduce((sum, r) => sum + r.rating, 0) / SESSION_REVIEWS.length;

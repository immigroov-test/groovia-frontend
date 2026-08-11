// Public-facing marketing copy: landing sections, nav labels, About and Contact.
export const MARKETING = {
  brandIntro: {
    headline: 'Peer-to-Peer Personalized Immigration Mentoring Platform',
    // Three carded lines, mirroring the Groovia feature cards (icon + text).
    cards: [
      'Connect with verified mentors, expats and locals who have already made the move.',
      'Not just a platform, a movement of people helping people move smarter.',
      'Powered by Groovia (Agentic) AI.',
    ],
  },
  hero: {
    title: 'Try Groovia?',
    intro:
      "Tell me where you want to go, and I'll plan the route and connect you with people who've already made the move.",
    features: [
      'Discover 3-5 countries that fit your skills and budget.',
      "Get matched with mentors who've already made the move.",
      'Instant and accurate answers on visas, jobs, housing etc.',
    ],
  },
  sidebar: {
    chat: 'Home',
    mentors: 'Mentors',
    account: 'Account',
    mentorPortal: 'Join as Mentor',
    mentorHub: 'Mentor Dashboard',
    about: 'About',
    contact: 'Contact',
    admin: 'Admin',
    history: 'Recent chats',
    historyEmpty: 'No previous chats yet.',
  },
  quote: {
    text: 'Venture across the oceans and seek prosperity.',
    author: 'Avvaiyar',
  },
  // Titles shown on the login popup - decoupled from `whyJoin` (used on About) so
  // they can be edited independently.
  authPoints: [
    'Guidance That Fits Your Life',
    'Real-Time Agentic AI Assistance',
    'Handpicked Mentors, Not Just Volunteers',
    'Honest Answers, Not Just Encouragement',
    'Private, Personal Mentorship',
    'You Move Forward Faster',
  ],
  // Reasons to join - titles surface on the login popup; full text on About.
  whyJoin: [
    {
      title: 'Guidance That Fits Your Life',
      body: 'Our mentors tailor their advice to your exact situation, goals, and questions, not generic info dumps.',
    },
    {
      title: 'Handpicked Mentors, Not Just Volunteers',
      body: 'We select expats and locals based on how long they have lived abroad, what they know, and their ability to guide.',
    },
    {
      title: 'Honest Answers, Not Just Encouragement',
      body: 'Get real insights into what works, what to avoid, and how to plan smart. No sugar-coating.',
    },
    {
      title: 'Private, Personal Mentorship',
      body: 'No group chats or forums. Every session is personal, one-on-one, and focused entirely on your journey.',
    },
    {
      title: 'You Move Forward Faster',
      body: 'Skip weeks of confusion. Learn directly from someone who has already solved your exact challenges.',
    },
    {
      title: 'Relevance Over Noise',
      body: 'There is no shortage of information online. What you need is someone to filter what actually matters.',
    },
  ],
  about: {
    subheading: 'At Immigroov, we believe moving abroad should feel exciting, not overwhelming.',
    paragraphs: [
      'We built a mentoring platform where real expats and locals, already living in your destination country, guide you through moving and settling into your new home.',
      'Whether you are handling visas, finding jobs, planning studies, or figuring out daily life, from banking, taxes, and housing to transport, culture, and cost of living, our mentors do not just share stories. They give you honest, personal guidance based on what actually works for your situation.',
    ],
    band: [
      'Maybe, once you are settled, you will become a mentor too, sharing your journey, earning, and giving back.',
    ],
    imageCaption: 'A global community of people helping people move smarter, together.',
    badgeSince: { title: 'Since 2021', sub: 'Building the Movement' },
    badgeCountries: '20 countries covered',
    whyHeadlineA: 'Information is Everywhere, ',
    whyHeadlineB: 'But Relevance is Rare',
    whyIntro:
      'Immigroov helps you cut through the noise by connecting you with people who have lived it, so you get advice that is relevant, personal, and proven.',
    ctaTitle: 'Ready to start your journey?',
    ctaIntro: 'Get real-time answers from Groovia, our AI agent, or connect with a mentor who has already made the move.',
    ctaChat: 'Chat with Groovia AI',
    ctaMentors: 'Browse Mentors',
  },
  contact: {
    heading: 'Get in touch',
    subheading: 'Questions, feedback, or partnership ideas? We usually reply within 24 hours.',
    cards: {
      email:  { title: 'Email Support', sub: 'Expect a reply within 24 hours.', address: 'support@immigroov.com' },
      chat:   { title: 'Chat with Us', sub: 'Quick questions? Start a chat.', label: 'WhatsApp' },
      follow: { title: 'Follow Us', sub: 'News, updates and tips.' },
    },
    formTitle: 'Send us a message',
    firstName: 'First name',
    lastName: 'Last name',
    emailLabel: 'Email',
    topicLabel: 'Topic',
    topicPlaceholder: 'Choose a topic',
    topics: [
      'Profile Assessment / Country Fit Help',
      'Book or Plan a Mentor Session',
      'Join as a Mentor',            // BUG-067: where an existing customer account is sent
      'Payments and Refunds',
      'Technical Support',
      'General Inquiry',
      'New Feature Request / Feedback',
      'Business Inquiry / Collaboration',
    ],
    messageLabel: 'Message (up to 500 words)',
    messagePlaceholder: 'Tell us a bit about what you need help with…',
    submit: 'Submit',
    sent: "Thanks, your message is on its way. We'll get back to you within 24 hours.",
    error: 'Something went wrong. Please try again, or email support@immigroov.com.',
    offices: {
      title: 'Global Offices',
      europe: { label: 'Europe (Head Office)', address: 'Immigroov Consulting VOF, Noord Brabant, The Netherlands' },
      asia:   { label: 'Asia (Operations)', address: 'Immigroov Consulting India LLP, Trichy, Tamil Nadu, India' },
      note: 'Immigroov Consulting operates globally through its registered entities in the Netherlands and India. All legal and official correspondence should be directed to support@immigroov.com.',
    },
    links: {
      whatsapp:  'https://wa.me/+31626476147',
      linkedin:  'https://www.linkedin.com/company/immigroov/',
      instagram: 'https://www.instagram.com/immigroov/',
    },
  },
} as const;

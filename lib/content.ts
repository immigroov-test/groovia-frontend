export const UI_CONTENT = {
  welcomeMessage: "Hi, I'm Groovia 👋 What would you like to do?",
  uploadIndicator: '📎 Resume uploaded',
  intentPrompt: 'What would you like to do?',
  askQuestionPrompt: 'Sure, what would you like to know? Ask me anything about visas, jobs, salaries, or moving abroad.',
  guestLimit: "That's your 2 free questions. Please create a free account or sign in to keep asking and unlock everything Groovia can do.",
  guestWordLimit: 'Free questions are limited to about 50 words. Please shorten it, or sign in to ask longer questions.',
  inputPlaceholder: 'Ask about your career...',
  inputPlaceholderBlocked: 'Pick an option above to get started…',
  disclaimer:
    'This is AI-generated content based on publicly available information. It is not legal advice. Always consult a qualified immigration professional before making decisions.',
  signInToContinue: 'Sign in to continue',
  // Career-report intent: a popup explains it, then it needs sign-in + résumé.
  report: {
    title: 'Career pathway report',
    intro: 'Your best-fit countries and the visa route to each, with mentors you can book.',
    why: 'We need you to sign in and share your resume so we can build your report.',
    proceed: 'Continue',
    cancel: 'Not now',
    needLogin: "Sign in or create a free account, then attach your resume and we'll build your report.",
    needResume: "You're signed in. Now attach your resume (PDF or DOCX) using the attach button below.",
  },
  mentorResults: {
    none: "We don't have mentors based there yet. Our network is expanding, so try a nearby country or browse the full directory.",
    tip: 'Tip: sign in and share your résumé to get matches tuned to your background.',
  },
  errors: {
    backendUnreachable: 'Error: Could not connect to backend.',
    noResponse: 'No response received.',
  },
  tooltips: {
    attachResume: 'Attach resume (PDF or DOCX)',
    resumeAlreadyUploaded: 'Resume already uploaded',
  },
  // ── Section 1: Immigroov brand intro (shown first, above the Groovia hero) ──
  brandIntro: {
    headline: 'Peer-to-Peer Personalized Immigration Mentoring Platform',
    // Three carded lines, mirroring the Groovia feature cards (icon + text).
    cards: [
      'Connect with verified mentors, expats and locals who have already made the move.',
      'Not just a platform, a movement of people helping people move smarter.',
      'Powered by Groovia (Agentic) AI.',
    ],
    scrollCta: 'Scroll down for assistance',
  },
  hero: {
    title: 'Try Groovia?',
    tagline: 'The AI assistant of Immigroov.',
    intro:
      "Tell me where you want to go, and I'll plan the route and connect you with people who've already made the move.",
    movement:
      "Immigroov isn't just a platform, it's a movement. A global community of people helping people move smarter, together.",
    features: [
      'Discover 3-5 countries that fit your skills and budget.',
      "Get matched with mentors who've already made the move.",
      'Instant and accurate answers on visas, jobs, housing etc.',
    ],
    scrollCta: 'Scroll down to start your journey',
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
  admin: {
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
  },
  booking: {
    videoCall: 'Video call',
    confirmedTitle: 'Session confirmed!',
    confirmedBody: (mentorName: string, email: string) =>
      `Your session with ${mentorName} is confirmed. A confirmation email has been sent to ${email}.`,
    joinVideoCall: 'Join video call',
    addToCalendar: 'Add to Google Calendar',
    noSlotsTitle: (firstName: string) => `${firstName} has no open slots in the next two weeks.`,
    noSlotsBody: 'Please check back later.',
    loadingSlots: 'Loading available times…',
    form: {
      namePlaceholder: 'Jane Doe',
      emailPlaceholder: 'jane@example.com',
      notesLabel: 'Additional notes',
      notesPlaceholder: 'Please share anything that will help prepare for our meeting.',
      termsPrefix: "By proceeding, you agree to Immigroov's",
      terms: 'Terms',
      privacy: 'Privacy Policy',
      back: 'Back',
      confirm: 'Confirm',
    },
  },
  // ── Passwordless auth popup ──────────────────────────────────────────────
  auth: {
    heading: 'Get started with your email',
    subheading: 'Free to start. No card required.',
    namePlaceholder: 'Your full name',
    continue: 'Continue',
    back: 'Use a different email',
    loginHeading: 'Welcome back',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    confirmLabel: 'Confirm password',
    signIn: 'Sign in',
    createAccount: 'Create account',
    forgot: 'Forgot password?',
    forgotHeading: 'Reset your password',
    forgotSubheading: 'Enter your email and we’ll send a reset link.',
    sendReset: 'Send reset link',
    confirmHeading: 'Check your email',
    confirmBody: (email: string) => `We sent a link to ${email}. Click it to verify your email, then you’ll set your password.`,
    resetHeading: 'Check your email',
    resetBody: (email: string) => `If ${email} has an account, a password reset link is on its way.`,
    notConfirmed: 'Your email isn’t confirmed yet - check your inbox for the link.',
    badCredentials: 'Incorrect password. Forgot it - or signed up with Google? Use “Forgot password?” below to set or reset it.',
    setupHeading: 'Finish setting up',
    setupSubheading: 'Add your name and a password to secure your account.',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@example.com',
    continueWithGoogle: 'Continue with Google',
    orDivider: 'or',
    resend: 'Resend link',
    changeEmail: 'Use a different email',
    termsNote: 'By continuing you agree to our',
    terms: 'Terms',
    privacy: 'Privacy Policy',
    whyJoinTitle: 'Why join Immigroov?',
  },
  // Default proverb shown if the daily quote API is unreachable.
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
    whatWeDoTitle: 'What we do',
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
export const SERVICE_DESCRIPTION_TEMPLATE =
  "<p><strong>What we&rsquo;ll cover</strong></p>" +
  "<ul><li>First thing you&rsquo;ll help with</li><li>Second thing</li></ul>" +
  "<p><strong>Who this is for</strong></p>" +
  "<p>Describe the ideal mentee (e.g. recent grads targeting the Dutch job market).</p>" +
  "<p><strong>What you&rsquo;ll walk away with</strong></p>" +
  "<p>The concrete outcome or next steps after the session.</p>";

export const INTENT_OPTIONS = [
  { kind: 'report', label: '📊 Generate a career pathway', message: 'I want to generate a career pathway.' },
  { kind: 'mentor', label: '🤝 Find me a Mentor',          message: 'I want to find a mentor.' },
  { kind: 'qna',    label: '💬 Ask a Question',            message: 'I just want to ask some questions.' },
] as const;

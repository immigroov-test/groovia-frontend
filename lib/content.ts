export const UI_CONTENT = {
  welcomeMessage: "Hi, I'm Groovia. Attach your resume below and we'll get started.",
  uploadIndicator: '📎 Resume uploaded',
  intentPrompt: 'What would you like to do next?',
  inputPlaceholder: 'Ask about your career...',
  inputPlaceholderLocked: 'Login to continue…',
  disclaimer:
    'This is AI-generated content based on publicly available information. It is not legal advice. Always consult a qualified immigration professional before making decisions.',
  signInToContinue: 'Login to continue the conversation',
  errors: {
    backendUnreachable: 'Error: Could not connect to backend.',
    noResponse: 'No response received.',
  },
  tooltips: {
    attachResume: 'Attach resume (PDF or DOCX)',
    resumeAlreadyUploaded: 'Resume already uploaded',
  },
  hero: {
    title: "Hi, I'm Groovia.",
    tagline: 'The AI assistant of Immigroov.',
    intro:
      "Tell me where you want to go, and I'll plan the route and connect you with people who've already made the move.",
    movement:
      "Immigroov isn't just a platform, it's a movement. A global community of people helping people move smarter, together.",
    features: [
      'Discover 3–5 countries that fit your skills and budget.',
      "Book meetings with real mentors who've already made the move.",
      'Get instant real-time answers on visas, jobs, housing and daily life.',
    ],
    scrollCta: 'Scroll down to start your journey',
  },
  sidebar: {
    chat: 'Chat',
    mentors: 'Mentors',
    account: 'Account',
    mentorPortal: 'Join as Mentor',
    about: 'About',
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
    suspendedSubtitle: 'Paused profiles — not visible to candidates.',
    empty: 'None.',
    approve: 'Approve',
    reject: 'Reject',
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
  signupModal: {
    title: 'Save your progress to continue',
    subtitle:
      'Create a free account (or login) to keep your report, conversation and country recommendations.',
    createAccount: 'Create free account',
    haveAccount: 'I already have an account',
    requireAccount: 'We need an account before continuing.',
    noCreditCard: 'No credit card needed',
  },
  // ── Passwordless auth popup ──────────────────────────────────────────────
  auth: {
    heading: 'Get started with your email',
    subheading: 'Free to start. No card required.',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@example.com',
    continueWithEmail: 'Continue with email',
    continueWithGoogle: 'Continue with Google',
    orDivider: 'or',
    linkHeading: 'Check your email',
    linkSubheading: (email: string) => `We sent a secure sign-in link to ${email}. Click it to continue.`,
    resend: 'Resend link',
    changeEmail: 'Use a different email',
    termsNote: 'By continuing you agree to our',
    terms: 'Terms',
    privacy: 'Privacy Policy',
    whyJoinTitle: 'Why join Immigroov',
  },
  // Default proverb shown if the daily quote API is unreachable.
  quote: {
    text: 'Seek wealth, even if it means crossing the ocean.',
    author: '',
  },
  // Reasons to join — titles surface on the login popup; full text on About.
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
    whatWeDo: [
      'At Immigroov, we believe moving abroad should feel exciting, not overwhelming.',
      'We created a mentoring platform where real expats and locals already living in your destination country guide you on moving and settling into your new country.',
      'Whether you are handling visas, finding jobs, planning studies, or figuring out daily life, from banking, taxes, and housing to transport, culture, and cost of living, our mentors do not just share stories. They give you honest, personal guidance based on what actually works for your situation.',
      'Maybe, once you are settled, you will become a mentor too, sharing your journey, earning, and giving back.',
      'Immigroov is not just a platform, it is a movement.',
      'A global community of people helping people move smarter, together.',
    ],
    whyChooseKicker: 'Why Choose Immigroov',
    whyChooseHeadline: 'Information is Everywhere, But Relevance is Rare',
    whyChooseIntro:
      'Immigroov helps you cut through the noise by connecting you with people who have lived it, so you get advice that is relevant, personal, and proven.',
  },
} as const;

export const INTENT_OPTIONS = [
  { label: '📊 Generate a Career Report', message: 'I want to generate a career report.' },
  { label: '🤝 Find me a Mentor',         message: 'I want to find a mentor.'           },
  { label: '💬 Ask a Question',           message: 'I just want to ask some questions.' },
] as const;

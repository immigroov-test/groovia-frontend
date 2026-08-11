// Groovia chat copy: what the assistant says, its prompts, guest limits and errors.
export const CHAT = {
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
} as const;

export const INTENT_OPTIONS = [
  { kind: 'report', label: '📊 Generate a career pathway', message: 'I want to generate a career pathway.' },
  { kind: 'mentor', label: '🤝 Find me a Mentor',          message: 'I want to find a mentor.' },
  { kind: 'qna',    label: '💬 Ask a Question',            message: 'I just want to ask some questions.' },
] as const;

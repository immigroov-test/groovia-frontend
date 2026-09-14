'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Paperclip, Send, Lock, SquarePen, X, ArrowRight } from 'lucide-react';
import { UI_CONTENT, INTENT_OPTIONS, EXPERTISE_CATEGORY_MAP } from '../lib/content';
import { countryLabel, flagEmoji } from '../lib/countries';
import { createClient } from '../lib/supabase/client';
import { FEATURES } from '../lib/features';
import { LS_KEYS, clearLocalChat } from '../lib/chatStorage';
import { apiFetch } from '../lib/api';
import { cn } from '../lib/utils';
import { LandingIntro } from './LandingIntro';
import { SiteFooter } from './SiteFooter';
import { RateLimitModal } from './RateLimitModal';
import { ReportInfoModal } from './ReportInfoModal';
import { ResumeConsentModal } from './ResumeConsentModal';
import { ThinkingIndicator } from './ThinkingIndicator';
import { AiAvatar } from './AiAvatar';

// Standalone (not in LS_KEYS): a Groq rate-limit block is server-side reality, so it must
// survive "clear chat" - which wipes every LS_KEYS entry.
const RL_KEY = 'groovia.rateLimitedUntil';

// Guest free tier: a few short questions before Groovia asks them to sign in. Its own localStorage
// key (not in LS_KEYS) so "clear chat" doesn't hand out a fresh allowance; see readGuestQuestions
// for the daily window.
const GUEST_FREE_QUESTIONS = 2;
const GUEST_WORD_LIMIT = 50;
const GQ_KEY = 'groovia.guestQuestions';

// The guest free-question allowance RESETS EACH DAY.
//
// It used to be a bare count that lived in the browser forever, so someone who tried two questions
// once was told "that's your 2 free questions" on every visit after that - months later, and with no
// way to clear it ("clear chat" deliberately skips this key). That reads as a bug to the person, who
// remembers asking nothing today, and it turns a taster into a permanent lockout. A rolling daily
// window keeps the limit meaningful without punishing a returning visitor. Old bare-number values are
// read as "no date" and so start fresh.
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function readGuestQuestions(): number {
  try {
    const raw = localStorage.getItem(GQ_KEY);
    if (!raw) return 0;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && 'n' in parsed && 'd' in parsed) {
      const { n, d } = parsed as { n: number; d: string };
      return d === today() ? Number(n) || 0 : 0;
    }
    return 0;   // legacy bare count: no day attached, so treat it as spent long ago
  } catch {
    return 0;
  }
}

interface Props {
  authed: boolean;
  featuredMentors?: import('../lib/types').Mentor[];
  upcomingWebinars?: import('../lib/webinars').Webinar[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Find-a-mentor facets from the backend (DB-driven, so they auto-expand as mentors join).
interface MentorFacets {
  categories: string[];
  countries: string[];
  by_category: Record<string, string[]>;
}

// A topic code -> human label, falling back to a Title Case of the code for any future
// category the backend returns that the label map doesn't know yet.
function topicLabel(code: string): string {
  return EXPERTISE_CATEGORY_MAP[code] ?? code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const LINK_CLASS = '!text-brand-700 !underline !underline-offset-4 hover:!text-brand-900 font-medium';

const ASSISTANT_BUBBLE =
  'rounded-2xl rounded-bl-md border border-(--color-border) bg-white px-4 py-2.5 text-[15px] leading-relaxed text-foreground shadow-(--shadow-1)';

// Native-select "pill" used by the find-a-mentor topic/country steps.
const MENTOR_PILL =
  'w-full px-3.5 py-2.5 text-sm font-medium rounded-xl bg-white text-brand-900 border border-(--color-border) shadow-(--shadow-1) hover:border-brand-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:opacity-40 disabled:cursor-not-allowed';

const MD_COMPONENTS: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  a: ({ href, children, node: _node, ...rest }) => {
    const isInternal = (() => {
      if (!href) return false;
      try {
        const url = new URL(href, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
        return url.hostname === (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
      } catch {
        return href.startsWith('/');
      }
    })();

    if (isInternal && href) {
      return <Link href={href} className={LINK_CLASS} {...(rest as object)}>{children}</Link>;
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS} {...rest}>
        {children}
      </a>
    );
  },
};

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

// Cap cached messages well under the localStorage quota; backend keeps full history.
const MAX_MESSAGES_PERSISTED = 50;

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSetMessages(messages: ChatMessage[]): void {
  if (typeof window === 'undefined') return;
  // Keep the last N. The visible UI still shows the full array - only the cache is trimmed.
  const trimmed = messages.length > MAX_MESSAGES_PERSISTED
    ? messages.slice(-MAX_MESSAGES_PERSISTED)
    : messages;
  try {
    window.localStorage.setItem(LS_KEYS.messages, JSON.stringify(trimmed));
  } catch {
    // Quota exceeded - drop and continue.
  }
}

export default function ChatInterface({ authed, featuredMentors = [], upcomingWebinars = [] }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Groovia lives in a panel over the page. Closing it only hides it: the conversation stays.
  const [chatOpen, setChatOpen] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (searchParams.get('chat') === 'open') setChatOpen(true);
  }, [searchParams]);

  // Guests become "gated" after resume upload - input disables, AuthGateRenderer shows the modal.
  const gated = !authed;

  function openGate() {
    router.push(`${pathname}?auth=open`);
  }

  // SSR-safe defaults; hydrated from localStorage in a single effect after mount.
  const [threadId, setThreadId] = useState<string>('');
  // Empty on the landing: Groovia's "attach your resume" greeting is rendered inside the
  // Groovia section (ChatIntro), so the messages area only holds the real conversation.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [intentSelected, setIntentSelected] = useState(false);
  // Career-report intent: popup shown first, then a login -> résumé -> generate sequence.
  const [showReportModal, setShowReportModal] = useState(false);
  // BUG-143: a resume can be attached from Groovia's chat greeting as well as through the report
  // flow, and that path agreed to nothing. Hold the chosen file until consent is given.
  const [pendingResumeFile, setPendingResumeFile] = useState<File | null>(null);
  const [pendingReport, setPendingReport] = useState(false);
  // Typing is BLOCKED until the user picks "Ask a Question" (or is mid Q&A). The three intent
  // buttons are the only entry until then. pendingQna resumes the Q&A intent after a guest logs in.
  const [qnaActive, setQnaActive] = useState(false);
  const [pendingQna, setPendingQna] = useState(false);
  // Guest free-tier: how many free questions used, whether the limit banner is up, and the
  // word-limit hint. guestQuestionsUsed is loaded from localStorage below.
  const [guestQuestionsUsed, setGuestQuestionsUsed] = useState(0);
  const [guestGate, setGuestGate] = useState(false);
  const [guestHint, setGuestHint] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // Find-a-mentor dropdowns are DB-driven facets so they only show topics/countries we
  // actually have mentors for, and auto-expand as mentors join. The two are dependent:
  // pick a topic, then the country list narrows to that topic (faceted filtering).
  const [facets, setFacets] = useState<MentorFacets>({ categories: [], countries: [], by_category: {} });
  const [facetsLoading, setFacetsLoading] = useState(false);
  const [mentorTopic, setMentorTopic] = useState('');
  // Find-a-mentor is a mimicked mini-conversation: '' = pick an intent, 'topic' = asked
  // what they need help with, 'country' = asked which country. The real backend call only
  // fires once the country is chosen.
  const [mentorStep, setMentorStep] = useState<'' | 'topic' | 'country'>('');
  // Auto-resume must run at most once per mount, and never after an explicit New chat -
  // otherwise clearing the chat immediately re-restores the just-cleared thread.
  const didAutoResumeRef = useRef(false);

  // One-time client hydration from localStorage.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const isFreshSession = !window.sessionStorage.getItem('groovia.sessionStarted');
    window.sessionStorage.setItem('groovia.sessionStarted', '1');

    if (isFreshSession) {
      // Every new browser session (including a fresh login) starts a clean chat and
      // re-asks for the resume. The previous resume/summary stays server-side for our
      // internal reference only; the user uploads again (replacing the old one). This also
      // blocks auto-resume so an old thread isn't silently restored. A same-session refresh
      // (the branch below) still keeps the in-progress chat so a reload never loses work.
      clearLocalChat();
      window.sessionStorage.setItem('groovia.autoResumed', '1');
      const fresh = uuidv4();
      window.localStorage.setItem(LS_KEYS.threadId, JSON.stringify(fresh));
      setThreadId(fresh);
      setHydrated(true);
      return;
    }

    const storedThread = loadFromStorage<string | null>(LS_KEYS.threadId, null);
    if (storedThread) {
      setThreadId(storedThread);
    } else {
      const fresh = uuidv4();
      window.localStorage.setItem(LS_KEYS.threadId, JSON.stringify(fresh));
      setThreadId(fresh);
    }
    // A stored transcript with no message FROM THE PERSON is not a conversation - it is leftover
    // landing choreography (Groovia's welcome, "sure, what would you like to know?", or the guest
    // limit notice). Restoring it dropped those lines onto a fresh landing, which is how "that's your
    // 2 free questions" ended up greeting someone who had not asked anything. Only a transcript they
    // actually took part in is worth resuming; anything else starts clean.
    const storedMessages = loadFromStorage<ChatMessage[] | null>(LS_KEYS.messages, null);
    const theySpoke = !!storedMessages?.some((m) => m.role === 'user');
    if (theySpoke) {
      setMessages(storedMessages!);
      setChatOpen(true);   // a same-session refresh mid-conversation reopens where they left off
    } else {
      window.localStorage.removeItem(LS_KEYS.messages);
    }
    setResumeUploaded(loadFromStorage<boolean>(LS_KEYS.resumeUploaded, false));
    // Same reasoning: without a turn of theirs, the intent buttons belong back on screen.
    setIntentSelected(theySpoke && loadFromStorage<boolean>(LS_KEYS.intentSelected, false));
    setHydrated(true);
  }, [authed]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    safeSetMessages(messages);
  }, [messages, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(LS_KEYS.resumeUploaded, JSON.stringify(resumeUploaded));
  }, [resumeUploaded, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(LS_KEYS.intentSelected, JSON.stringify(intentSelected));
  }, [intentSelected, hydrated]);

  // A report user who just signed in still needs to attach a résumé - guide them to the clip.
  useEffect(() => {
    if (!authed || !pendingReport || resumeUploaded) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages((prev) =>
      prev.some((m) => m.content === UI_CONTENT.report.needResume)
        ? prev
        : [...prev, { role: 'assistant', content: UI_CONTENT.report.needResume }],
    );
  }, [authed, pendingReport, resumeUploaded]);

  // Resume the Q&A intent once a guest signs in for it.
  useEffect(() => {
    if (authed && pendingQna) startQna();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, pendingQna]);

  // When a guest signs in, link the guest thread to their account so it appears in history.
  useEffect(() => {
    if (!hydrated || !authed || !threadId) return;
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`/api/chat/threads/${threadId}/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => null);
      if (res?.ok) {
        window.dispatchEvent(new CustomEvent('groovia:history-refresh'));
      }
    })();
  }, [hydrated, authed, threadId]);

  // Auto-resume the user's most recent thread on sign-in, only if the local chat is empty.
  // Gated to once per browser session (sessionStorage), NOT once per mount: otherwise a
  // plain page refresh after "New chat" re-fetches the next non-archived thread and drops
  // the user back into an older conversation (bug: clear chat -> refresh -> old chat).
  useEffect(() => {
    if (!hydrated || !authed || !FEATURES.chatPersist) return;
    if (didAutoResumeRef.current || window.sessionStorage.getItem('groovia.autoResumed')) return;
    if (resumeUploaded || messages.length > 1) return;
    didAutoResumeRef.current = true;   // claim the one-shot before the async restore
    window.sessionStorage.setItem('groovia.autoResumed', '1');
    (async () => {
      const headers = await authHeaders();
      if (!Object.keys(headers).length) return;
      const tRes = await fetch('/api/chat/threads?limit=1', { headers, cache: 'no-store' }).catch(() => null);
      if (!tRes?.ok) return;
      const tData = await tRes.json();
      const last = tData.threads?.[0];
      if (!last?.id || last.id === threadId) return;

      const mRes = await fetch(`/api/chat/threads/${last.id}/messages`, { headers, cache: 'no-store' }).catch(() => null);
      if (!mRes?.ok) return;
      const mData = await mRes.json();
      const restored: ChatMessage[] = (mData.messages || []).filter(
        (m: { role: string; content: string }) => m.role === 'user' || m.role === 'assistant',
      );
      if (!restored.length) return;

      setThreadId(last.id);
      setMessages(restored);
      // Reflect the thread's real resume state (from the backend) rather than assuming
      // true - otherwise a restored no-resume thread falsely shows "resume uploaded".
      setResumeUploaded(Boolean(mData.resume_uploaded));
      setIntentSelected(true);
      window.localStorage.setItem(LS_KEYS.threadId, JSON.stringify(last.id));
    })();
  }, [hydrated, authed, resumeUploaded, messages.length, threadId]);

  function handleNewChat() {
    didAutoResumeRef.current = true;   // block auto-resume from re-restoring the cleared thread
    window.sessionStorage.setItem('groovia.autoResumed', '1');   // ...and keep it blocked across refreshes this session
    // Clearing must stick across sign-ins: archive the current thread server-side so
    // auto-resume can't bring the cleared conversation back next login (issue #4).
    const old = threadId;
    if (authed && old) {
      (async () => {
        const headers = await authHeaders();
        if (Object.keys(headers).length) {
          fetch(`/api/chat/threads/${old}/archive`, { method: 'POST', headers }).catch(() => {});
        }
      })();
    }
    clearLocalChat();
    const fresh = uuidv4();
    window.localStorage.setItem(LS_KEYS.threadId, JSON.stringify(fresh));
    setThreadId(fresh);
    setMessages([]);
    setResumeUploaded(false);
    setIntentSelected(false);
    setShowReportModal(false);
    setPendingReport(false);
    setQnaActive(false);
    setPendingQna(false);
    setMentorTopic('');
    setMentorStep('');
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelBodyRef = useRef<HTMLDivElement>(null);

  async function loadFacets() {
    if (facets.categories.length || facetsLoading) return;
    setFacetsLoading(true);
    try {
      const res = await fetch('/api/mentors/facets', { cache: 'no-store' });
      const data = res.ok ? await res.json() : null;
      setFacets({
        categories: Array.isArray(data?.categories) ? data.categories : [],
        countries: Array.isArray(data?.countries) ? data.countries : [],
        by_category: data?.by_category && typeof data.by_category === 'object' ? data.by_category : {},
      });
    } catch {
      setFacets({ categories: [], countries: [], by_category: {} });
    } finally {
      setFacetsLoading(false);
    }
  }

  // Preload the facets as soon as the intent options appear, so both selects are populated
  // before the user opens them.
  useEffect(() => {
    if (resumeUploaded && !intentSelected) loadFacets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeUploaded, intentSelected]);

  // Countries shown depend on the chosen topic (only those with a mentor in it); before a
  // topic is picked, show every country we cover.
  const mentorCountries = mentorTopic ? (facets.by_category[mentorTopic] ?? []) : facets.countries;

  // Keep the newest message (or the options under it) in view inside the panel.
  useEffect(() => {
    if (!chatOpen) return;
    const t = window.setTimeout(() => {
      const el = panelBodyRef.current;
      el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, 60);
    return () => window.clearTimeout(t);
  }, [chatOpen, messages, loading, intentSelected, mentorStep]);

  // Escape closes the panel, unless one of the chat's own popups is on top of it.
  useEffect(() => {
    if (!chatOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !searchParams.get('auth')) setChatOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chatOpen, searchParams]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [input]);

  // Groq rate limit: the backend returns 429 + retry_after_seconds when its token/request
  // budget is exhausted. We block ONLY the chat composer (the rest of the app stays usable),
  // show a popup with a countdown + riddles, and persist the reset time so the block (and
  // popup) survive navigation and refresh.
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const [rlRemaining, setRlRemaining] = useState(0);
  const [showRateModal, setShowRateModal] = useState(false);

  // Restore an in-progress block on mount (user navigated away and came back).
  useEffect(() => {
    const stored = Number(localStorage.getItem(RL_KEY));
    if (stored && stored > Date.now()) { setRateLimitedUntil(stored); setShowRateModal(true); }
    else localStorage.removeItem(RL_KEY);
  }, []);

  useEffect(() => {
    if (rateLimitedUntil === null) { setRlRemaining(0); return; }
    const tick = () => {
      const r = Math.max(0, Math.ceil((rateLimitedUntil - Date.now()) / 1000));
      setRlRemaining(r);
      if (r <= 0) {
        // Timer done: auto-close the popup and re-enable chat, whatever the riddle is doing.
        setRateLimitedUntil(null);
        setShowRateModal(false);
        localStorage.removeItem(RL_KEY);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [rateLimitedUntil]);
  const rateLimited = rateLimitedUntil !== null && rlRemaining > 0;

  function triggerRateLimit(seconds: number) {
    const until = Date.now() + seconds * 1000;
    setRateLimitedUntil(until);
    setShowRateModal(true);
    try { localStorage.setItem(RL_KEY, String(until)); } catch { /* private mode */ }
  }

  function formatWait(secs: number): string {
    if (secs >= 3600) { const h = Math.round(secs / 3600); return `about ${h} hour${h === 1 ? '' : 's'}`; }
    if (secs >= 60) { const m = Math.floor(secs / 60); const s = secs % 60; return s ? `${m}m ${s}s` : `${m} min`; }
    return `${secs}s`;
  }

  function applyChatError(e: unknown) {
    const retry = (e as { retryAfter?: number })?.retryAfter;
    if (retry) {
      triggerRateLimit(retry);
    } else {
      setMessages((prev) => [...prev, { role: 'assistant', content: UI_CONTENT.errors.backendUnreachable }]);
    }
  }

  async function postChat(formData: FormData) {
    const headers = await authHeaders();
    const res = await fetch('/api/chat', { method: 'POST', headers, body: formData });
    if (res.status === 429) {
      const body = await res.json().catch(() => ({}));
      const secs = Number(body?.detail?.retry_after_seconds) || 60;
      const err = new Error('rate_limited') as Error & { retryAfter?: number };
      err.retryAfter = secs;
      throw err;
    }
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (resumeUploaded) return;
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    // Ask before reading it. The report flow already collected consent in ReportInfoModal, so it
    // goes straight through; the chat-greeting path stops here first.
    if (!pendingReport) { setPendingResumeFile(file); return; }
    await uploadResume(file);
  }

  async function uploadResume(file: File) {
    setMessages((prev) => [...prev, { role: 'user', content: UI_CONTENT.uploadIndicator }]);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('message', '[SYSTEM_RESUME_UPLOADED]');
    formData.append('thread_id', threadId);
    // BUG-143: the backend refuses a resume without this and records the grant against the thread.
    // Reaching the attach button means the consent box in ReportInfoModal was ticked; the flag is
    // sent so the server decides rather than trusting that the UI was followed.
    formData.append('ai_consent', 'true');

    try {
      const data = await postChat(formData);
      setResumeUploaded(true);
      if (pendingReport) {
        // Report flow: résumé is in → generate immediately (skip the "pick an option" ack).
        sendReport();
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.response || UI_CONTENT.errors.noResponse },
        ]);
        // A fresh résumé upload re-offers the intent chips.
        setIntentSelected(false);
      }
    } catch (e) {
      applyChatError(e);
    } finally {
      setLoading(false);
    }
  }

  // Predefined/canned answers still feel like the assistant is thinking: hold the thinking
  // indicator ~1.1-1.7s (padding out an instant reply) before revealing the message. Done in
  // the frontend so it uniformly covers backend-canned replies AND client-side answers.
  async function thinkPause(started: number) {
    const target = 1100 + Math.random() * 600;
    const elapsed = Date.now() - started;
    if (elapsed < target) await new Promise((r) => setTimeout(r, target - elapsed));
  }
  async function revealAssistant(content: string, after?: () => void) {
    const started = Date.now();
    setLoading(true);
    await thinkPause(started);
    setMessages((prev) => [...prev, { role: 'assistant', content }]);
    setLoading(false);
    after?.();
  }

  // Guest free-question counter (its own key, so "clear chat" never resets it). Once the person has
  // an account the guest tier no longer applies, so signing in CLEARS it - otherwise the count stuck
  // to the browser forever and a signed-in user could still be told they'd used their free questions
  // (the "it says 2 used but I asked none" report).
  useEffect(() => {
    if (authed) {
      try { localStorage.removeItem(GQ_KEY); } catch { /* private mode */ }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGuestQuestionsUsed(0);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGuestQuestionsUsed(readGuestQuestions());
  }, [authed]);
  function bumpGuestQuestions() {
    const n = readGuestQuestions() + 1;
    try { localStorage.setItem(GQ_KEY, JSON.stringify({ n, d: today() })); } catch { /* private mode */ }
    setGuestQuestionsUsed(n);
  }

  // Find-a-mentor mimicked flow. Clicking the intent asks the topic; picking a topic asks
  // the country; picking the country makes the one real backend call (with both).
  function startMentorFlow() {
    setPendingQna(false); setPendingReport(false);   // switching intents clears any pending login gate
    loadFacets();
    void revealAssistant('Happy to help you find a mentor. What do you need guidance on?', () => setMentorStep('topic'));
  }
  function pickMentorTopic(code: string) {
    setMentorTopic(code);
    // Echo the dropdown pick as a user message, so it reads like they typed it.
    setMessages((prev) => [...prev, { role: 'user', content: topicLabel(code) }]);
    void revealAssistant('Great. Which country are you looking at?', () => setMentorStep('country'));
  }
  // Find-a-mentor is fully client-side: fetch the PUBLIC /mentors list (no login, no LLM/Groq
  // tokens) and render the matches as a chat message. Then re-offer the intents.
  async function pickMentorCountry(code: string) {
    setMentorStep('');
    setIntentSelected(true);
    // Echo the country pick as a user message too (like they typed it).
    setMessages((prev) => [...prev, { role: 'user', content: countryLabel(code) }]);
    setLoading(true);
    const started = Date.now();
    try {
      const res = await fetch(
        `/api/mentors?country=${encodeURIComponent(code)}&category=${encodeURIComponent(mentorTopic)}&limit=6`,
        { cache: 'no-store' },
      );
      const data = res.ok ? await res.json() : null;
      await thinkPause(started);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: renderMentorResults(data?.mentors ?? [], code) },
      ]);
    } catch {
      await thinkPause(started);
      setMessages((prev) => [...prev, { role: 'assistant', content: UI_CONTENT.errors.backendUnreachable }]);
    } finally {
      setLoading(false);
      setIntentSelected(false); // re-offer the intent chips after results
    }
  }

  // Build the mentor-results markdown (rendered by MD_COMPONENTS - internal links become
  // Next <Link>s, so "View & book" lands on the mentor's booking page).
  function renderMentorResults(mentors: Array<{ slug?: string; display_name?: string; headline?: string }>, code: string): string {
    const place = countryLabel(code);
    if (!mentors.length) {
      return `${UI_CONTENT.mentorResults.none}\n\n[Browse the full Mentor Directory](/mentors)`;
    }
    const lines = mentors.slice(0, 3).map((m) => {
      const head = m.headline ? `, ${m.headline}` : '';
      return `- **${m.display_name ?? 'Mentor'}**${head}  \n  [View profile & book a session](/mentors/${m.slug ?? ''})`;
    });
    return (
      `Here are mentors for **${topicLabel(mentorTopic)}** in **${place}**:\n\n` +
      `${lines.join('\n')}\n\n[See all mentors in ${place}](/mentors?country=${code})\n\n_${UI_CONTENT.mentorResults.tip}_`
    );
  }

  // Intent chip dispatcher. Mentor = open (no login). Q&A = login, then answer. Report = the
  // info popup, which drives login -> résumé -> generate.
  function handleIntent(kind: 'report' | 'mentor' | 'qna') {
    if (kind === 'mentor') { startMentorFlow(); return; }
    if (kind === 'report') { setShowReportModal(true); return; }
    // Q&A is open to guests for a couple of free questions; Groovia asks them to sign in after.
    startQna();
  }
  // Unlocks the composer and invites the question. Typing is blocked until this runs.
  function startQna() {
    // A returning guest who already used their free questions (the counter persists across sessions):
    // go straight to the sign-in prompt instead of inviting "ask anything" and then blocking on the
    // first question.
    if (!authed && guestQuestionsUsed >= GUEST_FREE_QUESTIONS) {
      setIntentSelected(true);
      setMessages((prev) => [...prev, { role: 'assistant', content: UI_CONTENT.guestLimit }]);
      setGuestGate(true);
      // Mark the intent as pending, so the "resume Q&A once signed in" effect actually fires. Without
      // this a guest at the limit signed in and STILL had no composer: they had to notice the intent
      // buttons and click "Ask a question" a second time.
      setPendingQna(true);
      return;
    }
    setPendingQna(false);
    setQnaActive(true);
    setIntentSelected(true);
    void revealAssistant(UI_CONTENT.askQuestionPrompt);
  }

  // Report: after the popup, require login then résumé, then send the generate request.
  function proceedReport() {
    setShowReportModal(false);
    setIntentSelected(true);
    if (!authed) {
      setPendingReport(true);
      setMessages((prev) => [...prev, { role: 'assistant', content: UI_CONTENT.report.needLogin }]);
      openGate();
      return;
    }
    if (!resumeUploaded) {
      setPendingReport(true);
      setMessages((prev) => [...prev, { role: 'assistant', content: UI_CONTENT.report.needResume }]);
      return;
    }
    sendReport();
  }
  function sendReport() {
    setPendingReport(false);
    setQnaActive(true);   // report done → allow typed follow-up questions
    void sendMessage('I want to generate a career pathway.');
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();

    // Dev/QA hook: "/ratelimit" or "/ratelimit 45" simulates a Groq rate-limit locally (and
    // on staging) so we can test the popup without waiting to actually hit the limit.
    const rl = trimmed.match(/^\/ratelimit(?:\s+(\d+))?$/i);
    if (rl) { setInput(''); triggerRateLimit(Number(rl[1]) || 30); return; }

    if (!trimmed || loading || rateLimited) return;

    // Guest free tier: a couple of short questions, then Groovia itself (not a popup) asks them
    // to sign in. Long questions are nudged toward an account instead of spending on a big prompt.
    if (!authed) {
      if (guestQuestionsUsed >= GUEST_FREE_QUESTIONS) {
        setMessages((prev) => [
          ...prev,
          { role: 'user', content: trimmed },
          { role: 'assistant', content: UI_CONTENT.guestLimit },
        ]);
        setInput('');
        setGuestGate(true);
        return;
      }
      if (trimmed.split(/\s+/).filter(Boolean).length > GUEST_WORD_LIMIT) {
        setGuestHint(true);   // keep the input so they can shorten it
        return;
      }
      setGuestHint(false);
    }

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setIntentSelected(true);
    setLoading(true);
    const started = Date.now();

    const formData = new FormData();
    formData.append('message', trimmed);
    formData.append('thread_id', threadId);

    try {
      const data = await postChat(formData);
      // Fast canned replies still pause on the thinking indicator so every answer feels weighed.
      await thinkPause(started);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response || UI_CONTENT.errors.noResponse },
      ]);
      // First real turn just created/updated the thread row - refresh history so
      // the new title or thread shows up in the sidebar. Guests: count the free question.
      if (authed) window.dispatchEvent(new CustomEvent('groovia:history-refresh'));
      else bumpGuestQuestions();
    } catch (e) {
      applyChatError(e);
    } finally {
      setLoading(false);
    }
  }

  // The composer belongs to the Q&A intent: live Q&A, waiting on a sign-in for it, or blocked at the
  // guest limit. On the bare landing (or mid find-a-mentor, which is dropdown-driven) there is
  // nothing to type into, so it stays out of the way.
  const composerVisible = qnaActive || pendingQna || guestGate;

  const theySpoke = messages.some((m) => m.role === 'user');

  return (
    // h-full alone is not safe here. The containing block is PageTransition's motion
    // wrapper, which is display:contents and carries inline opacity/transform from the
    // route animation; the moment that wrapper generates a box its height is auto, and a
    // percentage height against auto resolves to ZERO - the whole page renders blank with
    // the footer sitting under the nav. The viewport-based minimum cannot collapse, so it
    // holds the page up whichever way the wrapper resolves. 4rem is the layout's pt-16.
    <div className="flex flex-col h-full min-h-[calc(100dvh-4rem)] relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf,.docx"
        className="hidden"
        disabled={resumeUploaded}
      />

      {/* The page itself never gives way to the chat: Groovia opens in a panel on top of it. */}
      <div className="flex-1 overflow-y-auto relative">
        <LandingIntro onReveal={() => setChatOpen(true)} mentors={featuredMentors} webinars={upcomingWebinars} />
        <SiteFooter />
      </div>

      {/* Launcher: how Groovia is reopened after being closed. */}
      {!chatOpen && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="fixed bottom-5 right-5 z-[35] flex items-center gap-3 rounded-full border border-(--color-border) bg-white py-2 pl-2 pr-5 text-left shadow-(--shadow-3) transition-transform hover:-translate-y-0.5 animate-fade-up"
        >
          <AiAvatar className="h-10 w-10" online blink />
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-brand-900">{theySpoke ? 'Continue with Groovia' : 'Ask Groovia'}</span>
            <span className="hidden sm:block text-xs text-muted">{theySpoke ? 'Your conversation is saved' : 'Your guide to moving abroad'}</span>
          </span>
        </button>
      )}

      {chatOpen && (
        <aside
          aria-label="Groovia, AI assistant"
          className="fixed z-[35] flex flex-col overflow-hidden bg-background animate-panel-in inset-x-0 top-16 bottom-0 sm:inset-x-auto sm:top-auto sm:right-5 sm:bottom-5 sm:h-[min(44rem,calc(100dvh-6.5rem))] sm:w-[25rem] sm:rounded-[1.25rem] sm:border sm:border-(--color-border) sm:shadow-(--shadow-3)"
        >
          {/* Header: who you are talking to, and the way out. */}
          <header className="flex items-center gap-3 border-b border-(--color-border) bg-white px-4 py-3">
            <AiAvatar className="h-10 w-10" online blink />
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight text-brand-900">Groovia</p>
              <p className="truncate text-xs text-muted">Your AI guide to moving abroad</p>
            </div>
            {theySpoke && (
              <button
                type="button"
                onClick={handleNewChat}
                title="Start a new conversation"
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-brand-800 hover:bg-brand-50"
              >
                <SquarePen className="h-3.5 w-3.5" /> New chat
              </button>
            )}
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              aria-label="Close Groovia"
              title="Close (your conversation is kept)"
              className="flex h-9 w-9 items-center justify-center rounded-full text-brand-800 hover:bg-brand-50"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div ref={panelBodyRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
            {/* Greeting: always opens the thread, but is not stored as a message, so it never clutters
                a saved transcript. */}
            <div className="flex items-end gap-2.5 animate-fade-up">
              <AiAvatar />
              <div className="space-y-1.5 max-w-[85%]">
                <div className={ASSISTANT_BUBBLE}>{UI_CONTENT.welcomeMessage}</div>
                <div className={ASSISTANT_BUBBLE}>{UI_CONTENT.welcomeFollowUp}</div>
              </div>
            </div>

            {messages.map((m, i) => {
              const firstOfRun = i === 0 || messages[i - 1].role !== m.role;
              const lastOfRun = i === messages.length - 1 || messages[i + 1].role !== m.role;
              if (m.role === 'user') {
                return (
                  <div key={i} className={cn('flex justify-end animate-fade-up', !firstOfRun && '-mt-2.5')}>
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-900 px-4 py-2.5 text-[15px] leading-relaxed text-white">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                );
              }
              return (
                <div key={i} className={cn('flex items-end gap-2.5 animate-fade-up', !firstOfRun && '-mt-2.5')}>
                  {lastOfRun ? <AiAvatar /> : <span className="w-8 shrink-0" aria-hidden />}
                  <div className={cn(ASSISTANT_BUBBLE, 'max-w-[85%] prose-chat')}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>{m.content}</ReactMarkdown>
                  </div>
                </div>
              );
            })}

            {loading && <ThinkingIndicator />}

            {!intentSelected && !loading && (
              <div className="pl-[2.625rem] animate-fade-up">
                {/* Step 0: pick an intent - shown up front (no résumé/login wall). Mentor = open,
                    Q&A = login, Report = popup then login + résumé. */}
                {mentorStep === '' && (
                  <>
                    {messages.length > 0 && <p className="mb-2 text-sm text-muted">{UI_CONTENT.intentPrompt}</p>}
                    <div className="flex flex-col gap-2">
                      {INTENT_OPTIONS.map((opt) => (
                        <button
                          key={opt.label}
                          onClick={() => handleIntent(opt.kind)}
                          disabled={loading}
                          className="group flex items-center justify-between gap-3 rounded-xl border border-(--color-border) bg-white px-3.5 py-2.5 text-left text-sm font-medium text-brand-900 shadow-(--shadow-1) hover:border-accent-400 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {opt.label}
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-accent-600" />
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Step 1: answer "what do you need help with?" (DB-driven topics). */}
                {mentorStep === 'topic' && (
                  <select
                    value={mentorTopic}
                    disabled={loading}
                    aria-label="What do you need guidance on?"
                    onChange={(e) => { if (e.target.value) pickMentorTopic(e.target.value); }}
                    className={MENTOR_PILL}
                  >
                    <option value="">🤝 What do you need help with?</option>
                    {facetsLoading && <option value="" disabled>Loading…</option>}
                    {facets.categories.map((c) => (
                      <option key={c} value={c}>{topicLabel(c)}</option>
                    ))}
                  </select>
                )}

                {/* Step 2: answer "which country?" (narrowed to the chosen topic). Picking one
                    makes the single real backend call. */}
                {mentorStep === 'country' && (
                  <select
                    value=""
                    disabled={loading}
                    aria-label="Which country?"
                    onChange={(e) => { if (e.target.value) void pickMentorCountry(e.target.value); }}
                    className={MENTOR_PILL}
                  >
                    <option value="">🌍 Which country?</option>
                    {mentorCountries.length === 0 && <option value="" disabled>No countries yet</option>}
                    {mentorCountries.map((code) => (
                      <option key={code} value={code}>{flagEmoji(code)} {countryLabel(code)}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-(--color-border) bg-white px-3 pb-3 pt-2.5">
            {gated && (pendingQna || pendingReport || guestGate) && (
              <button
                onClick={openGate}
                className="w-full flex items-center justify-center gap-2 mb-2 px-4 py-2.5 rounded-xl bg-accent-50 text-accent-700 hover:bg-accent-100 text-sm font-medium"
              >
                <Lock className="h-4 w-4" />
                {guestGate ? 'Create a free account or sign in' : UI_CONTENT.signInToContinue}
              </button>
            )}

            {guestHint && (
              <p className="mb-2 text-xs text-amber-700 text-center">{UI_CONTENT.guestWordLimit}</p>
            )}

            {rateLimited && !showRateModal && (
              <button
                type="button"
                onClick={() => setShowRateModal(true)}
                className="w-full text-center mb-2 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-800 text-sm font-medium hover:bg-amber-100"
              >
                You can chat again in{' '}
                <span className="tabular-nums">{formatWait(rlRemaining)}</span>. Tap to pass the time.
              </button>
            )}

            {/* BUG-136: the composer is hidden until the user picks the Q&A intent - including when
                they're at the guest limit, where it shows disabled beside the sign-in prompt. */}
            {composerVisible && (
              <div
                className={cn(
                  'flex items-end gap-1.5 rounded-2xl border border-(--color-border) bg-background px-1.5 py-1.5 transition-shadow focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100',
                  rateLimited && 'opacity-60',
                )}
              >
                {FEATURES.resumeUpload && (
                  <button
                    type="button"
                    onClick={() => { if (!authed) { openGate(); return; } fileInputRef.current?.click(); }}
                    // Attach is only relevant for the career report - blocked (and un-emphasized) otherwise.
                    disabled={loading || resumeUploaded || !pendingReport}
                    title={resumeUploaded ? UI_CONTENT.tooltips.resumeAlreadyUploaded : UI_CONTENT.tooltips.attachResume}
                    className={cn(
                      'h-9 w-9 flex items-center justify-center rounded-xl hover:bg-brand-50 disabled:opacity-30 disabled:cursor-not-allowed',
                      // Pulse the clip only while the report flow is waiting for the résumé.
                      pendingReport && !resumeUploaded && !loading
                        ? 'text-accent-600 animate-attach-pulse'
                        : 'text-muted hover:text-foreground',
                    )}
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                )}

                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); if (guestHint) setGuestHint(false); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  placeholder={!qnaActive ? UI_CONTENT.inputPlaceholderBlocked : 'Message Groovia…'}
                  // Typing is BLOCKED until the user chooses "Ask a Question" (which requires login).
                  disabled={!qnaActive || rateLimited}
                  className="flex-1 bg-transparent border-none outline-none text-[15px] leading-relaxed resize-none px-2 py-1.5 max-h-40 disabled:cursor-not-allowed"
                />

                <button
                  type="button"
                  onClick={() => sendMessage(input)}
                  disabled={loading || !input.trim() || !qnaActive || rateLimited}
                  aria-label="Send"
                  className="h-9 w-9 flex items-center justify-center rounded-xl bg-accent-600 text-white hover:bg-accent-700 disabled:bg-brand-200 disabled:cursor-not-allowed shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            )}

            {composerVisible && (
              <p className="mt-2 px-2 text-center text-[11px] leading-snug text-muted">{UI_CONTENT.disclaimer}</p>
            )}
            {/* AI Disclosure Notice (EU AI Act Art. 50): a persistent label at the point of AI
                interaction, distinct from the caveat above - that one is about the content
                ("not legal advice"); this discloses that Groovia is an AI system at all. */}
            <p className="mt-1 px-2 text-center text-[11px] text-muted/80">
              You&apos;re chatting with Groovia, an AI assistant.{' '}
              <Link href="/privacy#ai-disclosure-notice" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                AI Disclosure Notice
              </Link>
            </p>
          </div>
        </aside>
      )}

      {showReportModal && (
        <ReportInfoModal authed={authed} onProceed={proceedReport} onClose={() => setShowReportModal(false)} />
      )}
      {pendingResumeFile && (
        <ResumeConsentModal
          fileName={pendingResumeFile.name}
          onCancel={() => setPendingResumeFile(null)}
          onAgree={() => { const f = pendingResumeFile; setPendingResumeFile(null); void uploadResume(f); }}
        />
      )}
      {showRateModal && rateLimitedUntil !== null && (
        <RateLimitModal until={rateLimitedUntil} onClose={() => setShowRateModal(false)} />
      )}
    </div>
  );
}
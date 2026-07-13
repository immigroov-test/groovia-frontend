'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Paperclip, Send, Lock, SquarePen, ChevronUp, ChevronDown } from 'lucide-react';
import { UI_CONTENT, INTENT_OPTIONS } from '../lib/content';
import { countryLabel } from '../lib/countries';
import { createClient } from '../lib/supabase/client';
import { FEATURES } from '../lib/features';
import { LS_KEYS, clearLocalChat } from '../lib/chatStorage';
import { cn } from '../lib/utils';
import { ChatIntro } from './ChatIntro';
import { ImmigroovIntro } from './ImmigroovIntro';
import { RateLimitModal } from './RateLimitModal';
import { ThinkingIndicator } from './ThinkingIndicator';
import { AiAvatar } from './AiAvatar';

// Standalone (not in LS_KEYS): a Groq rate-limit block is server-side reality, so it must
// survive "clear chat" - which wipes every LS_KEYS entry.
const RL_KEY = 'groovia.rateLimitedUntil';

interface Props {
  authed: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const LINK_CLASS = '!text-brand-700 !underline !underline-offset-4 hover:!text-brand-900 font-medium';

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

// ↓ Adjust these two values to tune the visual balance
const LANDMARKS_OPACITY = 0.22;       // 0.0 = invisible  · 1.0 = fully visible
const CHAT_INPUT_OPACITY = 0.92;      // 0.7 = see-through · 1.0 = fully white

export default function ChatInterface({ authed }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  // Guests become "gated" after resume upload - input disables, AuthGateRenderer shows the modal.
  const gated = !authed;

  function openGate() {
    router.push(`${pathname}?auth=open`);
  }

  // SSR-safe defaults; hydrated from localStorage in a single effect after mount.
  const [threadId, setThreadId] = useState<string>('');
  // Starts empty: the "attach your resume" welcome is shown as a pinned hint above the
  // composer (not a far-below chat bubble), so there's no gap on the landing.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [intentSelected, setIntentSelected] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // Find-a-mentor country dropdown: the supported countries come from the backend so the
  // list only shows countries we actually have mentors in.
  const [mentorPickerOpen, setMentorPickerOpen] = useState(false);
  const [supportedCountries, setSupportedCountries] = useState<string[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  // Auto-resume must run at most once per mount, and never after an explicit New chat -
  // otherwise clearing the chat immediately re-restores the just-cleared thread.
  const didAutoResumeRef = useRef(false);

  // One-time client hydration from localStorage. A fresh tab (no sessionStorage flag)
  // with a stale "resume uploaded" guest state is treated as a new visit and reset.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const isFreshSession = !window.sessionStorage.getItem('groovia.sessionStarted');
    window.sessionStorage.setItem('groovia.sessionStarted', '1');

    const storedResumeUploaded = loadFromStorage<boolean>(LS_KEYS.resumeUploaded, false);

    if (isFreshSession && !authed && storedResumeUploaded) {
      // Guest reopened the browser - clear stale gated state and start fresh.
      clearLocalChat();
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
    const storedMessages = loadFromStorage<ChatMessage[] | null>(LS_KEYS.messages, null);
    if (storedMessages) setMessages(storedMessages);
    setResumeUploaded(storedResumeUploaded);
    setIntentSelected(loadFromStorage<boolean>(LS_KEYS.intentSelected, false));
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
  useEffect(() => {
    if (!hydrated || !authed || !FEATURES.chatPersist) return;
    if (didAutoResumeRef.current) return;
    if (resumeUploaded || messages.length > 1) return;
    didAutoResumeRef.current = true;   // claim the one-shot before the async restore
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
    // A fresh start lands on the Groovia section with the composer ready.
    requestAnimationFrame(() => section2Ref.current?.scrollIntoView({ behavior: 'smooth' }));
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatStartRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const section1Ref = useRef<HTMLElement>(null);   // Section 1: Immigroov intro
  const section2Ref = useRef<HTMLElement>(null);   // Section 2: Groovia intro

  // Which of the two full-height intro sections is currently in view. Drives the scroll
  // cue (#3), the sticky back-to-top + New chat toolbar (#1, #2), and the composer
  // spotlight in the Groovia section.
  const [atSection1, setAtSection1] = useState(true);
  const [atSection2, setAtSection2] = useState(false);
  // Latched true on first view of each section: drives the once-only entry animation, so
  // the content stays put afterwards (no fade-out / blank pages when scrolling).
  const [seenSection1, setSeenSection1] = useState(false);
  const [seenSection2, setSeenSection2] = useState(false);

  // Auto-reveal bookkeeping. Refs so the IntersectionObserver (set up once) always reads
  // current values. atS1Ref starts false so the very first "Section 1 in view" counts as
  // a rising edge and reveals it on load. revealed* make the auto-scroll happen once each.
  const landingRef = useRef(true);   // true while on the landing (no real conversation yet)
  const atS1Ref = useRef(false);
  const atS2Ref = useRef(false);
  const revealedS1Ref = useRef(false);
  const revealedS2Ref = useRef(false);
  const revealTimeoutRef = useRef<number | null>(null);
  const revealCancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    landingRef.current = !resumeUploaded && messages.length <= 1;
  }, [resumeUploaded, messages.length]);

  // Gently scroll to bring the rest of an overflowing section into view, then stop, so
  // the user can read the whole section (e.g. all three boxes on mobile) before deciding
  // to continue. Cancels the instant the user scrolls, so it never fights them.
  function autoReveal(sec: HTMLElement | null) {
    const root = scrollRef.current;
    if (!root || !sec || !landingRef.current) return;
    revealCancelRef.current?.();
    const target = Math.min(
      sec.offsetTop + sec.offsetHeight - root.clientHeight,
      root.scrollHeight - root.clientHeight,
    );
    const startScroll = root.scrollTop;
    const distance = target - startScroll;
    if (distance <= 24) return;   // section already fits / bottom already shown
    let cancelled = false;
    let raf = 0;
    const cancel = () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      root.removeEventListener('wheel', cancel);
      root.removeEventListener('touchstart', cancel);
      revealCancelRef.current = null;
    };
    revealCancelRef.current = cancel;
    root.addEventListener('wheel', cancel, { passive: true });
    root.addEventListener('touchstart', cancel, { passive: true });
    let startTime = 0;
    const step = (now: number) => {
      if (cancelled) return;
      if (!startTime) startTime = now;
      const t = Math.min(1, (now - startTime) / 2000);
      root.scrollTop = startScroll + distance * (1 - Math.pow(1 - t, 3));   // easeOutCubic
      if (t < 1) raf = requestAnimationFrame(step);
      else cancel();
    };
    raf = requestAnimationFrame(step);
  }

  function scheduleReveal(sec: HTMLElement | null) {
    if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    revealTimeoutRef.current = window.setTimeout(() => autoReveal(sec), 1000);   // let the entry animation play first
  }

  useEffect(() => {
    const root = scrollRef.current;
    const s1 = section1Ref.current;
    const s2 = section2Ref.current;
    if (!root || !s1 || !s2) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const active = e.isIntersecting && e.intersectionRatio >= 0.5;
          if (e.target === s1) {
            if (active && !atS1Ref.current) {   // just landed on Section 1
              setSeenSection1(true);
              if (!revealedS1Ref.current) { revealedS1Ref.current = true; scheduleReveal(s1); }
            }
            atS1Ref.current = active;
            setAtSection1(active);
          }
          if (e.target === s2) {
            if (active && !atS2Ref.current) {   // just landed on Section 2
              setSeenSection2(true);
              if (!revealedS2Ref.current) { revealedS2Ref.current = true; scheduleReveal(s2); }
            }
            atS2Ref.current = active;
            setAtSection2(active);
          }
        }
      },
      { root, threshold: [0, 0.5, 1] },
    );
    io.observe(s1);
    io.observe(s2);
    return () => {
      io.disconnect();
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
      revealCancelRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const scrollToTop = () => section1Ref.current?.scrollIntoView({ behavior: 'smooth' });
  const scrollToGroovia = () => section2Ref.current?.scrollIntoView({ behavior: 'smooth' });

  async function loadSupportedCountries() {
    if (supportedCountries.length || countriesLoading) return;
    setCountriesLoading(true);
    try {
      const res = await fetch('/api/mentors/countries', { cache: 'no-store' });
      const data = res.ok ? await res.json() : null;
      setSupportedCountries(Array.isArray(data?.countries) ? data.countries : []);
    } catch {
      setSupportedCountries([]);
    } finally {
      setCountriesLoading(false);
    }
  }

  useEffect(() => {
    // Stay at the intro while only the welcome message exists; once a real conversation
    // is active (or restored), follow it to the latest message.
    if (!resumeUploaded && messages.length <= 1) return;
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, resumeUploaded]);

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

    setMessages((prev) => [...prev, { role: 'user', content: UI_CONTENT.uploadIndicator }]);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('message', '[SYSTEM_RESUME_UPLOADED]');
    formData.append('thread_id', threadId);

    try {
      const data = await postChat(formData);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response || UI_CONTENT.errors.noResponse },
      ]);
      setResumeUploaded(true);
      // A fresh resume upload starts the intent-selection step, so re-arm the option
      // buttons even if an earlier message (e.g. "hi") had set intentSelected.
      setIntentSelected(false);

      // Guests: open the auth gate. Modal won't close until they sign up / sign in.
      if (!authed) openGate();
    } catch (e) {
      applyChatError(e);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();

    // Dev/QA hook: "/ratelimit" or "/ratelimit 45" simulates a Groq rate-limit locally (and
    // on staging) so we can test the popup without waiting to actually hit the limit.
    const rl = trimmed.match(/^\/ratelimit(?:\s+(\d+))?$/i);
    if (rl) { setInput(''); triggerRateLimit(Number(rl[1]) || 30); return; }

    if (!trimmed || loading || rateLimited) return;

    // Guests must sign in before sending any message.
    if (gated) {
      openGate();
      return;
    }

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setIntentSelected(true);
    setLoading(true);

    const formData = new FormData();
    formData.append('message', trimmed);
    formData.append('thread_id', threadId);

    try {
      const data = await postChat(formData);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response || UI_CONTENT.errors.noResponse },
      ]);
      // First real turn just created/updated the thread row - refresh history so
      // the new title or thread shows up in the sidebar.
      if (authed) window.dispatchEvent(new CustomEvent('groovia:history-refresh'));
    } catch (e) {
      applyChatError(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Landmarks - fixed to viewport bottom, always visible regardless of chat state.
          z-index 0 puts it above the body background but below the z-1/z-10 content layers. */}
      <div
        className="fixed bottom-0 left-0 md:left-64 right-0 pointer-events-none select-none"
        style={{ zIndex: 0 }}
        aria-hidden
      >
        <img src="/landmarks.png" alt="" className="w-full block" style={{ opacity: LANDMARKS_OPACITY }} />
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf,.docx"
        className="hidden"
        disabled={resumeUploaded}
      />

      {/* Sticky controls: a centered back-to-top arrow (#10) and Clear chat (#11).
          Hidden while the Immigroov section is in view; fade in once scrolled into
          Groovia / the chat. */}
      <div
        className={cn(
          'absolute top-0 inset-x-0 z-20 h-12 transition-opacity duration-300',
          atSection1 ? 'opacity-0 pointer-events-none' : 'opacity-100',
        )}
      >
        <button
          onClick={scrollToTop}
          aria-label="Back to the top"
          title="Back to the top"
          className="absolute top-2 left-1/2 -translate-x-1/2 h-8 w-8 flex items-center justify-center rounded-full bg-white/90 backdrop-blur text-brand-800 shadow-sm hover:bg-white"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        {messages.length > 1 && (
          <button
            onClick={handleNewChat}
            title="Clear chat"
            className="absolute top-2 right-4 sm:right-auto sm:left-[63%] flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-xs font-medium text-brand-800 shadow-sm hover:bg-white"
          >
            <SquarePen className="h-3.5 w-3.5" />
            Clear chat
          </button>
        )}
      </div>

      {/* z-index: 1 creates a stacking context above the fixed landmarks (z-0), so the
          intros and message bubbles render on top of the image. */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto relative"
        style={{ zIndex: 1 }}
      >
        {/* Section 1: Immigroov intro. Section 2: Groovia intro. Both stay mounted so the
            user can scroll back up to the brand story at any time. `active` (this section
            is in view) drives the entrance animation - typing + boxes dropping in - so it
            plays when the user lands on the section and replays on the next scroll to it. */}
        <ImmigroovIntro ref={section1Ref} seen={seenSection1} />
        <ChatIntro ref={section2Ref} seen={seenSection2} />

        <div ref={chatStartRef} className="mx-auto max-w-3xl px-4 pt-8 pb-44 space-y-6">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn('flex gap-3 animate-fade-up', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {m.role === 'assistant' && <AiAvatar />}
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  m.role === 'user'
                    ? 'bg-brand-900 text-white rounded-br-sm'
                    : 'bg-brand-50/60 text-foreground rounded-bl-sm prose-chat',
                )}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
                  {m.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}

          {loading && <ThinkingIndicator />}

          {resumeUploaded && !intentSelected && !loading && (
            <div className="pt-2 animate-fade-up">
              <p className="text-sm font-medium text-foreground mb-3">{UI_CONTENT.intentPrompt}</p>
              <div className="flex flex-wrap gap-2">
                {INTENT_OPTIONS.map((opt) => {
                  const isMentor = 'mentor' in opt && opt.mentor;
                  if (!isMentor) {
                    return (
                      <button
                        key={opt.label}
                        onClick={() => sendMessage(opt.message)}
                        disabled={loading}
                        className="px-3.5 py-2 text-sm font-medium rounded-full bg-brand-50/70 text-brand-900 hover:bg-brand-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {opt.label}
                      </button>
                    );
                  }
                  // Find a Mentor: open a dropdown of countries we actually support.
                  return (
                    <div key={opt.label} className="relative">
                      <button
                        onClick={() => { setMentorPickerOpen((o) => !o); loadSupportedCountries(); }}
                        disabled={loading}
                        className="inline-flex items-center gap-1 px-3.5 py-2 text-sm font-medium rounded-full bg-brand-50/70 text-brand-900 hover:bg-brand-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {opt.label}
                        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', mentorPickerOpen && 'rotate-180')} />
                      </button>
                      {mentorPickerOpen && (
                        <div className="absolute z-30 mt-1 w-56 max-h-60 overflow-y-auto rounded-xl border border-[--color-border] bg-card shadow-lg p-1">
                          <p className="px-3 pt-1.5 pb-1 text-xs text-muted">Which country?</p>
                          {countriesLoading && <div className="px-3 py-2 text-sm text-muted">Loading…</div>}
                          {!countriesLoading && supportedCountries.length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted">No mentor countries yet.</div>
                          )}
                          {supportedCountries.map((code) => (
                            <button
                              key={code}
                              onClick={() => {
                                setMentorPickerOpen(false);
                                sendMessage(`I want to find a mentor in ${countryLabel(code)}.`);
                              }}
                              className="block w-full text-left px-3 py-2 text-sm rounded-lg text-brand-900 hover:bg-brand-50"
                            >
                              {countryLabel(code)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Landing scroll cue: the falling-chevron animation (pure CSS), floating in the gap
          above the composer. currentColor + the animation keep it dark but semi-transparent
          so it never hides content. Taps down to Groovia. */}
      {atSection1 && (
        <button
          type="button"
          onClick={scrollToGroovia}
          aria-label="Scroll down to Groovia"
          className="absolute bottom-40 sm:bottom-36 left-1/2 -translate-x-1/2 z-20 text-brand-800 animate-fade-up"
        >
          <span className="scroll-arrows block">
            <span className="scroll-arrow" />
            <span className="scroll-arrow" />
            <span className="scroll-arrow" />
          </span>
        </button>
      )}

      {/* z-index: 10 keeps the input bar above both the scroll area (z-1) and landmarks (z-0). */}
      <div className="bg-transparent relative" style={{ zIndex: 10 }}>
        <div className="mx-auto max-w-3xl px-4 py-4">
          {gated && resumeUploaded && (
            <button
              onClick={openGate}
              className="w-full flex items-center justify-center gap-2 mb-2 px-4 py-2.5 rounded-xl bg-accent-50 text-accent-700 hover:bg-accent-100 text-sm font-medium"
            >
              <Lock className="h-4 w-4" />
              {UI_CONTENT.signInToContinue}
            </button>
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

          {/* Resume nudge (#2): the "attach your resume" instruction, visible above the
              composer on the Groovia section until a resume is attached. */}
          {atSection2 && !resumeUploaded && !rateLimited && (
            <p className="text-center text-xs font-medium text-brand-700 mb-2 animate-fade-up">
              {UI_CONTENT.welcomeMessage}
            </p>
          )}

          <div
            className={cn(
              "flex items-end gap-2 rounded-2xl px-2 py-1.5",
              (gated && resumeUploaded || rateLimited) && "opacity-60",
              atSection2 && "composer-glow",   // translucent tint circling the text box
            )}
            style={{ backgroundColor: `rgba(255,255,255,${CHAT_INPUT_OPACITY})` }}
          >
            {FEATURES.resumeUpload && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || resumeUploaded}
                title={resumeUploaded ? UI_CONTENT.tooltips.resumeAlreadyUploaded : UI_CONTENT.tooltips.attachResume}
                className={cn(
                  "h-9 w-9 flex items-center justify-center rounded-lg hover:bg-brand-50/40 disabled:opacity-30 disabled:cursor-not-allowed",
                  // Nudge first-time users to the clip until a resume is attached.
                  !resumeUploaded && !loading ? "text-accent-600 animate-attach-pulse" : "text-muted hover:text-foreground",
                )}
              >
                <Paperclip className="h-4 w-4" />
              </button>
            )}

            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder={gated && resumeUploaded ? UI_CONTENT.inputPlaceholderLocked : UI_CONTENT.inputPlaceholder}
              disabled={(gated && resumeUploaded) || rateLimited}
              className="flex-1 bg-transparent border-none outline-none text-sm leading-relaxed resize-none py-2 max-h-40 disabled:cursor-not-allowed"
            />

            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim() || (gated && resumeUploaded) || rateLimited}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-brand-900 text-white hover:bg-brand-800 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          <p className="text-center text-xs text-muted mt-3 px-4">{UI_CONTENT.disclaimer}</p>
        </div>
      </div>

      {showRateModal && rateLimitedUntil !== null && (
        <RateLimitModal until={rateLimitedUntil} onClose={() => setShowRateModal(false)} />
      )}
    </div>
  );
}

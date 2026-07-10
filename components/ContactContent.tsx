'use client';
import { useState } from 'react';
import { Mail, MessageCircle, Megaphone, Send, Building2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { UI_CONTENT } from '../lib/content';
import { Card, CardBody } from './ui/Card';
import { Input } from './ui/Input';

const c = UI_CONTENT.contact;

export function ContactContent() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-brand-900">{c.heading}</h1>
        <p className="mt-4 text-base text-muted leading-relaxed">{c.subheading}</p>
      </div>

      {/* Quick-contact cards */}
      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        <ChannelCard icon={Mail} tone="bg-blue-50 text-blue-600" title={c.cards.email.title} sub={c.cards.email.sub}>
          <a href={`mailto:${c.cards.email.address}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline break-all">
            {c.cards.email.address} <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
        </ChannelCard>

        <ChannelCard icon={MessageCircle} tone="bg-emerald-50 text-emerald-600" title={c.cards.chat.title} sub={c.cards.chat.sub}>
          <a href={c.links.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
            {c.cards.chat.label} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </ChannelCard>

        <ChannelCard icon={Megaphone} tone="bg-amber-50 text-amber-600" title={c.cards.follow.title} sub={c.cards.follow.sub}>
          <div className="flex flex-wrap gap-2">
            <SocialChip href={c.links.linkedin} label="LinkedIn" />
            <SocialChip href={c.links.instagram} label="Instagram" />
          </div>
        </ChannelCard>
      </div>

      {/* Form + offices */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3 items-start">
        <Card className="lg:col-span-2">
          <CardBody className="pt-6">
            <ContactForm />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="pt-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-brand-900">
              <Building2 className="h-5 w-5 text-brand-600" /> {c.offices.title}
            </h2>
            <div className="mt-5 flex flex-col gap-4">
              <Office label={c.offices.europe.label} address={c.offices.europe.address} />
              <Office label={c.offices.asia.label} address={c.offices.asia.address} />
            </div>
            <p className="mt-5 pt-4 border-t border-[--color-border] text-xs text-muted leading-relaxed">
              {c.offices.note}
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function ChannelCard({ icon: Icon, tone, title, sub, children }: {
  icon: React.ComponentType<{ className?: string }>; tone: string; title: string; sub: string; children: React.ReactNode;
}) {
  return (
    <Card>
      <CardBody className="pt-6 flex flex-col gap-3">
        <span className={`h-11 w-11 rounded-xl flex items-center justify-center ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-brand-900">{title}</h3>
          <p className="text-sm text-muted mt-0.5">{sub}</p>
        </div>
        {children}
      </CardBody>
    </Card>
  );
}

function SocialChip({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-[--color-border] px-2.5 py-1.5 text-xs font-medium text-brand-900 hover:border-brand-300 hover:bg-brand-50/40">
      {label} <ExternalLink className="h-3 w-3 text-muted" />
    </a>
  );
}

function Office({ label, address }: { label: string; address: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-brand-900">{label}</p>
      <p className="text-sm text-muted leading-relaxed">{address}</p>
    </div>
  );
}

function ContactForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const wordCount = message.trim() ? message.trim().split(/\s+/).length : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !email.trim() || !message.trim() || wordCount > 500) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: firstName.trim(), last_name: lastName.trim(), email: email.trim(), topic, message: message.trim() }),
      });
      if (!res.ok) throw new Error();
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-10">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        <p className="text-base font-medium text-brand-900">{c.sent}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-brand-900">
        <Send className="h-5 w-5 text-brand-600" /> {c.formTitle}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label={c.firstName} value={firstName} onChange={(e) => setFirstName(e.target.value)} required maxLength={100} autoComplete="given-name" />
        <Input label={c.lastName} value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={100} autoComplete="family-name" />
      </div>

      <Input label={c.emailLabel} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">{c.topicLabel}</label>
        <select
          value={topic} onChange={(e) => setTopic(e.target.value)}
          className="h-11 px-3 rounded-xl bg-white text-sm text-foreground shadow-[0_0_0_1px_rgba(15,23,42,0.06)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]"
        >
          <option value="">{c.topicPlaceholder}</option>
          {c.topics.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">{c.messageLabel}</label>
        <textarea
          rows={5} value={message} onChange={(e) => setMessage(e.target.value)} required
          placeholder={c.messagePlaceholder}
          className="px-3 py-2 rounded-xl bg-white text-sm text-foreground resize-y placeholder:text-muted shadow-[0_0_0_1px_rgba(15,23,42,0.06)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]"
        />
        <p className={`text-xs text-right ${wordCount > 500 ? 'text-red-500' : 'text-muted'}`}>{wordCount}/500 words</p>
      </div>

      {status === 'error' && <p className="text-sm text-red-600">{c.error}</p>}

      <div>
        <button
          type="submit" disabled={status === 'sending' || wordCount > 500}
          className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-brand-900 text-white text-sm font-semibold hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {status === 'sending' ? 'Sending…' : c.submit}
          <Send className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

'use client';
import { useState } from 'react';
import { Card, CardBody } from './ui/Card';
import { Badge } from './ui/Badge';
import { ProfileEditor } from './ProfileEditor';
import { BookingManager } from './BookingManager';

type Tab = 'profile' | 'sessions';

// Account, as tabs within the page (Profile / Sessions) - mirrors the admin page pattern,
// replacing the old nav dropdown.
export function AccountTabs({
  userId,
  fullName,
  email,
  phone,
  summary,
  role,
}: {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  summary: string;
  role: string;
}) {
  const [tab, setTab] = useState<Tab>('profile');
  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'sessions', label: 'Sessions' },
  ];

  return (
    <div>
      <div className="mt-8 flex items-center gap-1 border-b border-[--color-border] overflow-x-auto overflow-y-hidden">
        {tabs.map((x) => (
          <button
            key={x.key}
            onClick={() => setTab(x.key)}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors ${
              tab === x.key ? 'border-brand-900 text-brand-900' : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'profile' && (
          <div className="grid gap-4 reveal-children">
            <Card>
              <CardBody className="pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-brand-700 to-accent-500 flex items-center justify-center text-white text-base font-semibold">
                      {(fullName?.[0] ?? email?.[0] ?? 'U').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-foreground truncate">{fullName || '-'}</h2>
                      <p className="text-sm text-muted truncate">{email}</p>
                    </div>
                  </div>
                  <Badge tone="brand">{role}</Badge>
                </div>
              </CardBody>
            </Card>

            <ProfileEditor userId={userId} initialFullName={fullName} initialPhone={phone} initialSummary={summary} />
          </div>
        )}

        {tab === 'sessions' && <BookingManager role="mentee" />}
      </div>
    </div>
  );
}

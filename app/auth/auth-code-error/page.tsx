import Link from 'next/link';
import { MailWarning } from 'lucide-react';
import { Card, CardBody } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export const metadata = { title: 'Sign-in link problem - Immigroov' };

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="max-w-md w-full">
        <CardBody className="pt-8 pb-7 text-center flex flex-col gap-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700">
            <MailWarning className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-brand-900">This sign-in link didn&apos;t work</h1>
          <p className="text-sm text-muted leading-relaxed">
            The link may have expired, already been used, or been opened in a different
            browser than the one you requested it from. Request a fresh link and open it
            in the same browser.
          </p>
          <div className="flex flex-col gap-2 mt-3">
            <Link href="/home?auth=open"><Button className="w-full">Request a new link</Button></Link>
            <Link href="/home"><Button variant="ghost" className="w-full">Back to home</Button></Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

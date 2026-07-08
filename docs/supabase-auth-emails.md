# Branded Supabase auth emails

The sign-in / sign-up emails are sent by **Supabase**, not our backend, so they're
configured in the Supabase dashboard (per project - do it for staging and prod).

## 1. Templates

Dashboard → **Authentication → Emails → Templates**. Our passwordless flow uses two:
- **Magic Link** - sent to existing users signing in.
- **Confirm signup** - sent to brand-new users (the one that currently reads
  "Confirm your email address … powered by Supabase").

Paste the HTML below into **both** (they share `{{ .ConfirmationURL }}`), and set the
subject:
- Magic Link subject: `Sign in to Immigroov`
- Confirm signup subject: `Confirm your Immigroov account`

```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:40px 16px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:12px;padding:40px 44px;max-width:480px">
        <tr><td>
          <p style="margin:0 0 28px">
            <img src="https://immigroov-groovia-staging.vercel.app/Immigroov_Transparent_Logo.png" alt="Immigroov" height="28" style="height:28px;width:auto;display:block;border:0">
          </p>
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0a0a0a">Sign in to Immigroov</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.6">Click the button below to securely sign in. This link is one-time and expires shortly.</p>
          <p style="margin:0 0 28px">
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:8px;font-size:15px;font-weight:600">Sign in to Immigroov</a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.6">Or paste this link into your browser:</p>
          <p style="margin:0 0 24px;font-size:13px;color:#6b7fff;word-break:break-all">{{ .ConfirmationURL }}</p>
          <p style="margin:0;font-size:13px;color:#888;line-height:1.6">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #e8e8e8;margin:32px 0">
          <p style="margin:0;font-size:12px;color:#999">Immigroov - mentorship for moving and building your career abroad.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
```

For prod, swap the logo URL to the prod domain.

## 2. Branded sender address (optional, needs a verified domain)

By default the email comes from `noreply@mail.app.supabase.io`. To send from
`immigroov.com`, point Supabase at Resend's SMTP:

Dashboard → **Authentication → Emails → SMTP Settings → Enable Custom SMTP**:
- Host: `smtp.resend.com`
- Port: `465` (SSL) or `587` (TLS)
- Username: `resend`
- Password: your **Resend API key**
- Sender email: `noreply@<your-verified-domain>` (same domain verified in Resend)
- Sender name: `Immigroov`

This reuses the same Resend domain verification as the transactional emails, so once
that's done both the auth emails and the booking emails come from your domain.

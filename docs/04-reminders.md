# Email reminders — setup

The app sends one email a day to anyone with cards due, at the hour they chose
in Settings, in their own timezone.

## Why the cron runs hourly, not daily

Users pick a reminder hour and live in different timezones. A single daily run
could only ever be right for one of them. The hourly sweep asks "whose local
time is now their reminder hour?" and sends to that slice — `reminder_hour`
means nothing without it.

`profiles.last_reminded_on` stops the same person being emailed twice if a run
retries or two overlap. It is written **after** a successful send, so a Resend
outage means a retry an hour later rather than a silently skipped day.

## 1. Resend

Free tier: 3,000 emails/month, 100/day, one verified domain.

1. Create an account and an API key at [resend.com](https://resend.com).
2. For testing you can send from `onboarding@resend.dev` without verifying
   anything — but only to **your own** address. Real recipients need a verified
   domain.
3. Put the key in `.env.local` and in Vercel's environment variables:

```
RESEND_API_KEY=re_...
EMAIL_FROM=Flashcards <reminders@yourdomain.com>
CRON_SECRET=<openssl rand -hex 32>
```

## 2. Scheduling

`POST /api/cron/reminders` with `Authorization: Bearer $CRON_SECRET`.

**Vercel Cron will not do this on the free plan** — Hobby allows one run per
day, which brings back the problem the hourly sweep exists to solve. Use
Supabase's scheduler instead, which is free and runs as often as you like.

In the Supabase SQL editor, once, against your **hosted** project:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'flashcard-reminders',
  '0 * * * *',                        -- every hour, on the hour
  $$
  select net.http_post(
    url     := 'https://YOUR-APP.vercel.app/api/cron/reminders',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer YOUR_CRON_SECRET"}'::jsonb
  );
  $$
);
```

Check it later with `select * from cron.job;` and
`select * from cron.job_run_details order by start_time desc limit 10;`.

## 3. Testing locally

```bash
curl -X POST http://localhost:3000/api/cron/reminders \
  -H "Authorization: Bearer $CRON_SECRET"
```

The response tells you what happened rather than just "ok":

```json
{ "considered": 1, "dueNow": 0, "sent": 0, "skipped": 0, "failures": [] }
```

`dueNow: 0` almost always means the current hour is not your `reminder_hour` —
set it to the current hour in Settings and run it again.

## Deliberate choices

- **No email when nothing is due.** A "you have 0 cards" message trains people
  to ignore the sender. `last_reminded_on` is also left untouched in that case,
  so approving cards later the same day still earns a reminder at the next
  sweep.
- **Plain HTML, no images, no tracking pixel.** A study reminder that reads
  like a newsletter gets unsubscribed from.
- **Deck names are escaped.** They are user input arriving in an HTML email.
- **`sendEmail` is a thin function over the HTTP API, not the SDK.** The
  payload is four fields; switching provider means rewriting one function.
  Worth knowing: Brevo's free tier allows 300/day against Resend's 100, if the
  daily cap ever becomes the binding constraint.

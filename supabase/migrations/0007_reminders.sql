-- =============================================================================
-- Daily reminder emails.
--
-- The cron job runs hourly and asks "whose local reminder time is now?", so it
-- needs a record of who has already been emailed today. Without it, a retry —
-- or two overlapping runs — sends the same person the same email twice, which
-- is the fastest way to teach someone to filter your mail into the bin.
-- =============================================================================

alter table public.profiles
  add column if not exists last_reminded_on date;

-- The cron query is "everyone due a reminder", which without this scans every
-- profile every hour.
create index if not exists profiles_reminder_idx
  on public.profiles(daily_email_enabled, last_reminded_on)
  where daily_email_enabled;

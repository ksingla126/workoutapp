-- Sends reminders every 15 minutes. Run once in Supabase SQL Editor AFTER:
--   1. Database → Extensions: enable "pg_cron" and "pg_net"
--   2. Replace YOUR-APP-URL and YOUR-CRON-SECRET below (CRON_SECRET is the same value you add in Vercel)
select cron.unschedule('send-reminders') where exists (select 1 from cron.job where jobname = 'send-reminders');
select cron.schedule(
  'send-reminders',
  '*/15 * * * *',
  $$ select net.http_get(
       url := 'https://YOUR-APP-URL/api/reminders',
       headers := jsonb_build_object('Authorization', 'Bearer YOUR-CRON-SECRET')
     ); $$
);

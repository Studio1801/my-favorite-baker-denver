# My Favorite Baker

Owner dashboard (`/`) and customer order form (`/order`) for My Favorite Baker Denver. Demo build: data lives in the browser.

## Emailing customers from an order

Every order has an **Emails with [name]** section. New orders go through a review step first:

1. Order comes in from `/order` and shows under **Needs you > Review and confirm**.
2. Carlie opens it and either **Confirms** (sends the confirmation, then the invoice if "Send the invoice when you confirm" is on) or **Asks a question** / **Suggests a change**.
3. While waiting, the order sits under **Waiting on their reply**. When the customer replies it moves back to **Review and confirm** with a "Replied" tag.
4. Every email in and out is saved on the order with time, subject and status.

Templates: Confirm order, Question on the design, Suggest a change, Pickup reminder. All are editable before sending.

### Going live with Resend

Right now `MAIL_LIVE` is `false` in `index.html`, so emails are only saved, not sent.

1. Create a Resend account, verify the sending domain, and make an API key.
2. In Vercel > Project > Settings > Environment Variables add the keys from `.env.example`. For local dev, copy it to `.env.local` and run `vercel dev`.
3. In `index.html` set `MAIL_LIVE = true` and send the `x-dashboard-token` header in `sendMail`.
4. Redeploy. The dashboard calls `POST /api/send-order-email` (`api/send-order-email.js`).

Replies: set `MAIL_REPLY_TO` so replies land in Carlie's inbox. To show replies inside the dashboard, use Resend inbound email (or a Gmail forward to an inbound webhook) and save them to the table below.

### Storage when we add a database

```sql
create table order_messages (
  id          uuid primary key default gen_random_uuid(),
  order_id    text not null references orders(id),
  direction   text not null check (direction in ('out','in')),
  template    text,                 -- confirm | ask | change | pickup | null
  subject     text not null,
  body        text not null,
  status      text not null,        -- sending | delivered | opened | replied | failed | received
  provider_id text,                 -- Resend email id
  created_at  timestamptz not null default now()
);
create index on order_messages (order_id, created_at);
alter table orders add column review_state text; -- null | asked | replied | ok
```

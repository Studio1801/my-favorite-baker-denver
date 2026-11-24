// POST /api/send-order-email
// Sends one email to a customer about their order, through Resend.
// Body: { orderId, to, subject, text }
// Env: RESEND_API_KEY, MAIL_FROM, MAIL_REPLY_TO (optional), DASHBOARD_TOKEN (optional but recommended)

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }

  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) return res.status(500).json({ error: 'Email is not set up yet. Add RESEND_API_KEY and MAIL_FROM.' });

  // Only the dashboard should be able to send. Send this token in the x-dashboard-token header.
  const token = process.env.DASHBOARD_TOKEN;
  if (token && req.headers['x-dashboard-token'] !== token) return res.status(401).json({ error: 'Not allowed.' });

  const { orderId = '', to = '', subject = '', text = '' } = req.body || {};
  if (!EMAIL.test(to)) return res.status(400).json({ error: 'That email address does not look right.' });
  if (!subject.trim() || subject.length > 200) return res.status(400).json({ error: 'Add a subject under 200 characters.' });
  if (!text.trim() || text.length > 10000) return res.status(400).json({ error: 'Add a message under 10,000 characters.' });

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject: subject.trim(),
        text,
        reply_to: process.env.MAIL_REPLY_TO || undefined,
        tags: [{ name: 'order_id', value: String(orderId).replace(/[^\w-]/g, '').slice(0, 64) || 'none' }],
      }),
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: j.message || 'The email service said no.' });
    return res.status(200).json({ id: j.id, status: 'sent', at: new Date().toISOString() });
  } catch (e) {
    return res.status(502).json({ error: 'Could not reach the email service.' });
  }
};

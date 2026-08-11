// Vercel serverless function: принимает заявку с сайта и шлёт её в Telegram.
// Требует переменные окружения TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_IDS
// (задаются в Vercel → Project Settings → Environment Variables, не в коде).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const { name, phone, task, website } = req.body ?? {};

  // Honeypot: скрытое поле, которое видят только боты — если оно заполнено,
  // тихо отвечаем «успех», не отправляя ничего в Telegram.
  if (website) {
    return res.status(200).json({ ok: true });
  }

  if (typeof name !== 'string' || !name.trim() || typeof phone !== 'string' || !phone.trim()) {
    return res.status(400).json({ ok: false, error: 'missing_fields' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = (process.env.TELEGRAM_CHAT_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (!token || chatIds.length === 0) {
    console.error('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_IDS не заданы в переменных окружения');
    return res.status(500).json({ ok: false, error: 'server_not_configured' });
  }

  const text = [
    '🪑 Новая заявка — Scandi Мебель',
    `Имя: ${name.trim()}`,
    `Телефон: ${phone.trim()}`,
    task && task.trim() ? `Что нужно: ${task.trim()}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const results = await Promise.all(
      chatIds.map((chat_id) =>
        fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id, text }),
        })
      )
    );

    const failed = results.filter((r) => !r.ok);
    if (failed.length === results.length) {
      throw new Error('Все отправки в Telegram провалились');
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Telegram send failed', err);
    return res.status(502).json({ ok: false, error: 'telegram_failed' });
  }
}

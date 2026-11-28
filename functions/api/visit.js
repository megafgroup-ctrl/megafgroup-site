// Siteye giren her yeni ziyaretçi için Telegram bildirimi gönderir.
// Cloudflare Pages ortam değişkenleri: TG_TOKEN (bot token, gizli), TG_CHAT (sohbet numarası)
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|python|curl|wget/i;
const FLAG = { KZ:'🇰🇿', TR:'🇹🇷', RU:'🇷🇺', UZ:'🇺🇿', KG:'🇰🇬', CN:'🇨🇳', KR:'🇰🇷', QA:'🇶🇦', DE:'🇩🇪', US:'🇺🇸', AE:'🇦🇪', SA:'🇸🇦', AZ:'🇦🇿', TM:'🇹🇲', TJ:'🇹🇯', GB:'🇬🇧', FR:'🇫🇷', IT:'🇮🇹' };

export async function onRequestPost({ request, env }) {
  if (!env.TG_TOKEN || !env.TG_CHAT) return new Response('not configured', { status: 204 });
  const ua = request.headers.get('user-agent') || '';
  const origin = request.headers.get('origin') || '';
  if (BOT_RE.test(ua) || (origin && !/megafgroup\.(com|pages\.dev)/.test(new URL(origin).hostname))) {
    return new Response(null, { status: 204 });
  }
  let d = {};
  try { d = await request.json(); } catch (e) {}
  const cf = request.cf || {};
  const place = [cf.city, cf.country].filter(Boolean).join(', ') || 'bilinmiyor';
  const dev = /iPad|Tablet/i.test(ua) ? 'Tablet' : /Mobi|Android|iPhone/i.test(ua) ? 'Telefon' : 'Bilgisayar';
  let ref = 'Doğrudan giriş';
  try { if (d.ref) { const h = new URL(d.ref).hostname.replace(/^www\./, ''); if (!/megafgroup/.test(h)) ref = /google\./.test(h) ? 'Google' : /yandex\./.test(h) ? 'Yandex' : h; } } catch (e) {}
  const time = new Date().toLocaleString('tr-TR', { timeZone: 'Asia/Almaty', dateStyle: 'short', timeStyle: 'short' });
  const clip = (s, n) => String(s || '').slice(0, n);
  const text = [
    '🔔 megafgroup.com — yeni ziyaretçi',
    `📍 ${FLAG[cf.country] || '🌍'} ${clip(place, 60)}`,
    `📱 ${dev} · 🌐 ${clip(d.lang, 5).toUpperCase() || '?'}`,
    `↪️ ${clip(ref, 60)}`,
    `🕒 ${time}`,
  ].join('\n');
  await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TG_CHAT, text, disable_web_page_preview: true }),
  });
  return new Response(null, { status: 204 });
}

export async function onRequestGet() { return new Response('ok'); }

// Megaf Group site Worker: statik siteyi sunar, /api/* isteklerini karşılar.
// Gizli değişkenler (Cloudflare panelinden): TG_TOKEN, TG_CHAT
// Siteye giren her yeni ziyaretçi için Telegram bildirimi gönderir.
// Cloudflare Pages ortam değişkenleri: TG_TOKEN (bot token, gizli), TG_CHAT (sohbet numarası)
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|python|curl|wget/i;
const FLAG = { KZ:'🇰🇿', TR:'🇹🇷', RU:'🇷🇺', UZ:'🇺🇿', KG:'🇰🇬', CN:'🇨🇳', KR:'🇰🇷', QA:'🇶🇦', DE:'🇩🇪', US:'🇺🇸', AE:'🇦🇪', SA:'🇸🇦', AZ:'🇦🇿', TM:'🇹🇲', TJ:'🇹🇯', GB:'🇬🇧', FR:'🇫🇷', IT:'🇮🇹' };

async function visit(request, env) {
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


// Kurulum yardımcısı: bota son yazan sohbetin numarasını (chat id) gösterir.
// TG_CHAT ayarlandıktan sonra hiçbir şey göstermez.
async function tgSetup(env) {
  const h = { 'content-type': 'text/plain; charset=utf-8' };
  if (!env.TG_TOKEN) return new Response('TG_TOKEN henüz eklenmemiş.', { headers: h });
  if (env.TG_CHAT) return new Response('Kurulum tamam.', { headers: h });
  const r = await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/getUpdates`);
  const j = await r.json();
  const m = (j.result || []).map(u => u.message || u.my_chat_member).filter(Boolean).pop();
  if (!m) return new Response('Bota henüz mesaj gelmemiş. Telegram’da bota "merhaba" yazıp bu sayfayı yenileyin.', { headers: h });
  return new Response(`TG_CHAT değeri: ${m.chat.id}`, { headers: h });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/visit') {
      if (request.method === 'POST') { ctx.waitUntil(visit(request, env).catch(() => {})); return new Response(null, { status: 204 }); }
      return new Response('ok');
    }
    if (url.pathname === '/api/tg-setup') return tgSetup(env);
    return env.ASSETS.fetch(request);
  }
};

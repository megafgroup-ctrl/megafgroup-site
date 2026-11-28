// Megaf Group site Worker: statik siteyi sunar, ziyaretçi bildirimlerini Telegram'a gönderir.
// Gizli değişken (Cloudflare panelinden): TG_TOKEN (GT_TOKEN adı da kabul edilir)
const CHAT_DEFAULT = '8271412032';
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|python|curl|wget|monitor|uptime/i;
const FLAG = c => c && c.length === 2 ? String.fromCodePoint(...[...c.toUpperCase()].map(x => 127397 + x.charCodeAt(0))) : '🌍';
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const clip = (s, n) => String(s ?? '').slice(0, n);

function device(ua) {
  let os = /Windows NT 10/.test(ua) ? 'Windows 10/11' : /Windows/.test(ua) ? 'Windows'
    : /iPhone/.test(ua) ? 'iPhone (iOS ' + ((ua.match(/OS (\d+)_/) || [])[1] || '?') + ')'
    : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android ' + ((ua.match(/Android ([\d.]+)/) || [])[1] || '')
    : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Bilinmiyor';
  const model = (ua.match(/Android [\d.]+; ([^;)]+?)(?: Build|\))/) || [])[1];
  if (model && !/^K$/.test(model)) os += ' · ' + model.trim();
  const br = /YaBrowser/.test(ua) ? 'Yandex' : /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera'
    : /SamsungBrowser/.test(ua) ? 'Samsung' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari' : 'Diğer';
  const kind = /iPad|Tablet/i.test(ua) ? 'Tablet' : /Mobi|Android|iPhone/i.test(ua) ? 'Telefon' : 'Bilgisayar';
  const inApp = /Instagram/.test(ua) ? ' (Instagram içinden)' : /FBAN|FBAV/.test(ua) ? ' (Facebook içinden)'
    : /Telegram/.test(ua) ? ' (Telegram içinden)' : /WhatsApp/.test(ua) ? ' (WhatsApp içinden)' : '';
  return { kind, os, br: br + inApp };
}

function source(ref, utm) {
  if (utm) return 'Reklam/kampanya: ' + utm;
  if (!ref) return 'Doğrudan giriş (adresi yazdı ya da kayıtlı linkten)';
  try {
    const u = new URL(ref), h = u.hostname.replace(/^www\./, '');
    if (/megafgroup/.test(h)) return 'Site içi';
    const name = /google\./.test(h) ? 'Google' : /yandex\./.test(h) ? 'Yandex' : /bing\./.test(h) ? 'Bing'
      : /instagram/.test(h) ? 'Instagram' : /facebook|fb\.com/.test(h) ? 'Facebook' : /t\.me|telegram/.test(h) ? 'Telegram'
      : /whatsapp/.test(h) ? 'WhatsApp' : /linkedin/.test(h) ? 'LinkedIn' : /youtube/.test(h) ? 'YouTube' : h;
    const q = u.searchParams.get('q') || u.searchParams.get('text');
    return name + (q ? ` — aradığı: "${clip(q, 80)}"` : '');
  } catch (e) { return clip(ref, 80); }
}

async function tg(env, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TG_CHAT, parse_mode: 'HTML', disable_web_page_preview: true, ...body }),
  });
  try { return await r.json(); } catch (e) { return {}; }
}

const fmtDur = s => s < 60 ? `${s} sn` : `${Math.floor(s / 60)} dk ${s % 60} sn`;
const nowStr = () => new Date().toLocaleString('tr-TR', { timeZone: 'Asia/Almaty', dateStyle: 'short', timeStyle: 'short' });

async function visit(request, env) {
  const ua = request.headers.get('user-agent') || '';
  const origin = request.headers.get('origin') || '';
  if (BOT_RE.test(ua)) return { skip: 'bot' };
  try { if (origin && !/megafgroup\.(com|pages\.dev|workers\.dev)$|megafgroup/.test(new URL(origin).hostname)) return { skip: 'origin' }; } catch (e) {}
  let d = {};
  try { d = await request.json(); } catch (e) { return { skip: 'body' }; }
  const cf = request.cf || {};
  const ip = request.headers.get('cf-connecting-ip') || '';
  const id = `#${clip(d.vid, 8)}`;

  if (d.type === 'start') {
    const dv = device(ua);
    const place = [cf.city, cf.region, cf.country].filter(Boolean).join(', ') || 'bilinmiyor';
    const map = cf.latitude && cf.longitude ? ` · <a href="https://maps.google.com/?q=${cf.latitude},${cf.longitude}">harita</a>` : '';
    const v = d.visits || {};
    const lines = [
      `🔔 <b>megafgroup.com — yeni ziyaretçi</b> ${id}`,
      `📍 ${FLAG(cf.country)} ${esc(place)}${cf.postalCode ? ' (' + esc(cf.postalCode) + ')' : ''}${map}`,
      `🏢 İnternet/kurum: ${esc(cf.asOrganization || 'bilinmiyor')}`,
      `🔢 IP: <code>${esc(ip)}</code>`,
      `📱 ${dv.kind} · ${esc(dv.os)} · ${esc(dv.br)}`,
      `🖥 Ekran ${esc(d.scr)} · pencere ${esc(d.view)}${d.cores ? ' · ' + esc(d.cores) + ' çekirdek' : ''}${d.mem ? ' · ' + esc(d.mem) + ' GB RAM' : ''}${d.net ? ' · ağ ' + esc(d.net) : ''}`,
      `🌐 Site dili ${esc(clip(d.lang, 5).toUpperCase())} · tarayıcı dili ${esc(clip(d.blang, 40))} · saat dilimi ${esc(clip(d.tz, 40))}`,
      `↪️ ${esc(source(d.ref, d.utm))}`,
      `📄 Açtığı sayfa: ${esc(clip(d.path, 60))}`,
      v.n > 1 ? `🔁 <b>${v.n}. ziyareti</b> (ilk: ${esc(new Date(v.first).toLocaleDateString('tr-TR', { timeZone: 'Asia/Almaty' }))})` : '🆕 İlk ziyareti',
      `🕒 ${nowStr()}`,
    ];
    const r = await tg(env, 'sendMessage', { text: lines.join('\n') });
    return { mid: r && r.result && r.result.message_id };
  }

  if (d.type === 'click') {
    const msg = d.msg ? `\n💬 Yazdığı mesaj: <i>${esc(clip(d.msg, 300))}</i>` : '';
    await tg(env, 'sendMessage', { text: `☎️ <b>${id} iletişime geçmek istedi:</b> ${esc(d.what)}${msg}\n🕒 ${nowStr()}` });
    return {};
  }

  if (d.type === 'end') {
    const secs = Object.entries(d.secs || {}).filter(([, s]) => s >= 2).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const lines = [
      `📊 <b>${id} ziyaret özeti</b>`,
      `⏱ Sitede kaldığı süre: ${fmtDur(+d.dur || 0)} · sayfanın %${Math.min(100, +d.depth || 0)} kadarını gördü`,
      secs.length ? '👀 Baktığı bölümler:\n' + secs.map(([k, s]) => `  • ${esc(k)} — ${fmtDur(s)}`).join('\n') : '👀 Bölümlere bakmadan çıktı',
      ...(d.events || []).slice(0, 10).map(e => `✔️ ${esc(clip(e, 60))}`),
    ];
    const text = lines.join('\n');
    if (d.mid) {
      await tg(env, 'sendMessage', { text, reply_to_message_id: +d.mid, allow_sending_without_reply: true });
    } else {
      await tg(env, 'sendMessage', { text });
    }
    return {};
  }
  return {};
}

async function tgSetup(env) {
  const h = { 'content-type': 'text/plain; charset=utf-8' };
  if (!env.TG_TOKEN) return new Response('TG_TOKEN henüz eklenmemiş.', { headers: h });
  if (env.TG_CHAT) return new Response('Kurulum tamam.', { headers: h });
  return new Response('Sohbet numarası eksik.', { headers: h });
}

export default {
  async fetch(request, env0, ctx) {
    const env = Object.assign({}, env0, {
      TG_TOKEN: env0.TG_TOKEN || env0.GT_TOKEN,
      TG_CHAT: env0.TG_CHAT || env0.GT_CHAT || CHAT_DEFAULT,
    });
    const url = new URL(request.url);
    if (url.pathname === '/api/visit') {
      if (request.method !== 'POST') return new Response('ok');
      if (!env.TG_TOKEN) return new Response('{}', { headers: { 'content-type': 'application/json' } });
      // 'end' sendBeacon ile gelir, cevabı beklenmez; diğerlerinde mesaj numarası geri döner
      const p = visit(request, env).catch(() => ({}));
      const out = await p;
      return new Response(JSON.stringify(out || {}), { headers: { 'content-type': 'application/json' } });
    }
    if (url.pathname === '/api/tg-setup') return tgSetup(env);
    return env.ASSETS.fetch(request);
  },
};

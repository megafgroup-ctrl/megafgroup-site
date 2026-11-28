// Kurulum yardımcısı: bota son yazan sohbetin numarasını (chat id) gösterir.
// TG_CHAT ayarlandıktan sonra hiçbir şey göstermez.
export async function onRequestGet({ env }) {
  const h = { 'content-type': 'text/plain; charset=utf-8' };
  if (!env.TG_TOKEN) return new Response('TG_TOKEN henüz eklenmemiş.', { headers: h });
  if (env.TG_CHAT) return new Response('Kurulum tamam.', { headers: h });
  const r = await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/getUpdates`);
  const j = await r.json();
  const m = (j.result || []).map(u => u.message || u.my_chat_member).filter(Boolean).pop();
  if (!m) return new Response('Bota henüz mesaj gelmemiş. Telegram’da bota "merhaba" yazıp bu sayfayı yenileyin.', { headers: h });
  return new Response(`TG_CHAT değeri: ${m.chat.id}`, { headers: h });
}

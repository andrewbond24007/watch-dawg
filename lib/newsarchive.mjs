// Keeps every story the scheduled refresh sees for a week, so the News tab doesn't lose stories when a
// source's feed moves on. Compact: long posts are trimmed, images and links kept.
export const ARCHIVE_DAYS = 7;
export const MAX_ITEMS = 3000;
const key = (p) => p.id || p.link || p.text;
export function mergeArchive(prev, items, now = Date.now()) {
  const cut = now - ARCHIVE_DAYS * 864e5, map = new Map();
  for (const p of [...(prev?.items || []), ...(items || [])]) {
    if (!p || !p.time || Date.parse(p.time) < cut || Date.parse(p.time) > now + 300e3) continue;
    const q = { ...p, text: String(p.text || '').slice(0, 600) };
    const k = key(q), old = map.get(k);
    map.set(k, old && old.cats && q.cats ? { ...q, cats: [...new Set([...old.cats, ...q.cats])] } : q);
  }
  const out = [...map.values()].sort((a, b) => Date.parse(b.time) - Date.parse(a.time)).slice(0, MAX_ITEMS);
  return { updated: new Date(now).toISOString(), days: ARCHIVE_DAYS, items: out };
}

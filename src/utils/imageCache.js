import { useState, useEffect } from 'react';

const _cache = {};

export async function fetchAndCache(src) {
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return src;
  if (_cache[src]) return _cache[src];
  const res = await fetch(src);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  _cache[src] = url;
  return url;
}

export function useBlobUrl(src) {
  const [resolved, setResolved] = useState(() => {
    if (!src) return null;
    if (src.startsWith('data:') || src.startsWith('blob:')) return src;
    return _cache[src] ?? null;
  });

  useEffect(() => {
    if (!src) { setResolved(null); return; }
    if (src.startsWith('data:') || src.startsWith('blob:')) { setResolved(src); return; }
    const cached = _cache[src];
    if (cached) { setResolved(cached); return; }
    let active = true;
    fetchAndCache(src)
      .then(url => { if (active) setResolved(url); })
      .catch(() => {});
    return () => { active = false; };
  }, [src]);

  return resolved;
}

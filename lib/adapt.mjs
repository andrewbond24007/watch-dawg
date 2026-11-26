// Runs a Netlify-style web handler (req => Response) on Vercel and maps
// Netlify's CDN cache header to Vercel's equivalent.
export const adapt = (handler) => async (req) => {
  const res = await handler(req);
  const headers = new Headers(res.headers);
  const cdn = headers.get('netlify-cdn-cache-control');
  // Vercel's own header is the one its edge cache is sure to honour; keep the generic one for other CDNs
  if (cdn) { headers.set('vercel-cdn-cache-control', cdn); headers.set('cdn-cache-control', cdn); }
  else if (headers.get('cdn-cache-control')) headers.set('vercel-cdn-cache-control', headers.get('cdn-cache-control'));
  headers.delete('netlify-cdn-cache-control');
  headers.delete('netlify-vary');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
};

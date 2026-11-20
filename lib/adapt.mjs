// Runs a Netlify-style web handler (req => Response) on Vercel and maps
// Netlify's CDN cache header to Vercel's equivalent.
export const adapt = (handler) => async (req) => {
  const res = await handler(req);
  const headers = new Headers(res.headers);
  const cdn = headers.get('netlify-cdn-cache-control');
  if (cdn) headers.set('cdn-cache-control', cdn);
  headers.delete('netlify-cdn-cache-control');
  headers.delete('netlify-vary');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
};

// Cloudflare Pages Function: reverse-proxy every /api/* request to the Render
// API origin.
//
// Why: the frontend (this Pages project) and the API (Render) live on different
// hosts, but we want the browser to see ONE origin (roundsahead.com) so the
// httpOnly session cookie stays first-party and no CORS is needed. This mirrors
// what the old nginx did with `location /api`. The mobile app uses Bearer
// tokens and can hit the API directly, so it's unaffected either way.
//
// Set API_ORIGIN in the Pages project's environment variables to the Render
// service URL, e.g. https://roundsahead-api.onrender.com (no trailing /api).
//
// The request (method, headers incl. Cookie, and raw body) is forwarded
// untouched — important so the Stripe webhook's raw-body signature still
// verifies — and the response (incl. Set-Cookie) is passed straight back.

interface Env {
  API_ORIGIN: string;
}

export const onRequest = async (context: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = context;
  const origin = (env.API_ORIGIN || '').replace(/\/$/, '');
  if (!origin) {
    return new Response('API_ORIGIN is not configured', { status: 500 });
  }

  const incoming = new URL(request.url);
  const target = `${origin}${incoming.pathname}${incoming.search}`;

  // Preserve method, headers, and body. redirect: 'manual' so the API's own
  // 3xx (e.g. OAuth callbacks) reach the browser instead of being followed here.
  return fetch(target, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'manual',
  });
};

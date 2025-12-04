export const prerender = false;
export async function POST({ request }: { request: Request }) {
  const body = await request.json().catch(() => ({}));
  return Response.json({ ok: true, received: body });
}

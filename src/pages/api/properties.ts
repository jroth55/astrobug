export const prerender = false;
export async function GET() {
  return Response.json({ properties: [{ id: 'p1', name: 'Sample Property' }] });
}

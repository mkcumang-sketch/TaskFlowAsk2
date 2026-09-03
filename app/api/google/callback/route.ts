export async function GET(request: Request) {
  const target = new URL("/api/auth/google/callback", request.url);
  target.search = new URL(request.url).search;
  return Response.redirect(target);
}

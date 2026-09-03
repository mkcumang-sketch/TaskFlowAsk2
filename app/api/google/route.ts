export async function GET() {
  return Response.redirect(new URL("/api/auth/google", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}
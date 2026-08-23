import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.SUPABASE_URL?.trim();
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();

  return NextResponse.json(
    url && publishableKey
      ? { configured: true, url, publishableKey }
      : { configured: false },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}

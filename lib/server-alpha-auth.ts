import { createClient } from "@supabase/supabase-js";

type AlphaStatus = { allowed: boolean; isAdmin: boolean; programOpen: boolean; testerStatus: string };

export async function requireAlphaAccess(request: Request): Promise<Response | null> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return Response.json({ error: "Authentication required." }, { status: 401 });
  const token = authorization.slice(7).trim();
  if (!token) return Response.json({ error: "Authentication required." }, { status: 401 });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return Response.json({ error: "Account services are unavailable." }, { status: 503 });
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) return Response.json({ error: "Your session is no longer valid. Sign in again." }, { status: 401 });
  const { data, error } = await client.rpc("alpha_access_status");
  if (error) return Response.json({ error: "Alpha access could not be verified." }, { status: 403 });
  const status = data as AlphaStatus;
  if (!status.allowed) return Response.json({ error: status.programOpen ? "This account is not active in the RoamPilot alpha." : "The RoamPilot alpha is temporarily closed." }, { status: 403 });
  return null;
}


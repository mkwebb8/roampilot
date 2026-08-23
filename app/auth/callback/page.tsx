"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function AuthCallbackPage() {
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    const finish = async () => {
      try {
        const code = new URL(window.location.href).searchParams.get("code");
        if (!code) throw new Error("The sign-in response did not include an authorization code.");
        const response = await fetch("/api/cloud-config", { cache: "no-store" });
        const config = await response.json() as { configured: boolean; url?: string; publishableKey?: string };
        if (!config.configured || !config.url || !config.publishableKey) throw new Error("RoamPilot cloud authentication is not configured.");
        // This page owns the PKCE exchange explicitly. Disabling URL auto-detection
        // prevents supabase-js from racing this call and consuming the verifier first.
        const client = createClient(config.url, config.publishableKey, {
          auth: {
            flowType: "pkce",
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
          },
        });
        const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
        if (!cancelled) window.location.replace("/");
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Sign-in could not be completed.");
      }
    };
    void finish();
    return () => { cancelled = true; };
  }, []);
  return <main className="auth-shell"><section className="auth-card"><small>ROAMPILOT PRIVATE BETA</small><h1>{error ? "Sign-in needs another try." : "Finishing sign-in…"}</h1><p>{error || "Your secure session is being prepared."}</p>{error&&<button onClick={()=>window.location.replace("/")}>Return to sign in</button>}</section></main>;
}

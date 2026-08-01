import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export interface UserProfile {
  archetype: string | null;
  display_name: string | null;
  tier: string | null;
  assertiveness_level: number | null;
  onboarding_complete: boolean;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchUserProfile(userId: string) {
      try {
        const { data } = await supabase
          .from("users")
          .select("onboarding_complete, archetype, display_name, tier, assertiveness_level")
          .eq("id", userId)
          .maybeSingle();
        if (!cancelled) {
          setProfile({
            archetype: data?.archetype ?? null,
            display_name: data?.display_name ?? null,
            tier: data?.tier ?? null,
            assertiveness_level: data?.assertiveness_level ?? null,
            onboarding_complete: data?.onboarding_complete === true,
          });
        }
      } catch {
        if (!cancelled) setProfile(null);
      }
    }

    async function init() {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);

        if (data.session?.user?.id) {
          await fetchUserProfile(data.session.user.id);
        }
      } catch {
        // Supabase client not initialized — treat as logged out
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    let subscription: { unsubscribe: () => void } | null = null;

    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (cancelled) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user?.id) {
          fetchUserProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      });
      subscription = data.subscription;
    } catch {
      // Supabase client not initialized — treat as logged out
    }

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  return { session, user, loading, profile };
}

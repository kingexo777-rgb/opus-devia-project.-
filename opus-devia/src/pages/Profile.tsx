import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import BottomNav from "../components/home/BottomNav";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface XpData {
  earned: number;
  purchased: number;
  rollover: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const ASSERTIVENESS_LABELS: Record<number, string> = {
  1: "Supportive",
  2: "Balanced Gentle",
  3: "Balanced",
  4: "Direct",
  5: "Blunt",
};

function tierColor(tier: string | null): string {
  // DB stores lowercase; normalize for comparison
  const t = (tier ?? "").toLowerCase();
  switch (t) {
    case "builder":
      return "#1d9e75";
    case "operator":
      return "#ef9f27";
    case "founder":
      return "var(--theme-accent, #9a0000)";
    default:
      return "#A8A8A8";
  }
}

/* ------------------------------------------------------------------ */
/*  Card shell                                                        */
/* ------------------------------------------------------------------ */

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "rgba(26,29,39,0.5)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 22,
        padding: "20px 18px",
        marginBottom: 12,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [xp, setXp] = useState<XpData>({ earned: 0, purchased: 0, rollover: 0 });
  const [assertiveness, setAssertiveness] = useState<number>(
    profile?.assertiveness_level ?? 3,
  );
  const [savingAssertiveness, setSavingAssertiveness] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  /* ---- Display name fallback ---- */
  const displayName =
    profile?.display_name ??
    user?.user_metadata?.display_name ??
    user?.user_metadata?.full_name ??
    user?.email?.split("@")[0] ??
    "User";

  /* ---- Assertiveness from profile ---- */
  useEffect(() => {
    if (profile?.assertiveness_level != null) {
      setAssertiveness(profile.assertiveness_level);
    }
  }, [profile?.assertiveness_level]);

  /* ---- Fetch XP ---- */
  const fetchXp = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: xpErr } = await supabase
        .from("user_xp")
        .select("earned, purchased, rollover")
        .eq("user_id", user.id)
        .maybeSingle();

      if (xpErr) {
        console.warn("Failed to fetch XP:", xpErr.message);
        setError("Could not load XP data");
        return;
      }

      setXp({
        earned: data?.earned ?? 0,
        purchased: data?.purchased ?? 0,
        rollover: data?.rollover ?? 0,
      });
    } catch (err) {
      console.error("XP fetch failed:", err);
      setError(err instanceof Error ? err.message : "Failed to load XP");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchXp();
  }, [fetchXp]);

  useEffect(() => {
    if (!user?.id) return;
    const handleXpUpdated = () => fetchXp();
    if (typeof window !== "undefined") {
      window.addEventListener("user_xp_updated", handleXpUpdated);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("user_xp_updated", handleXpUpdated);
      }
    };
  }, [fetchXp, user?.id]);

  /* ---- Assertiveness change ---- */
  const handleAssertivenessChange = useCallback(
    async (value: number) => {
      setAssertiveness(value);
      if (!user?.id) return;

      setSavingAssertiveness(true);
      try {
        await supabase
          .from("users")
          .update({ assertiveness_level: value })
          .eq("id", user.id);
      } catch (err) {
        console.error("Failed to save assertiveness:", err);
      } finally {
        setSavingAssertiveness(false);
      }
    },
    [user?.id],
  );

  /* ---- Sign out ---- */
  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      navigate("/signin", { replace: true });
    } catch (err) {
      console.error("Sign out failed:", err);
      setSigningOut(false);
    }
  }, [navigate]);

  /* ---- Guard: no user ---- */
  if (!user) return null;

  const totalXp = xp.earned + xp.purchased + xp.rollover;
  const archetype = profile?.archetype;
  const tier = profile?.tier ?? "Free";

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: "transparent",
        isolation: "isolate",
        maxWidth: 390,
        margin: "0 auto",
        minHeight: "100vh",
        padding: "2px 10px 90px",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 0 12px",
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#F5F5F5",
            letterSpacing: "-0.3px",
          }}
        >
          Profile
        </h1>

        <button
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#A8A8A8",
            transition: "color 0.2s ease",
          }}
          aria-label="Settings"
          onClick={() => navigate("/settings")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* ── Identity Section ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "0 0 20px",
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--theme-accent, rgba(154,0,0,0.6)), color-mix(in srgb, var(--theme-accent, #DC143C) 30%, transparent))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 700,
            color: "#F5F5F5",
            border: "2px solid var(--theme-accent, rgba(154,0,0,0.5))",
            flexShrink: 0,
          }}
        >
          {displayName.charAt(0).toUpperCase()}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#F5F5F5",
              letterSpacing: "-0.2px",
            }}
          >
            {displayName}
          </span>

          {archetype && (
            <span
              style={{
                display: "inline-block",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--theme-accent, #9a0000)",
                background: "var(--glossy-pill-bg, color-mix(in srgb, var(--theme-accent, #9a0000) 12%, transparent))",
                border: "1px solid var(--glossy-pill-border, color-mix(in srgb, var(--theme-accent, #9a0000) 25%, transparent))",
                borderRadius: 999,
                padding: "3px 10px",
                alignSelf: "flex-start",
                boxShadow: "var(--glossy-pill-shadow, none)",
              }}
            >
              {archetype}
            </span>
          )}
        </div>
      </div>

      {/* ── XP Breakdown Card ── */}
      <Card>
        <h2
          style={{
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#A8A8A8",
            marginBottom: 14,
          }}
        >
          XP Breakdown
        </h2>

        {error ? (
          <p style={{ color: "#DC143C", fontSize: 13 }}>{error}</p>
        ) : (
          <>
            {/* Earned */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <span style={{ color: "#C0C0C0", fontSize: 14 }}>Earned</span>
              <span style={{ color: "#F5F5F5", fontSize: 14, fontWeight: 600 }}>
                {loading ? "..." : xp.earned.toLocaleString()}
              </span>
            </div>

            {/* Purchased */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <span style={{ color: "#C0C0C0", fontSize: 14 }}>Purchased</span>
              <span style={{ color: "#F5F5F5", fontSize: 14, fontWeight: 600 }}>
                {loading ? "..." : xp.purchased.toLocaleString()}
              </span>
            </div>

            {/* Rollover */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <span style={{ color: "#C0C0C0", fontSize: 14 }}>Rollover</span>
              <span style={{ color: "#F5F5F5", fontSize: 14, fontWeight: 600 }}>
                {loading ? "..." : xp.rollover.toLocaleString()}
              </span>
            </div>

            {/* Total */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 0 4px",
              }}
            >
              <span style={{ color: "#C0C0C0", fontSize: 15, fontWeight: 600 }}>
                Total XP
              </span>
              <span
                style={{
                  color: "#F5F5F5",
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: "-0.3px",
                }}
              >
                {loading ? "..." : totalXp.toLocaleString()}
              </span>
            </div>
          </>
        )}
      </Card>

      {/* ── Assertiveness Slider ── */}
      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h2
            style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#A8A8A8",
            }}
          >
            Mentor Assertiveness
          </h2>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: savingAssertiveness ? "#ef9f27" : "#C0C0C0",
              transition: "color 0.2s ease",
            }}
          >
            {savingAssertiveness ? "Saving..." : ASSERTIVENESS_LABELS[assertiveness]}
          </span>
        </div>

        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={assertiveness}
          title={`Mentor Assertiveness: ${ASSERTIVENESS_LABELS[assertiveness]}`}
          onChange={(e) => handleAssertivenessChange(Number(e.target.value))}
          style={{
            width: "100%",
            height: 6,
            appearance: "none",
            WebkitAppearance: "none",
            background: `linear-gradient(to right, var(--theme-accent, #9a0000) 0%, var(--theme-accent, #9a0000) ${((assertiveness - 1) / 4) * 100}%, rgba(255,255,255,0.1) ${((assertiveness - 1) / 4) * 100}%, rgba(255,255,255,0.1) 100%)`,
            borderRadius: 3,
            outline: "none",
            cursor: "pointer",
          }}
          className="assertiveness-slider"
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 8,
          }}
        >
          <span style={{ fontSize: 10, color: "#7b7f88" }}>1</span>
          <span style={{ fontSize: 10, color: "#7b7f88" }}>2</span>
          <span style={{ fontSize: 10, color: "#7b7f88" }}>3</span>
          <span style={{ fontSize: 10, color: "#7b7f88" }}>4</span>
          <span style={{ fontSize: 10, color: "#7b7f88" }}>5</span>
        </div>
      </Card>

      {/* ── Tier Badge ── */}
      <Card>
        <h2
          style={{
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#A8A8A8",
            marginBottom: 14,
          }}
        >
          Membership Tier
        </h2>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: tierColor(tier),
              boxShadow: `0 0 10px ${tierColor(tier)}40`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: tierColor(tier),
              letterSpacing: "-0.2px",
            }}
          >
            {tier}
          </span>
        </div>
      </Card>

      {/* ── Journal & Community Links ── */}
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <Link
          to="/journal"
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(26,29,39,0.5)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: "14px 16px",
            textDecoration: "none",
            color: "#F5F5F5",
            transition: "border-color 0.2s ease",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--theme-accent, #9a0000)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Journal</div>
            <div style={{ fontSize: 10, color: "#7b7f88", marginTop: 1 }}>Your entries</div>
          </div>
        </Link>

        <Link
          to="/community"
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(26,29,39,0.5)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: "14px 16px",
            textDecoration: "none",
            color: "#F5F5F5",
            transition: "border-color 0.2s ease",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--theme-accent, #9a0000)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Community</div>
            <div style={{ fontSize: 10, color: "#7b7f88", marginTop: 1 }}>Connect & share</div>
          </div>
        </Link>
      </div>

      {/* ── Sign Out ── */}
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        style={{
          width: "100%",
          padding: "14px 0",
          borderRadius: 16,
          border: "1px solid color-mix(in srgb, var(--theme-accent, #9a0000) 30%, transparent)",
          background: signingOut ? "color-mix(in srgb, var(--theme-accent, #9a0000) 8%, transparent)" : "color-mix(in srgb, var(--theme-accent, #9a0000) 12%, transparent)",
          color: "var(--theme-accent, #DC143C)",
          fontSize: 15,
          fontWeight: 600,
          cursor: signingOut ? "not-allowed" : "pointer",
          transition: "background 0.25s ease, color 0.25s ease",
          marginTop: 8,
        }}
        onMouseEnter={(e) => {
          if (!signingOut) {
            e.currentTarget.style.background = "color-mix(in srgb, var(--theme-accent, #9a0000) 22%, transparent)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = signingOut
            ? "color-mix(in srgb, var(--theme-accent, #9a0000) 8%, transparent)"
            : "color-mix(in srgb, var(--theme-accent, #9a0000) 12%, transparent)";
        }}
      >
        {signingOut ? "Signing out..." : "Sign Out"}
      </button>

      {/* ── Bottom Nav ── */}
      <BottomNav />
    </div>
  );
}

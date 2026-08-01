import lv1_10 from "../../assets/badges/lv_1_10.svg";
import lv10_20 from "../../assets/badges/lv_10_20.svg";
import lv20_30 from "../../assets/badges/lv_20_30.svg";
import lv30_40 from "../../assets/badges/lv_30_40.svg";
import lv40_50 from "../../assets/badges/lv_40_50.svg";
import lv50_60 from "../../assets/badges/lv_50_60.svg";
import lv70_80 from "../../assets/badges/lv_70_80.svg";
import lv80_99 from "../../assets/badges/lv_80_99.svg";
import lv100 from "../../assets/badges/lv_100.svg";

function getBadge(level: number): string {
  if (level >= 100) return lv100;
  if (level >= 80) return lv80_99;
  if (level >= 70) return lv70_80;
  if (level >= 50) return lv50_60;
  if (level >= 40) return lv40_50;
  if (level >= 30) return lv30_40;
  if (level >= 20) return lv20_30;
  if (level >= 10) return lv10_20;
  return lv1_10;
}

function getBadgeGlow(level: number): string {
  if (level >= 100) return "0 0 60px rgba(255,69,0,0.7), 0 0 120px rgba(255,0,0,0.4)";
  if (level >= 80) return "0 0 45px rgba(224,176,255,0.6), 0 0 90px rgba(128,0,128,0.3)";
  if (level >= 70) return "0 0 35px rgba(224,176,255,0.5), 0 0 70px rgba(128,0,128,0.25)";
  if (level >= 50) return "0 0 30px rgba(255,215,0,0.5), 0 0 60px rgba(184,134,11,0.3)";
  if (level >= 40) return "0 0 25px rgba(255,215,0,0.4), 0 0 50px rgba(184,134,11,0.2)";
  if (level >= 30) return "0 0 20px rgba(192,192,192,0.4), 0 0 40px rgba(112,112,112,0.2)";
  if (level >= 20) return "0 0 18px rgba(192,192,192,0.35), 0 0 35px rgba(112,112,112,0.18)";
  if (level >= 10) return "0 0 15px rgba(205,127,50,0.35), 0 0 30px rgba(139,69,19,0.18)";
  return "0 0 12px rgba(205,127,50,0.3), 0 0 24px rgba(139,69,19,0.15)";
}

interface LevelHeroProps {
  level: number;
  archetype: string | null;
  earnedXP: number;
  totalXP: number;
  loading: boolean;
}

export default function LevelHero({ level, archetype, earnedXP, totalXP, loading }: LevelHeroProps) {
  if (loading) {
    return (
      <section style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 0, paddingBottom: 0 }}>
        <div className="badge-lens" style={{ opacity: 0.5, background: "radial-gradient(circle at 45% 35%, rgba(28, 28, 32, 0.92) 0%, rgba(16, 16, 20, 0.95) 60%, rgba(8, 8, 12, 0.98) 100%)", border: "1.5px solid rgba(255, 255, 255, 0.18)" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.04)", animation: "pulse 2s infinite" }} />
        </div>
        <div style={{ marginTop: 6, height: 18, width: 50, background: "rgba(255,255,255,0.05)", borderRadius: 5 }} />
        <div style={{ marginTop: 2, height: 8, width: 60, background: "rgba(255,255,255,0.03)", borderRadius: 3 }} />
      </section>
    );
  }

  const badgeSrc = getBadge(level);
  const glow = getBadgeGlow(level);

  return (
    <section style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 0, paddingBottom: 0 }}>
      {/* Glass Lens Enclosure */}
      <div
        className="badge-lens"
        style={{ perspective: "600px" }}
      >
        <img
          src={badgeSrc}
          alt={`Level ${level} badge`}
          style={{
            width: 82,
            height: 82,
            objectFit: "contain",
            filter: `drop-shadow(${glow})`,
            transform: "rotateX(10deg) rotateY(-5deg) translateZ(2px)",
            transformStyle: "preserve-3d",
            willChange: "transform",
            WebkitUserSelect: "none",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Level */}
      <h1 style={{ marginTop: 2, fontSize: 20, fontWeight: 800, letterSpacing: 0.4, color: "#ffffff" }}>
        LV. {level}
      </h1>

      {/* XP */}
      <p style={{ marginTop: 0, color: "#A8A8A8", letterSpacing: 1, fontSize: 11, fontWeight: 500 }}>
        {earnedXP.toLocaleString()} / {totalXP.toLocaleString()} XP
      </p>

      {/* Archetype */}
      <p style={{ marginTop: 1, color: "rgba(255,255,255,0.35)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase" }}>
        {archetype || "Initiate"}
      </p>
    </section>
  );
}
import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import QuestionCard from "../components/onboarding/QuestionCard";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

const TOTAL = 12;

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const [responses, setResponses] = useState<any>({});

  useEffect(() => {
    console.log('Onboarding mounted');
    return () => console.log('Onboarding unmounted');
  }, []);

  useEffect(() => {
    console.log('index changed:', index);
  }, [index]);

  const setSlideText = useCallback((i: number, value: string, extra?: any) => {
    setResponses((r: any) => ({ ...r, ["slide" + (i + 1)]: { ...(r["slide" + (i + 1)] || {}), text: value, ...extra } }));
  }, []);

  const saveDraft = useCallback(async (saveIndex?: number) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const toSaveIndex = typeof saveIndex === "number" ? saveIndex : index;
      await supabase.from("draft_sessions").upsert({
        user_id: user.id,
        responses,
        current_question: toSaveIndex + 1,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 1200);
    } catch (err) {
      console.error("Failed to save draft:", err);
    } finally {
      setSaving(false);
    }
  }, [user?.id, responses, index]);

  const goNext = useCallback(async () => {
    const nextIndex = index + 1;
    // If we're past the last slide, submit
    if (nextIndex >= TOTAL) {
      // save final progress (so resume reflects completion)
      await saveDraft(nextIndex);
      // submit
      const answers = mapResponsesToAnswers(responses);
      try {
        await supabase.functions.invoke("roadmap-generator", { body: JSON.stringify({ answers }) });
      } catch (err) {
        console.error("Roadmap generator invocation failed:", err);
      }
      navigate("/processing");
      return;
    }

    // Save the draft as the NEXT slide so resume goes to where the user is heading
    await saveDraft(nextIndex);
    setIndex(nextIndex);
  }, [index, saveDraft, responses, navigate]);

  const goBack = useCallback(() => {
    if (index === 0) return;
    setIndex((i) => i - 1);
  }, [index]);

  // Helper to update structured data for a slide
  const setStructured = useCallback((i: number, key: string, value: any) => {
    setResponses((r: any) => ({ ...r, ["slide" + (i + 1)]: { ...(r["slide" + (i + 1)] || {}), [key]: value } }));
  }, []);

  // Slide renderers
  function Slide1() {
    const s = responses.slide1 || {};
    return (
      <QuestionCard
        slideIndex={0}
        totalSlides={TOTAL}
        title={"Let's start with you."}
        subtitle={"This shapes everything Opus builds for you."}
        structuredContent={(
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div>
              <label style={{ color: "#A8A8A8", fontSize: 12 }}>How old are you?</label>
              <input type="number" min={13} max={65} value={s.age || ""} onChange={(e) => setStructured(0, "age", e.target.value)} style={{ width: 120, marginTop: 6 }} />
            </div>
            <div>
              <label style={{ color: "#A8A8A8", fontSize: 12 }}>Where are you based?</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, width: "100%", maxWidth: "100%", marginTop: 6 }}>
                { ["Africa","Asia","Europe","North America","South America","Middle East","Oceania"].map((o) => (
                  <button key={o} onClick={() => setStructured(0, "region", o)} style={{ padding: "6px 8px", borderRadius: 999, background: (s.region===o)?"#9a0000":"rgba(255,255,255,0.03)", color: "#fff", border: "none" }}>{o}</button>
                )) }
              </div>
            </div>
          </div>
        )}
        textValue={s.text || ""}
        setTextValue={(v) => setSlideText(0, v)}
        textMinChars={40}
        onBack={goBack}
        onNext={goNext}
        onSaveDraft={saveDraft}
        saving={saving}
        draftSaved={draftSaved}
        direction={"forward"}
      />
    );
  }

  // For brevity, only implementing Slide2 and Slide3 similarly; others follow same pattern.
  function Slide2() {
    const s = responses.slide2 || {};
    return (
      <QuestionCard
        slideIndex={1}
        totalSlides={TOTAL}
        title={"What are you actually trying to build?"}
        subtitle={"Not the safe answer. The real one."}
        structuredContent={(
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: "#A8A8A8", fontSize: 12 }}>Pick the closest match:</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                { ["A business that makes money","A personal brand or audience","A skill that opens doors","Financial independence","A product or app","Something I can't fully explain yet"].map((o) => (
                  <button key={o} onClick={() => setStructured(1, "goalType", o)} style={{ padding: "6px 8px", borderRadius: 999, background: (s.goalType===o)?"#9a0000":"rgba(255,255,255,0.03)", color: "#fff", border: "none" }}>{o}</button>
                )) }
              </div>
            </div>
            <div>
              <label style={{ color: "#A8A8A8", fontSize: 12 }}>When do you need to see real results?</label>
              <input type="range" min={1} max={60} value={s.timeline || 12} onChange={(e) => setStructured(1, "timeline", e.target.value)} style={{ width: "100%", marginTop: 8 }} />
              <div style={{ color: "#A8A8A8", marginTop: 6 }}>Timeline: {s.timeline || 12} months</div>
            </div>
          </div>
        )}
        textValue={s.text || ""}
        setTextValue={(v) => setSlideText(1, v)}
        textMinChars={60}
        onBack={goBack}
        onNext={goNext}
        onSaveDraft={saveDraft}
        saving={saving}
        draftSaved={draftSaved}
        direction={"forward"}
      />
    );
  }

  function Slide3() {
    const s = responses.slide3 || {};
    return (
      <QuestionCard
        slideIndex={2}
        totalSlides={TOTAL}
        title={"Something made you start today."}
        subtitle={"That thing matters more than you think."}
        structuredContent={(
          <div>
            <div style={{ marginBottom: 12 }}>
              { ["I hit a wall and had to change something","I saw someone else doing what I want to do","I finally have the time or resources","A deadline or pressure forced it","I've been planning this for a while and finally started"].map((o) => (
                <button key={o} onClick={() => setStructured(2, "motivationTrigger", o)} style={{ marginRight: 8, marginBottom: 8, padding: "6px 8px", borderRadius: 999, background: (s.motivationTrigger===o)?"#9a0000":"rgba(255,255,255,0.03)", color: "#fff", border: "none" }}>{o}</button>
              )) }
            </div>
            <div>
              <label style={{ color: "#A8A8A8", fontSize: 12 }}>How urgent does this feel right now?</label>
              <input type="range" min={1} max={10} value={s.urgency || 5} onChange={(e) => setStructured(2, "urgency", e.target.value)} style={{ width: "100%", marginTop: 8 }} />
              <div style={{ color: "#A8A8A8", marginTop: 6 }}>Urgency: {s.urgency || 5}/10</div>
            </div>
          </div>
        )}
        textValue={s.text || ""}
        setTextValue={(v) => setSlideText(2, v)}
        textMinChars={40}
        onBack={goBack}
        onNext={goNext}
        onSaveDraft={saveDraft}
        saving={saving}
        draftSaved={draftSaved}
        direction={"forward"}
      />
    );
  }

  function renderCurrent() {
    switch (index) {
      case 0:
        return Slide1();
      case 1:
        return Slide2();
      case 2:
        return Slide3();
      case 3:
        return Slide4();
      case 4:
        return Slide5();
      case 5:
        return Slide6();
      case 6:
        return Slide7();
      case 7:
        return Slide8();
      case 8:
        return Slide9();
      case 9:
        return Slide10();
      case 10:
        return Slide11();
      case 11:
        return Slide12();
      default:
        return null;
    }
  }

  function Slide4() {
    const s = responses.slide4 || {};
    const SKILLS = [
      "Sales","Writing","Design","Coding","Marketing","Video","Research","Finance",
      "Operations","Teaching","Networking","Public Speaking","Data Analysis","Strategy","Photography","Music","Other",
    ];

    const toggleSkill = (name: string) => {
      setResponses((r: any) => {
        const prev = r.slide4?.skills ?? [];
        const exists = prev.find((p: any) => p.name === name);
        let next = [];
        if (exists) next = prev.filter((p: any) => p.name !== name);
        else next = [...prev.slice(0,2), ...(prev.length>=3?[]:[]), ...prev.filter(Boolean), { name, rating: 3 }];
        // ensure max 3 unique by name
        next = Array.from(new Map(next.map((x: any) => [x.name, x])).values()).slice(0,3);
        return { ...r, slide4: { ...(r.slide4||{}), skills: next } };
      });
    };

    const setSkillRating = (name: string, rating: number) => {
      setResponses((r: any) => {
        const prev = r.slide4?.skills ?? [];
        const next = prev.map((p: any) => p.name === name ? { ...p, rating } : p);
        return { ...r, slide4: { ...(r.slide4||{}), skills: next } };
      });
    };

    return (
      <QuestionCard
        slideIndex={3}
        totalSlides={TOTAL}
        title={"What are you actually good at?"}
        subtitle={"Rate yourself honestly. Overconfidence breaks roadmaps."}
        structuredContent={(
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {SKILLS.map((k) => (
                <button key={k} onClick={() => toggleSkill(k)} style={{ padding: "6px 8px", borderRadius: 999, background: (s.skills?.some((x: any)=>x.name===k))?"#9a0000":"rgba(255,255,255,0.03)", color: "#fff", border: "none" }}>{k}</button>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              {s.skills?.map((sk: any) => (
                <div key={sk.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>{sk.name}</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[1,2,3,4,5].map((n) => (
                      <button key={n} onClick={() => setSkillRating(sk.name, n)} style={{ width: 28, height: 28, borderRadius: 6, background: sk.rating>=n?"#9a0000":"rgba(255,255,255,0.04)", color: "#fff", border: "none" }}>{n}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        textValue={s.text || ""}
        setTextValue={(v) => setSlideText(3, v)}
        textMinChars={30}
        onBack={goBack}
        onNext={goNext}
        onSaveDraft={saveDraft}
        saving={saving}
        draftSaved={draftSaved}
        direction={"forward"}
      />
    );
  }

  function Slide5() {
    const s = responses.slide5 || {};
    const counts = ["0","1–2","3–4","5+"];
    const stages = [
      "Just an idea, never started","Started but stopped within days","Got a few weeks in then stopped","Built something but never launched","Launched but got no traction","Got traction but could[...]

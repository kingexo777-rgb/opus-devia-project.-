import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import QuestionCard from "../components/onboarding/QuestionCard";
import ProcessingScreen from "../components/onboarding/ProcessingScreen";
import ArchetypeReveal from "../components/onboarding/ArchetypeReveal";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

const TOTAL = 12;

export default function Onboarding() {
  const { user } = useAuth();
  import { useNavigate } from "react-router-dom";

  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const [responses, setResponses] = useState<any>({});

  // Stage management: 'questions' | 'processing' | 'reveal'
  const [stage, setStage] = useState<'questions' | 'processing' | 'reveal'>('questions');
  const [generatedArchetype, setGeneratedArchetype] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      await saveDraft(nextIndex);

      setStage('processing');

      const answers = mapResponsesToAnswers(responses);

      try {
        const result = await supabase.functions.invoke("roadmap-generator", {
          body: JSON.stringify({ answers }),
        });

        const archetype = result.data?.archetype ?? result.data?.data?.archetype ?? null;
        setGeneratedArchetype(archetype);

        // Mark onboarding complete in the database now that generation succeeded
        if (user?.id) {
          await supabase
            .from('users')
            .update({ onboarding_complete: true })
            .eq('id', user.id);
        }

        setStage('reveal');
      } catch (err) {
        console.error("Roadmap generator invocation failed:", err);
        setStage('questions'); // fall back so user isn't stuck on a blank processing screen
        setError('Something went wrong generating your roadmap. Please try again.');
      }
      return;
    }

    // Save the draft as the NEXT slide so resume goes to where the user is heading
    await saveDraft(nextIndex);
    setIndex(nextIndex);
  }, [index, saveDraft, responses, user?.id]);

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
              { ["I hit a wall and had to change something","I saw someone else doing what I want to do","I finally have the time or resources","A deadline or pressure forced it","I've been planning this for months"].map((o) => (
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
                      <button key={n} onClick={() => setSkillRating(sk.name, n)} style={{ width: 28, height: 28, borderRadius: 6, background: sk.rating>=n?"#9a0000":"rgba(255,255,255,0.04)", color: "#fff", border: "none" }} />
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
      "Just an idea, never started","Started but stopped within days","Got a few weeks in then stopped","Built something but never launched","Launched but got no traction","Got traction but could have scaled more"
    ];

    return (
      <QuestionCard
        slideIndex={4}
        totalSlides={TOTAL}
        title={"The last 12 months."}
        subtitle={"Most builders have a graveyard. That's normal. Tell us what's in yours."}
        structuredContent={(
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#A8A8A8", marginBottom: 6 }}>How many things did you start but not finish?</div>
              <div style={{ display: "flex", gap: 8 }}>
                {counts.map((c) => (
                  <button key={c} onClick={() => setStructured(4, "projectCount", c)} style={{ padding: "6px 8px", borderRadius: 999, background: (s.projectCount===c)?"#9a0000":"rgba(255,255,255,0.03)", color: "#fff", border: "none" }}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ color: "#A8A8A8", marginBottom: 6 }}>How far did the furthest one get?</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {stages.map((sOpt) => (
                  <button key={sOpt} onClick={() => setStructured(4, "furthestStage", sOpt)} style={{ padding: "6px 8px", borderRadius: 12, background: (s.furthestStage===sOpt)?"#9a0000":"rgba(255,255,255,0.03)", color: "#fff", border: "none" }}>{sOpt}</button>
                ))}
              </div>
            </div>
          </div>
        )}
        textValue={s.text || ""}
        setTextValue={(v) => setSlideText(4, v)}
        textMinChars={50}
        onBack={goBack}
        onNext={goNext}
        onSaveDraft={saveDraft}
        saving={saving}
        draftSaved={draftSaved}
        direction={"forward"}
      />
    );
  }

  function Slide6() {
    const s = responses.slide6 || {};
    const options = [
      "Lost motivation when it got hard","Ran out of time","Ran out of money","No one cared or bought","Got distracted by something else","Didn't know what to do next","Fear of it actually working",
    ];

    const toggle = (opt: string) => {
      setResponses((r: any) => {
        const prev = r.slide6?.failureModes ?? [];
        const exists = prev.includes(opt);
        let next = exists ? prev.filter((p: string) => p !== opt) : [...prev, opt];
        if (next.length > 3) next = next.slice(0,3);
        return { ...r, slide6: { ...(r.slide6||{}), failureModes: next } };
      });
    };

    return (
      <QuestionCard
        slideIndex={5}
        totalSlides={TOTAL}
        title={"What actually killed it?"}
        subtitle={"The real reason, not the one that sounds acceptable."}
        structuredContent={(
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {options.map((o) => (
              <button key={o} onClick={() => toggle(o)} style={{ padding: "6px 8px", borderRadius: 12, background: (s.failureModes?.includes(o))?"#9a0000":"rgba(255,255,255,0.03)", color: "#fff", border: "none" }}>{o}</button>
            ))}
          </div>
        )}
        textValue={s.text || ""}
        setTextValue={(v) => setSlideText(5, v)}
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

  function Slide7() {
    const s = responses.slide7 || {};
    const options = [
      "Go with your gut and adjust later","Research everything before moving","Ask people you trust","Look for the path with least risk","Push forward and figure it out as you go","Freeze and delay",
    ];

    return (
      <QuestionCard
        slideIndex={6}
        totalSlides={TOTAL}
        title={"How do you actually make decisions?"}
        subtitle={"This determines how Opus frames advice for you."}
        structuredContent={(
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {options.map((o) => (
                <button key={o} onClick={() => setStructured(6, "decisionStyle", o)} style={{ padding: "6px 8px", borderRadius: 12, background: (s.decisionStyle===o)?"#9a0000":"rgba(255,255,255,0.03)", color: "#fff", border: "none" }}>{o}</button>
              ))}
            </div>
            <div>
              <label style={{ color: "#A8A8A8" }}>How comfortable are you with risk?</label>
              <input type="range" min={1} max={10} value={s.riskTolerance || 5} onChange={(e) => setStructured(6, "riskTolerance", e.target.value)} style={{ width: "100%", marginTop: 8 }} />
              <div style={{ color: "#A8A8A8", marginTop: 6 }}>Risk: {s.riskTolerance || 5}</div>
            </div>
          </div>
        )}
        textValue={s.text || ""}
        setTextValue={(v) => setSlideText(6, v)}
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

  function Slide8() {
    const s = responses.slide8 || {};
    const peakOptions = ["Early morning (5–9am)","Morning (9am–12pm)","Afternoon (12–5pm)","Evening (5–9pm)","Night (9pm+)"];
    const energyOptions = ["Social media / phone","Other people's urgency","Lack of visible progress","Unclear next steps","Physical tiredness","Emotional stress","Perfectionism"];

    return (
      <QuestionCard
        slideIndex={7}
        totalSlides={TOTAL}
        title={"What does your day actually look like?"}
        subtitle={"Roadmaps built on fantasy hours fail. Be real."}
        structuredContent={(
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: "#A8A8A8" }}>How many hours per week could you commit?</label>
              <input type="range" min={1} max={40} value={s.weeklyHours || 5} onChange={(e) => setStructured(7, "weeklyHours", e.target.value)} style={{ width: "100%", marginTop: 8 }} />
              <div style={{ color: "#A8A8A8", marginTop: 6 }}>Weekly hours: {s.weeklyHours || 5}</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#A8A8A8" }}>When are you sharpest?</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                {peakOptions.map((p) => (
                  <button key={p} onClick={() => setStructured(7, "peakFocusTime", p)} style={{ padding: "6px 8px", borderRadius: 12, background: (s.peakFocusTime===p)?"#9a0000":"rgba(255,255,255,0.03)", color: "#fff", border: "none" }}>{p}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ color: "#A8A8A8" }}>What kills your momentum fastest?</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                {energyOptions.map((eOpt) => (
                  <button key={eOpt} onClick={() => {
                    const prev = s.energyDrains || [];
                    const exists = prev.includes(eOpt);
                    let next = exists ? prev.filter((p: string) => p!==eOpt) : [...prev, eOpt];
                    if (next.length>2) next = next.slice(0,2);
                    setStructured(7, "energyDrains", next);
                  }} style={{ padding: "6px 8px", borderRadius: 12, background: (s.energyDrains?.includes(eOpt))?"#9a0000":"rgba(255,255,255,0.03)", color: "#fff", border: "none" }}>{eOpt}</button>
                ))}
              </div>
            </div>
          </div>
        )}
        textValue={s.text || ""}
        setTextValue={(v) => setSlideText(7, v)}
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

  function Slide9() {
    const s = responses.slide9 || {};
    const blockers = [
      "Money — I don't have enough to invest","Network — I don't know the right people","Knowledge — I don't know what I don't know","Confidence — I doubt myself when it counts","Environmental — Family or circumstances don't support this"
    ];

    const toggle = (b: string) => {
      setResponses((r: any) => {
        const prev = r.slide9?.primaryBlockers ?? [];
        const exists = prev.includes(b);
        let next = exists ? prev.filter((p: string) => p!==b) : [...prev, b];
        if (next.length>3) next = next.slice(0,3);
        return { ...r, slide9: { ...(r.slide9||{}), primaryBlockers: next } };
      });
    };

    return (
      <QuestionCard
        slideIndex={8}
        totalSlides={TOTAL}
        title={"Let's name your blockers."}
        subtitle={"Opus will build around them, not pretend they don't exist."}
        structuredContent={(
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {blockers.map((b) => (
              <button key={b} onClick={() => toggle(b)} style={{ padding: "6px 8px", borderRadius: 12, background: (s.primaryBlockers?.includes(b))?"#9a0000":"rgba(255,255,255,0.03)", color: "#fff", border: "none" }}>{b}</button>
            ))}
          </div>
        )}
        textValue={s.text || ""}
        setTextValue={(v) => setSlideText(8, v)}
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

  function Slide10() {
    const s = responses.slide10 || {};
    const types = [
      "A founder who built something from nothing","A creator who built an audience","An operator who scaled something massive","A strategist who outthought everyone","A contrarian who broke the rules"
    ];

    return (
      <QuestionCard
        slideIndex={9}
        totalSlides={TOTAL}
        title={"Show us your operating model."}
        subtitle={"The people you admire reveal how you think about success."}
        structuredContent={(
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {types.map((t) => (
              <button key={t} onClick={() => setStructured(9, "admiredType", t)} style={{ padding: "6px 8px", borderRadius: 12, background: (s.admiredType===t)?"#9a0000":"rgba(255,255,255,0.03)", color: "#fff", border: "none" }}>{t}</button>
            ))}
          </div>
        )}
        textValue={s.text || ""}
        setTextValue={(v) => setSlideText(9, v)}
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

  function Slide11() {
    const s = responses.slide11 || {};
    const budgets = ["$0 — bootstrapping only","Under $20","$20–$100","$100–$500","$500+"];
    const team = ["Solo — completely alone","I have one person I can rely on","Small informal team (2–4 people)","Established team already"];
    const access = ["A mentor or advisor","A relevant network or community","Equipment or tools needed","An audience (even small)","Domain knowledge others don't have","None of the above"];

    return (
      <QuestionCard
        slideIndex={10}
        totalSlides={TOTAL}
        title={"Resources — real ones."}
        subtitle={"Opus builds what's possible with what you actually have."}
        structuredContent={(
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#A8A8A8", marginBottom: 6 }}>What can you realistically spend per month?</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {budgets.map((b) => (
                  <button key={b} onClick={() => setStructured(10, "monthlyBudget", b)} style={{ padding: "6px 8px", borderRadius: 12, background: (s.monthlyBudget===b)?"#9a0000":"rgba(255,255,255,0.03)", color: "#fff", border: "none" }}>{b}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#A8A8A8", marginBottom: 6 }}>Are you building alone or with people?</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {team.map((t) => (
                  <button key={t} onClick={() => setStructured(10, "teamStatus", t)} style={{ padding: "6px 8px", borderRadius: 12, background: (s.teamStatus===t)?"#9a0000":"rgba(255,255,255,0.03)", color: "#fff", border: "none" }}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ color: "#A8A8A8", marginBottom: 6 }}>What do you have access to? (select all that apply)</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {access.map((a) => (
                  <button key={a} onClick={() => {
                    const prev = s.accessList || [];
                    const exists = prev.includes(a);
                    const next = exists ? prev.filter((p: string) => p!==a) : [...prev, a];
                    setStructured(10, "accessList", next);
                  }} style={{ padding: "6px 8px", borderRadius: 12, background: (s.accessList?.includes(a))?"#9a0000":"rgba(255,255,255,0.03)", color: "#fff", border: "none" }}>{a}</button>
                ))}
              </div>
            </div>
          </div>
        )}
        textValue={s.text || ""}
        setTextValue={(v) => setSlideText(10, v)}
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

  function Slide12() {
    const s = responses.slide12 || {};
    const options = [
      "Consistent monthly income from something I built","A product or service people actually pay for","An audience that trusts what I say","A skill level that opens real doors","Financial independence"
    ];

    return (
      <QuestionCard
        slideIndex={11}
        totalSlides={TOTAL}
        title={"What does winning look like?"}
        subtitle={"This is the last one. Make it count."}
        structuredContent={(
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {options.map((o) => (
              <button key={o} onClick={() => setStructured(11, "successMetric", o)} style={{ padding: "6px 8px", borderRadius: 12, background: (s.successMetric===o)?"#9a0000":"rgba(255,255,255,0.03)", color: "#fff", border: "none" }}>{o}</button>
            ))}
          </div>
        )}
        textValue={s.text || ""}
        setTextValue={(v) => setSlideText(11, v)}
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

  // Render based on stage
  if (stage === 'processing') {
    return <ProcessingScreen />;
  }

  if (stage === 'reveal') {
  return (
    <ArchetypeReveal archetype={generatedArchetype ?? ''} />
  );
  }

  // stage === 'questions' — normal flow
  return (
    <>
      {error && (
        <div style={{
          position: 'fixed',
          top: 20,
          left: 20,
          right: 20,
          background: 'rgba(200, 50, 50, 0.9)',
          color: '#fff',
          padding: 16,
          borderRadius: 8,
          zIndex: 10000,
        }}>
          {error}
        </div>
      )}
      {renderCurrent()}
    </>
  );
}

function mapResponsesToAnswers(responses: any) {
  const r = responses;
  return {
    q1: `Age: ${r.slide1?.age || ""}. Region: ${r.slide1?.region || ""}. Currently: ${r.slide1?.text || ""}`,
    q2: `Goal type: ${r.slide2?.goalType || ""}. Timeline: ${r.slide2?.timeline || ""}. Detail: ${r.slide2?.text || ""}`,
    q3: `Motivation: ${r.slide3?.motivationTrigger || ""}. Urgency: ${r.slide3?.urgency || ""}/10. Detail: ${r.slide3?.text || ""}`,
    q4: `Skills: ${(r.slide4?.skills || []).map((s: any) => `${s.name} (${s.rating}/5)`).join(", ")}. Unique strength: ${r.slide4?.text || ""}`,
    q5: `Projects started: ${r.slide5?.projectCount || ""}. Furthest stage: ${r.slide5?.furthestStage || ""}. Detail: ${r.slide5?.text || ""}. Failure modes: ${(r.slide6?.failureModes || []).join(", ")}`,
    q6: `Decision style: ${r.slide7?.decisionStyle || ""}. Risk tolerance: ${r.slide7?.riskTolerance || ""}/10. Failure response: ${r.slide7?.text || ""}. Weekly hours: ${r.slide8?.weeklyHours || ""}. Peak focus time: ${r.slide8?.peakFocusTime || ""}. Energy drains: ${(r.slide8?.energyDrains || []).join(", ")}. Blockers: ${(r.slide9?.primaryBlockers || []).join(", ")}. Admired type: ${r.slide10?.admiredType || ""}. Budget: ${r.slide11?.monthlyBudget || ""}. Team status: ${r.slide11?.teamStatus || ""}. Access: ${(r.slide11?.accessList || []).join(", ")}. Success metric: ${r.slide12?.successMetric || ""}. Vision: ${r.slide12?.text || ""}`,
  };
}

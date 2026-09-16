"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight, Check, ChevronRight, CircleHelp, ExternalLink, FileText, Gauge,
  Layers3, Maximize2, MessageCircle, Pause, Play, RotateCcw, Send, ShieldCheck,
  Sparkles, Volume2, VolumeX, X,
} from "lucide-react";
import { GuideMode, Project, Viewport, projectById, projects, quickPrompts, tourSteps } from "@/lib/content";

type Message = { role: "guide" | "visitor"; text: string; projectId?: string; evidence?: string };

const viewportSizes: Record<Viewport, string> = { phone: "390 × 844", tablet: "768 × 1024", desktop: "1280 × 800" };
const SYMPLY_HOUSE_WEB_PREVIEW = "https://symply-house-web.pages.dev/?embed=portfolio-v1";

function makeGuideReply(question: string, project: Project, mode: GuideMode, tourStep: number) {
  const lower = question.toLowerCase();
  if (lower.includes("personally") || lower.includes("personally own") || lower.includes("сделал") || lower.includes("вклад")) {
    return `For ${project.name}, the public manifest is still awaiting owner verification, so I won’t invent a personal contribution. What I can show now is the reconstructed core flow and its explicit boundary. Once the source build and role are confirmed, this answer will be grounded in that reviewed case card.`;
  }
  if (lower.includes("hard") || lower.includes("сложн") || lower.includes("challenge")) {
    return `${project.challenge.title}. ${project.challenge.body} The important engineering decision here is to make the limitation visible instead of filling it with an impressive but unsupported story.`;
  }
  if (lower.includes("ai") || lower.includes("искусствен") || lower.includes("verify") || lower.includes("провер")) {
    return `AI is treated as an accelerator for drafts and alternatives, not as an authority. In this first slice, the human check is the approved manifest, a deterministic scenario and a resettable boundary. No speed metric or project claim is published without a source.`;
  }
  if (lower.includes("show") || lower.includes("open") || lower.includes("покаж") || lower.includes("демо")) {
    return `Opening ${project.name} in the demo player. It is a ${project.runtimeLabel.toLowerCase()} with synthetic data; the live original and native runtime are not claimed here.`;
  }
  if (mode === "tour") {
    return `${tourSteps[tourStep].detail} We’re currently looking at ${project.name}; you can try it, inspect the challenge, or interrupt the tour with a question.`;
  }
  return `I can help you inspect ${project.name}: try its seeded flow, open the challenge card, or ask about the boundary. I’ll keep this answer tied to approved materials and call out what is still pending.`;
}

function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "warning" }) {
  return <span className={`status-pill ${tone}`}><span className="status-dot" />{children}</span>;
}

function Avatar({ speaking, hidden, onToggleHidden }: { speaking: boolean; hidden: boolean; onToggleHidden: () => void }) {
  if (hidden) return <button className="avatar-hidden" onClick={onToggleHidden} aria-label="Show guide avatar"><Sparkles size={20} /><span>Show guide</span></button>;
  return (
    <div className={`avatar-shell ${speaking ? "is-speaking" : ""}`}>
      <button className="avatar-toggle" onClick={onToggleHidden} aria-label="Hide guide avatar"><X size={14} /></button>
      <img className="avatar-photo" src="/images/andrei-tekhtelev-avatar.png" alt="Andrei Tekhtelev" />
      <div className="avatar-caption"><span className="live-line" />{speaking ? "Speaking" : "Ready when you are"}</div>
    </div>
  );
}

function ConnectedHousePreview({ viewport }: { viewport: Viewport }) {
  const [loaded, setLoaded] = useState(false);
  const frameWidth = viewport === "phone" ? 390 : viewport === "tablet" ? 768 : undefined;
  return (
    <div className={`connected-preview connected-preview-${viewport}`}>
      <div className="connected-preview-bar">
        <span><span className={`connected-preview-dot ${loaded ? "ready" : ""}`} />Connected Expo Web build · read-only seed</span>
        <a href={SYMPLY_HOUSE_WEB_PREVIEW} target="_blank" rel="noreferrer">Open full preview <ExternalLink size={12} /></a>
      </div>
      {!loaded && <div className="connected-preview-loading">Loading the connected source build…</div>}
      <iframe className="connected-preview-frame" title="Symply House connected Web preview" src={SYMPLY_HOUSE_WEB_PREVIEW} loading="lazy" onLoad={() => setLoaded(true)} sandbox="allow-forms allow-modals allow-popups allow-same-origin allow-scripts" style={frameWidth ? { maxWidth: frameWidth } : undefined} />
    </div>
  );
}

function DemoCanvas({ project, viewport, completed, onComplete }: { project: Project; viewport: Viewport; completed: boolean; onComplete: () => void }) {
  if (project.id === "symply-house") return <ConnectedHousePreview viewport={viewport} />;
  const [selected, setSelected] = useState(0);
  const [saved, setSaved] = useState<string[]>([]);
  const [stage, setStage] = useState<"idle" | "active" | "done">(completed ? "done" : "idle");
  const items = useMemo(() => ["Context first", "Constraints visible", "Next action clear"], []);
  const start = () => setStage("active");
  const reset = () => { setSelected(0); setSaved([]); setStage("idle"); };
  useEffect(() => { setSelected(0); setSaved([]); setStage(completed ? "done" : "idle"); }, [project.id, viewport, completed]);
  return (
    <div className={`demo-frame viewport-${viewport}`} style={{ "--project-accent": project.color } as React.CSSProperties}>
      <div className="demo-topbar"><div className="demo-brand"><span className="demo-mark" />{project.name}<span className="demo-badge">DEMO</span></div><div className="demo-signal"><span /> local seed · no external calls</div></div>
      <div className="demo-content">
        <div className="demo-kicker">{project.discipline} <span>·</span> synthetic workspace</div>
        <h3>{project.scenario.title}</h3>
        <p>{project.scenario.description}</p>
        {stage === "idle" && <button className="demo-primary" onClick={start}><Play size={15} fill="currentColor" />{project.scenario.action}</button>}
        {stage === "active" && <div className="demo-interaction">
          <div className="demo-progress"><span style={{ width: `${((selected + 1) / items.length) * 100}%`, background: project.color }} /><small>step {selected + 1} of {items.length}</small></div>
          <div className="demo-card"><div className="card-index">0{selected + 1}</div><div><span className="card-label">CHECKPOINT</span><strong>{items[selected]}</strong><p>{selected === 0 ? "Start with the user’s intent before reaching for a feature." : selected === 1 ? "A useful boundary is part of the interface, not a footnote." : "A good demo ends with a decision you can inspect."}</p></div><Check className="card-check" size={18} /></div>
          <div className="demo-actions"><button className="demo-secondary" onClick={() => { setSaved([...saved, items[selected]]); if (selected === items.length - 1) { setStage("done"); onComplete(); } else setSelected(selected + 1); }}>{selected === items.length - 1 ? "Complete flow" : "Continue"}<ChevronRight size={15} /></button><span>{saved.length} saved</span></div>
        </div>}
        {stage === "done" && <div className="demo-done"><Check size={16} /> Scenario complete · resettable seed</div>}
      </div>
      <div className="demo-footer"><span>Reconstruction · Web preview</span><button onClick={reset}><RotateCcw size={13} /> Reset demo</button></div>
    </div>
  );
}

function GuidePanel({ project, mode, setMode, messages, onAsk, onSpeak, speaking, muted, setMuted, onStop, tourStep, onNextTour, avatarHidden, onToggleAvatar }: { project: Project; mode: GuideMode; setMode: (mode: GuideMode) => void; messages: Message[]; onAsk: (text: string) => void; onSpeak: () => void; speaking: boolean; muted: boolean; setMuted: (muted: boolean) => void; onStop: () => void; tourStep: number; onNextTour: () => void; avatarHidden: boolean; onToggleAvatar: () => void }) {
  const [input, setInput] = useState("");
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!input.trim()) return; onAsk(input.trim()); setInput(""); };
  return (
    <aside className="guide-panel">
      <div className="guide-heading"><div><div className="section-eyebrow"><span className="eyebrow-dot" />Personal guide</div><h2>Let’s make the<br /><em>work</em> legible.</h2></div><StatusPill tone="success">curated mode</StatusPill></div>
      <div className="guide-avatar-row"><Avatar speaking={speaking} hidden={avatarHidden} onToggleHidden={onToggleAvatar} /><div className="guide-bio"><span className="guide-name">Andrei’s AI guide</span><p>Grounded in approved materials. Ask about a decision, a constraint or what to try next.</p><div className="guide-controls"><button onClick={speaking ? onStop : onSpeak} aria-label={speaking ? "Stop speaking" : "Speak latest answer"}>{speaking ? <Pause size={14} /> : <Volume2 size={14} />}{speaking ? "Stop" : "Speak"}</button><button className={muted ? "muted" : ""} onClick={() => setMuted(!muted)} aria-label={muted ? "Turn speech on" : "Mute speech"}>{muted ? <VolumeX size={14} /> : <Volume2 size={14} />}{muted ? "Muted" : "Sound on"}</button></div></div></div>
      <div className="guide-modes" role="tablist" aria-label="Guide mode"><button className={mode === "explore" ? "active" : ""} onClick={() => setMode("explore")} role="tab">Explore</button><button className={mode === "tour" ? "active" : ""} onClick={() => setMode("tour")} role="tab">Tour</button><button className={mode === "interview" ? "active" : ""} onClick={() => setMode("interview")} role="tab">Interview</button></div>
      <div className="guide-thread" aria-live="polite">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`message ${message.role}`}><div className="message-marker">{message.role === "guide" ? <Sparkles size={12} /> : "A"}</div><div><p>{message.text}</p>{message.evidence && <button className="message-link"><FileText size={13} />{message.evidence}<ArrowUpRight size={12} /></button>}</div></div>)}{mode === "tour" && <div className="tour-next"><div className="tour-count">0{tourStep + 1} / 03</div><div><strong>{tourSteps[tourStep].title}</strong><p>{tourSteps[tourStep].detail}</p></div><button onClick={onNextTour} aria-label="Next tour step"><ChevronRight size={17} /></button></div>}</div>
      <div className="quick-prompts">{quickPrompts.slice(0, 3).map(prompt => <button key={prompt} onClick={() => onAsk(prompt)}>{prompt}<ChevronRight size={13} /></button>)}</div>
      <form className="chat-form" onSubmit={submit}><input value={input} onChange={event => setInput(event.target.value)} placeholder="Ask a technical question…" aria-label="Ask a technical question" /><button type="submit" aria-label="Send question"><Send size={16} /></button></form>
      <div className="guide-disclaimer"><ShieldCheck size={13} /> AI guide · approved materials only <span>·</span> voice is device-generated</div>
    </aside>
  );
}

function ProjectRail({ activeId, onSelect }: { activeId: string; onSelect: (id: string) => void }) {
  return <nav className="project-rail" aria-label="Projects">{projects.map(project => <button key={project.id} className={activeId === project.id ? "active" : ""} onClick={() => onSelect(project.id)}><span className="rail-number">{project.number}</span><span className="rail-name">{project.name}</span><span className="rail-arrow"><ChevronRight size={14} /></span></button>)}</nav>;
}

export default function Home() {
  const [activeId, setActiveId] = useState("symply-house");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [mode, setMode] = useState<GuideMode>("explore");
  const [tourStep, setTourStep] = useState(0);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [avatarHidden, setAvatarHidden] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: "guide", text: "Welcome. Pick a project to explore, or ask me to walk you through a technical decision. I’ll be clear about what is verified and what is still pending." }]);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const project = projectById(activeId);

  useEffect(() => { if (typeof document === "undefined") return; const stop = () => { window.speechSynthesis?.cancel(); setSpeaking(false); }; document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); }); return () => stop(); }, []);
  const speak = () => { if (muted || typeof window === "undefined" || !("speechSynthesis" in window)) return; window.speechSynthesis.cancel(); const latest = [...messages].reverse().find(m => m.role === "guide"); if (!latest) return; const utterance = new SpeechSynthesisUtterance(latest.text); utterance.lang = "en-CA"; utterance.onstart = () => setSpeaking(true); utterance.onend = () => setSpeaking(false); utterance.onerror = () => setSpeaking(false); speechRef.current = utterance; window.speechSynthesis.speak(utterance); };
  const stopSpeaking = () => { if (typeof window !== "undefined") window.speechSynthesis?.cancel(); speechRef.current = null; setSpeaking(false); };
  const ask = (text: string) => { stopSpeaking(); setMessages(current => [...current, { role: "visitor", text }, { role: "guide", text: makeGuideReply(text, project, mode, tourStep), projectId: project.id }]); };
  const selectProject = (id: string) => { stopSpeaking(); setActiveId(id); setMessages(current => [...current, { role: "guide", text: `Now looking at ${projectById(id).name}. Try the seeded flow, or ask me about its boundary and what still needs verification.`, projectId: id }]); };
  const nextTour = () => { setMode("tour"); setTourStep(step => Math.min(step + 1, tourSteps.length - 1)); };
  return (
    <main className="site-shell">
      <header className="site-header"><a className="wordmark" href="#top" aria-label="Andrei Tekhtelev home"><span className="wordmark-mark">AT</span><span>ANDREI<br /><b>TEKHTELEV</b></span></a><div className="header-center"><span className="header-status"><span className="status-dot" />Interactive portfolio <span>·</span> v0.1</span></div><div className="header-actions"><a href="#architecture">Architecture</a><button className="header-contact" onClick={() => ask("How can I contact you?")}>Get in touch <ArrowUpRight size={15} /></button></div></header>
      <div className="intro" id="top"><div><p className="display-kicker">FULL-STACK ENGINEER <span>×</span> AI PRACTITIONER</p><h1>Work that holds<br /><em>up to questions.</em></h1></div><div className="intro-note"><p>This is not a gallery of screenshots. It’s a place to try the work, inspect the trade-offs and ask why.</p><a href="#workspace">Start exploring <ChevronRight size={15} /></a></div></div>
      <div className="workspace" id="workspace"><section className="workbench"><div className="workbench-head"><div><div className="section-eyebrow"><Layers3 size={14} /> Project workspace</div><h2>{project.name}<span>/ {project.discipline}</span></h2></div><div className="workspace-actions"><StatusPill tone={project.status === "verified build" || project.status === "pilot" ? "success" : "warning"}>{project.status}</StatusPill>{project.sourceRepository ? <a className="icon-btn" href={project.sourceRepository} target="_blank" rel="noreferrer" aria-label="Open source repository"><ExternalLink size={15} /></a> : <button className="icon-btn" aria-label="Open project separately"><Maximize2 size={15} /></button>}</div></div><div className="runtime-note"><Gauge size={14} /><span><b>{project.runtimeLabel}</b> · source platforms: {project.originalPlatforms.join(" · ")}</span><button title="Why this label?" aria-label="Why this label?"><CircleHelp size={14} /></button></div><div className="viewport-switcher"><span>Web preview size</span>{(["phone", "tablet", "desktop"] as Viewport[]).map(size => <button key={size} className={viewport === size ? "active" : ""} onClick={() => setViewport(size)}><span className={`viewport-icon ${size}`} />{size}<small>{viewportSizes[size]}</small></button>)}</div><DemoCanvas project={project} viewport={viewport} completed={!!completed[project.id]} onComplete={() => setCompleted(current => ({ ...current, [project.id]: true }))}/><div className="workbench-foot"><span><span className="keyboard-key">⌘</span> Click a project to switch</span><span className="workspace-note">{project.id === "symply-house" ? "Connected source build · local read-only data · no production effects" : "Only the active demo loads · synthetic data · no production effects"}</span></div></section><GuidePanel project={project} mode={mode} setMode={setMode} messages={messages} onAsk={ask} onSpeak={speak} speaking={speaking} muted={muted} setMuted={setMuted} onStop={stopSpeaking} tourStep={tourStep} onNextTour={nextTour} avatarHidden={avatarHidden} onToggleAvatar={() => setAvatarHidden(hidden => !hidden)}/></div>
      <ProjectRail activeId={activeId} onSelect={selectProject}/>
      <section className="architecture-section" id="architecture"><div className="architecture-heading"><div><div className="section-eyebrow"><Sparkles size={14} /> Agentic architecture</div><h2>Capability with<br /><em>guardrails.</em></h2></div><p>AI accelerates the conversation; contracts, evidence and human review decide what the system is allowed to say or do. The point is not a prompt. It is a measurable engineering system.</p></div><div className="architecture-flow"><div className="architecture-step"><span>01</span><strong>Ground</strong><p>Resolve the question against the approved corpus and current project context.</p><code>sourceIds[]</code></div><div className="architecture-connector">→</div><div className="architecture-step"><span>02</span><strong>Decide</strong><p>Return one bounded answer and, only when valid, one typed action.</p><code>GuideAction</code></div><div className="architecture-connector">→</div><div className="architecture-step"><span>03</span><strong>Act</strong><p>Let the UI confirm the project, viewport or evidence state before reporting success.</p><code>requestId + ack</code></div><div className="architecture-connector">→</div><div className="architecture-step"><span>04</span><strong>Evaluate</strong><p>Run deterministic fixtures for facts, injection resistance, fallback and follow-ups.</p><code>offline evals</code></div></div><div className="architecture-foot"><span><Check size={14}/> Model replaceable</span><span><Check size={14}/> Demos remain usable without AI</span><span><Check size={14}/> Domain review owns quality</span><a href="https://github.com/Androkzn/interactive-portfolio-ai-guide/tree/main/skills" target="_blank" rel="noreferrer">Read the skills <ExternalLink size={13}/></a></div></section>
      <section className="case-study" id="about"><div className="case-intro"><div className="section-eyebrow">How to read this portfolio</div><h2>Every claim should<br /><em>earn trust.</em></h2><p>The first build makes the architecture visible: the demos are separate from the guide, the guide is grounded in reviewed content, and uncertainty is shown in the interface.</p></div><div className="case-grid"><div className="case-card"><span className="case-index">01</span><ShieldCheck size={21}/><h3>Truth over polish</h3><p>Candidate projects stay marked as pending until ownership, source builds and permitted evidence are verified.</p></div><div className="case-card"><span className="case-index">02</span><MessageCircle size={21}/><h3>Questions become navigation</h3><p>A guide turn can point to a project, scenario or evidence card without taking control away from the visitor.</p></div><div className="case-card"><span className="case-index">03</span><RotateCcw size={21}/><h3>Safe by default</h3><p>Every demo is seeded, local and resettable. No payments, patient records, contacts or production writes.</p></div></div></section>
      <footer className="site-footer"><span>© 2026 Andrei Tekhtelev</span><span>Built as an experiment in making engineering legible.</span><a href="#top">Back to top <ArrowUpRight size={13}/></a></footer>
    </main>
  );
}

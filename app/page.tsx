"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Bot, ChevronRight, Code2, ExternalLink, Layers3, MessageCircle, Monitor, Moon, Pause, Play, RotateCcw, Send, ShieldCheck, Smartphone, Sparkles, Sun, Tablet, Volume2 } from "lucide-react";
import { DevicePreview, GuideMode, Project, projectById, projects, quickPrompts, tourSteps } from "@/lib/content";
import { acceptsPreviewMessage, deviceWidths } from "@/lib/preview";

type Message = { id: number; role: "guide" | "visitor"; text: string; animate?: boolean };
type Theme = "light" | "dark";
const contactUrl = "https://www.linkedin.com/in/andreitekhtelev/";
const devices: DevicePreview[] = ["iphone", "ipad", "android", "desktop"];
const deviceNames = { iphone: "iPhone", ipad: "iPad", android: "Android", desktop: "Desktop" };
const deviceFrameAssets: Partial<Record<DevicePreview, { src: string; model: string }>> = {
  iphone: { src: "/images/device-frames/iphone-16-pro-black-titanium.png", model: "iPhone 16 Pro" },
  ipad: { src: "/images/device-frames/ipad-pro-11-space-gray.png", model: "iPad Pro 11-inch" },
  android: { src: "/images/device-frames/pixel-7-pro-obsidian.png", model: "Google Pixel 7 Pro" },
};
const preferredMaleVoiceNames = [
  "microsoft ryan online (natural)",
  "microsoft liam online (natural)",
  "microsoft guy online (natural)",
  "microsoft andrew online (natural)",
  "microsoft brian online (natural)",
  "google uk english male",
  "google us english",
  "alex",
  "daniel",
  "fred",
  "tom",
  "microsoft david",
  "microsoft mark",
  "arthur",
  "oliver",
  "james",
  "thomas",
  "eddy",
];
const maleVoiceHints = ["alex", "daniel", "fred", "tom", "david", "mark", "guy", "ryan", "liam", "brian", "andrew", "arthur", "oliver", "james", "thomas", "eddy", "male", "man"];
const femaleVoiceHints = ["samantha", "karen", "victoria", "susan", "hazel", "moira", "fiona", "zira", "aria", "jenny", "sara", "ava", "salli", "joanna", "ivy", "kimberly", "kendra", "nicole", "tessa", "allison", "emily", "libby", "serena", "kate", "catherine", "amelie", "marie", "monica", "paulina", "luciana", "helena", "anna", "emma", "olivia", "sophie", "yuna"];

function selectBestMaleVoice(voices: SpeechSynthesisVoice[]) {
  const isEnglish = (voice: SpeechSynthesisVoice) => voice.lang.toLowerCase().startsWith("en");
  const isFemale = (voice: SpeechSynthesisVoice) => {
    const name = `${voice.name} ${voice.voiceURI}`.toLowerCase();
    return femaleVoiceHints.some(hint => name.includes(hint));
  };
  const isLikelyMale = (voice: SpeechSynthesisVoice) => {
    const name = `${voice.name} ${voice.voiceURI}`.toLowerCase();
    return preferredMaleVoiceNames.some(preferred => name.includes(preferred)) || maleVoiceHints.some(hint => name.includes(hint));
  };
  const candidates = voices.filter(voice => !isFemale(voice) && isLikelyMale(voice) && isEnglish(voice));
  const fallbackCandidates = voices.filter(voice => !isFemale(voice) && isEnglish(voice));
  const pool = candidates.length > 0 ? candidates : fallbackCandidates.length > 0 ? fallbackCandidates : voices;
  if (pool.length === 0) return undefined;
  return [...pool].sort((left, right) => {
    const score = (voice: SpeechSynthesisVoice) => {
      const name = `${voice.name} ${voice.voiceURI}`.toLowerCase();
      const preference = preferredMaleVoiceNames.findIndex(preferred => name.includes(preferred));
      const language = voice.lang.toLowerCase();
      return (preference >= 0 ? 1000 - preference * 25 : 0)
        + (name.includes("natural") || name.includes("neural") ? 220 : 0)
        + (name.includes("enhanced") || name.includes("premium") ? 180 : 0)
        + (voice.localService ? 0 : 80)
        + (language === "en-ca" ? 60 : language === "en-us" ? 50 : language === "en-gb" ? 40 : 20);
    };
    return score(right) - score(left);
  })[0];
}

const projectLogoSources: Record<Project["id"], string> = {
  "symply-house": "/images/apps/symply-house.png",
  "hoc-v2": "/images/apps/house-of-commons.png",
  "symply-budget": "/images/apps/symply-budget.png",
};

function ProjectLogo({ id }: { id: Project["id"] }) {
  return <img className={`project-logo project-logo-${id}`} src={projectLogoSources[id]} alt="" aria-hidden="true" />;
}

function PreviewDeviceIcon({ device }: { device: DevicePreview }) {
  const icon = device === "iphone" ? <Smartphone size={18} />
    : device === "ipad" ? <Tablet size={18} />
      : device === "android" ? <Bot size={18} />
        : <Monitor size={18} />;
  return <span className="preview-device-icon" aria-hidden="true">{icon}</span>;
}

function makeGuideReply(question: string, project: Project, mode: GuideMode, tourStep: number) {
  const lower = question.toLowerCase();
  if (lower.includes("personally") || lower.includes("own") || lower.includes("вклад")) {
    return `**What I can substantiate**\n\nThe public manifest for ${project.name} does not yet specify personal contribution. I won’t invent one.\n\n- Explore the deployed Web application.\n- Inspect the linked source repository.\n- Treat ownership and impact claims as pending evidence.`;
  }
  if (lower.includes("hard") || lower.includes("challenge") || lower.includes("сложн")) {
    return `**${project.challenge.title}**\n\n${project.challenge.body}\n\nThis is the documented boundary—not a claim about an unverified outcome.`;
  }
  if (lower.includes("ai") || lower.includes("verify") || lower.includes("провер")) {
    return "**AI assists; evidence decides.**\n\n- Prepared answers stay within the approved project material.\n- The apps run independently of this guide.\n- Unsupported contribution or impact claims stay unpublished.\n\nThis panel uses curated responses, not a live model. Explore the architecture below for the intended contract.";
  }
  if (lower.includes("show") || lower.includes("flow") || lower.includes("покаж")) {
    return project.id === "hoc-v2"
      ? "**Try the public civic flow**\n\n- Browse parliamentary information in the live app.\n- Open a representative or activity to inspect its details.\n- Use the original sources to verify what you read.\n\nPublic browsing does not require an account."
      : `**Try ${project.name}**\n\n- Sign in using your existing product account.\n- Explore the live product with your own data.\n- Open the app in a separate tab if your browser restricts embedded sign-in.\n\nThis is a real app: account actions affect your account. No shared credentials or simulated balance are injected.`;
  }
  if (mode === "tour") return `**${tourSteps[tourStep].title}**\n\n${tourSteps[tourStep].detail}`;
  return `**Explore ${project.name}**\n\nI have prepared answers about the source boundary, documented challenge and core flow. Choose a question below or inspect the source. For a deeper conversation, get in touch with Andrei.\n\nI don’t have a verified answer to every free-form question.`;
}

function FormattedText({ text }: { text: string }) {
  return <>{text.split("\n\n").map((block, i) => {
    if (block.startsWith("- ")) return <ul key={i}>{block.split("\n").map((line, j) => <li key={j}>{line.replace(/^- /, "")}</li>)}</ul>;
    if (block.startsWith("**") && block.endsWith("**")) return <p key={i}><strong>{block.slice(2, -2)}</strong></p>;
    return <p key={i}>{block}</p>;
  })}</>;
}

function GuideReply({ message }: { message: Message }) {
  const [visible, setVisible] = useState(message.animate ? 0 : message.text.length);
  useEffect(() => {
    if (!message.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(message.text.length);
      return;
    }
    const increment = Math.max(4, Math.ceil(message.text.length / 45));
    const timer = window.setInterval(() => setVisible(value => {
      if (value + increment >= message.text.length) window.clearInterval(timer);
      return Math.min(value + increment, message.text.length);
    }), 24);
    return () => window.clearInterval(timer);
  }, [message]);
  const done = visible >= message.text.length;
  return <div className="reply-body">
    <div aria-hidden={!done}><FormattedText text={message.text.slice(0, visible)} /></div>
    {!done && <span className="typing-indicator" role="status" aria-label="Revealing prepared answer"><i /><i /><i /></span>}
    <span className="sr-only" role="status">{done && message.animate ? message.text.replaceAll("**", "") : ""}</span>
  </div>;
}

function Avatar({ active }: { active: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (active) {
      element.currentTime = 0;
      void element.play().catch(() => undefined);
    } else {
      element.pause();
      element.currentTime = 0;
    }
    return () => element.pause();
  }, [active]);
  return <div className={`avatar-shell ${active ? "is-playing" : ""}`}>
    <img className="avatar-photo" src="/images/andrei-tekhtelev-avatar.png" alt="Portrait of Andrei Tekhtelev" />
    <video className="avatar-video" ref={video} muted loop playsInline preload="auto" poster="/images/andrei-tekhtelev-avatar.png" aria-hidden="true">
      <source src="/video/andrei-talking-lips-web.webm?v=talking-video-1" type="video/webm" />
      <source src="/video/andrei-talking-lips-web-60fps.mp4?v=talking-video-1" type="video/mp4" />
    </video>
  </div>;
}

function ConnectedSourcePreview({ project, device }: { project: Project; device: DevicePreview }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [theme, setTheme] = useState<Theme>("light");
  const [appliedTheme, setAppliedTheme] = useState<Theme | null>(null);
  const [themeReady, setThemeReady] = useState(false);
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const url = project.webPreviewUrl;
  useEffect(() => {
    if (!url) return;
    const origin = new URL(url).origin;
    let retries = 0;
    const requestTheme = () => frame.current?.contentWindow?.postMessage({ type: "portfolio:theme", theme: themeRef.current }, origin);
    const handshake = window.setInterval(() => {
      requestTheme();
      if (++retries >= 45) window.clearInterval(handshake);
    }, 1000);
    const receive = (event: MessageEvent) => {
      if (!acceptsPreviewMessage(event, frame.current?.contentWindow, origin)) return;
      if (event.data.type === "portfolio:theme-ready") {
        setThemeReady(true);
        setLoaded(true); setSlow(false);
        frame.current?.contentWindow?.postMessage({ type: "portfolio:theme", theme: themeRef.current }, origin);
      }
      if (event.data.type === "portfolio:theme-applied" && (event.data.theme === "light" || event.data.theme === "dark")) {
        setThemeReady(true);
        setAppliedTheme(event.data.theme);
        setLoaded(true); setSlow(false);
        window.clearInterval(handshake);
      }
    };
    window.addEventListener("message", receive);
    requestTheme();
    return () => { window.removeEventListener("message", receive); window.clearInterval(handshake); };
  }, [url, attempt]);
  useEffect(() => {
    setLoaded(false); setSlow(false); setThemeReady(false); setAppliedTheme(null);
    const timer = window.setTimeout(() => setSlow(true), 18000);
    return () => window.clearTimeout(timer);
  }, [url, attempt]);
  const changeTheme = (next: Theme) => {
    setTheme(next);
    if (url) frame.current?.contentWindow?.postMessage({ type: "portfolio:theme", theme: next }, new URL(url).origin);
  };
  if (!url) return <p>Live preview unavailable.</p>;
  const liveFrame = <iframe ref={frame} key={`${project.id}-${attempt}`} title={`${project.name} live Web app`} src={url} onLoad={() => {
    setLoaded(true); setSlow(false);
    frame.current?.contentWindow?.postMessage({ type: "portfolio:theme", theme: themeRef.current }, new URL(url).origin);
  }} onError={() => { setLoaded(false); setSlow(true); }} className="connected-preview-frame" loading="eager" referrerPolicy="no-referrer"
    sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-same-origin allow-scripts" />;
  const frameAsset = deviceFrameAssets[device];
  return <div className="connected-preview">
    <div className="connected-preview-bar">
      <span><i className={loaded ? "status-dot ready" : "status-dot"} />{loaded ? "Live app loaded" : "Loading live app"}</span>
      <a href={url} target="_blank" rel="noreferrer">Open live app <ExternalLink size={13} /></a>
    </div>
    <div className="device-stage">
      {!loaded && <div className="load-notice" role="status">{slow ? "Taking longer than expected. Try reloading or open the app in a new tab." : "Opening the real application…"}</div>}
      <div className="app-theme-controls" role="group" aria-label="Live app appearance">
        <span>App theme</span>
        <button disabled={!themeReady} aria-pressed={appliedTheme === "light"} onClick={() => changeTheme("light")}><Sun size={13} />Light</button>
        <button disabled={!themeReady} aria-pressed={appliedTheme === "dark"} onClick={() => changeTheme("dark")}><Moon size={13} />Dark</button>
      </div>
      <div className={`device-shell device-shell-${device}`} style={{ width: deviceWidths[device] }}>
        {device === "desktop" ? <div className="device-screen">
          <div className="device-chrome device-chrome-desktop"><span className="device-window-dots" aria-hidden="true"><i /><i /><i /></span><span className="device-desktop-title">{project.name}</span><span className="device-desktop-menu" aria-hidden="true">•••</span></div>
          {liveFrame}
        </div> : <>
          <div className="device-live-screen">{liveFrame}</div>
          <img className="device-frame-art" src={frameAsset?.src} alt="" aria-hidden="true" draggable="false" />
          <span className="sr-only">Previewed in a {frameAsset?.model} frame.</span>
        </>}
      </div>
    </div>
    <div className="preview-footer"><span>{project.id === "hoc-v2" ? "Public data · explore without an account" : "Real account · real data · sign-in required"}</span><button onClick={() => setAttempt(value => value + 1)}><RotateCcw size={13} />Reload app</button></div>
  </div>;
}

function GuidePanel({ project, onCoreFlow }: { project: Project; onCoreFlow: () => void }) {
  const [mode, setMode] = useState<GuideMode>("explore");
  const [tourStep, setTourStep] = useState(0);
  const [input, setInput] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [messages, setMessages] = useState<Message[]>([{ id: 0, role: "guide", text: "**The work, explained.**\n\nTry a real app on the left. Then ask about the decisions behind it. I’ll separate documented facts from what still needs evidence." }]);
  const nextId = useRef(1);
  const thread = useRef<HTMLDivElement>(null);
  const speech = useRef<SpeechSynthesisUtterance | null>(null);
  const stop = () => {
    window.speechSynthesis?.cancel();
    speech.current = null;
    setSpeaking(false);
  };
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const refreshVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
      setVoiceAvailable(true);
    };
    refreshVoices();
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    const hidden = () => { if (document.hidden) { window.speechSynthesis?.cancel(); setSpeaking(false); } };
    document.addEventListener("visibilitychange", hidden);
    return () => { window.speechSynthesis.removeEventListener("voiceschanged", refreshVoices); document.removeEventListener("visibilitychange", hidden); window.speechSynthesis.cancel(); speech.current = null; };
  }, []);
  useEffect(() => {
    const element = thread.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
    let follow = true;
    const onScroll = () => { follow = element.scrollHeight - element.scrollTop - element.clientHeight < 80; };
    const observer = new ResizeObserver(() => { if (follow) element.scrollTop = element.scrollHeight; });
    if (element.lastElementChild) observer.observe(element.lastElementChild);
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => { observer.disconnect(); element.removeEventListener("scroll", onScroll); };
  }, [messages, mode]);
  const ask = (text: string) => {
    stop();
    if (text === quickPrompts[3]) onCoreFlow();
    const visitorId = nextId.current++;
    const replyId = nextId.current++;
    setMessages(current => [...current.slice(-6), { id: visitorId, role: "visitor", text }, { id: replyId, role: "guide", text: makeGuideReply(text, project, mode, tourStep), animate: true }]);
  };
  const speak = () => {
    if (speaking) { stop(); return; }
    const latest = [...messages].reverse().find(message => message.role === "guide");
    if (!latest || !voiceAvailable) return;
    const utterance = new SpeechSynthesisUtterance(latest.text.replaceAll("**", "").replaceAll("\n- ", ". "));
    const voice = selectBestMaleVoice(voices.length > 0 ? voices : window.speechSynthesis.getVoices());
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = "en-CA";
    }
    utterance.rate = 0.98;
    const finish = () => {
      // SpeechSynthesis can dispatch a late event for an utterance that was
      // cancelled just before a new one started. Only the active utterance
      // is allowed to stop the synchronized video.
      if (speech.current !== utterance) return;
      speech.current = null;
      setSpeaking(false);
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    speech.current = utterance;
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };
  const prompts = [<Code2 key="code" size={15} />, <Layers3 key="layers" size={15} />, <ShieldCheck key="shield" size={15} />, <Play key="play" size={15} />];
  return <aside className="guide-panel" id="guide" aria-label="Andrei’s project guide">
    <h2>Good work invites<br /><em>better questions.</em></h2>
    <div className="guide-avatar-row"><Avatar active={speaking} /><div className="guide-bio"><strong>Meet Andrei’s guide.</strong><p>Product decisions, technical boundaries and what to try next.</p><button className="voice-button" disabled={!voiceAvailable} onClick={speak} aria-pressed={speaking}>{speaking ? <Pause size={14} /> : <Volume2 size={14} />}{speaking ? "Stop reading" : "Read answer aloud"}</button><small>Male voice · best quality available on this device</small></div></div>
    <div className="guide-context"><span className="status-dot ready" />Exploring <strong>{project.name}</strong></div>
    <div className="guide-modes" role="group" aria-label="Guide mode">{(["explore", "tour", "interview"] as GuideMode[]).map(value => <button key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>{value}</button>)}</div>
    {mode === "interview" && <p className="mode-hint">Start with ownership, constraints or verification. Claims stay tied to reviewed material.</p>}
    {mode === "tour" && <div className="tour-card"><span className="section-eyebrow">Stop {tourStep + 1} / {tourSteps.length}</span><strong>{tourSteps[tourStep].title}</strong><p>{tourSteps[tourStep].detail}</p><button onClick={() => setTourStep(value => (value + 1) % tourSteps.length)}>{tourStep === tourSteps.length - 1 ? "Restart tour" : "Next stop"}<ArrowRight size={14} /></button></div>}
    <div ref={thread} className="guide-thread" tabIndex={0} aria-label="Guide conversation">{messages.map(message => <div key={message.id} className={`message ${message.role}`}><span className="message-marker">{message.role === "guide" ? <Sparkles size={13} /> : <MessageCircle size={13} />}</span><div>{message.role === "guide" ? <GuideReply message={message} /> : <p>{message.text}</p>}</div></div>)}</div>
    <div className="quick-prompts"><span className="section-eyebrow">Take a closer look</span>{quickPrompts.map((prompt, index) => <button key={prompt} onClick={() => ask(prompt)}>{prompts[index]}<span>{prompt}</span><ChevronRight size={14} /></button>)}</div>
    <form className="chat-form" onSubmit={event => { event.preventDefault(); if (input.trim()) { ask(input.trim()); setInput(""); } }}><input value={input} maxLength={500} onChange={event => setInput(event.target.value)} placeholder="Ask about this project…" aria-label="Ask about this project" /><button disabled={!input.trim()} type="submit" aria-label="Send question"><Send size={16} /></button></form>
    <div className="guide-disclaimer"><ShieldCheck size={15} /><span>Prepared answers · approved sources · no invented claims</span></div>
  </aside>;
}

const steps = [
  { name: "Ground", code: "sourceIds[]", body: "Find approved evidence for the question and the selected project.", input: "A question + the current project", output: "Relevant source IDs, or an explicit evidence gap" },
  { name: "Decide", code: "GuideAction", body: "Bound the answer. Propose a typed action only when the contract allows it.", input: "Evidence and permitted actions", output: "A supported answer + an optional validated action" },
  { name: "Act", code: "requestId + ack", body: "Wait for the interface to confirm a state change before claiming success.", input: "A validated action with a request ID", output: "An acknowledgement from the UI—not an assumption" },
  { name: "Evaluate", code: "offline evals", body: "Check facts, fallback behaviour and resistance to unsupported instructions.", input: "Repeatable fixtures and expected boundaries", output: "Pass/fail evidence for the contract" },
];
function Architecture() {
  const [selected, setSelected] = useState(0);
  return <section className="architecture-section" id="architecture">
    <div className="architecture-heading"><div><div className="section-eyebrow"><ShieldCheck size={15} />Agentic architecture</div><h2>Capability.<br /><em>With boundaries.</em></h2></div><div><p>A useful AI system needs more than a prompt. Follow the contract from a question to a verified outcome.</p><span className="architecture-label">Interactive design walkthrough · not a live execution trace</span></div></div>
    <div className="architecture-flow">{steps.map((step, index) => <button key={step.name} className={`architecture-step ${selected === index ? "selected" : ""}`} aria-pressed={selected === index} aria-controls="architecture-detail" onClick={() => setSelected(index)}><span className="step-top"><span>0{index + 1}</span><ArrowRight size={18} /></span><strong>{step.name}</strong><p>{step.body}</p><code>{step.code}</code></button>)}</div>
    <div className="architecture-detail" id="architecture-detail" data-step={selected} aria-live="polite" aria-atomic="true">
      <span className="detail-caret" aria-hidden="true" />
      <div key={selected} className="architecture-detail-content">
        <div><span className="section-eyebrow">Selected step / 0{selected + 1}</span><strong>{steps[selected].name}</strong></div>
        <div><span>INPUT</span><p>{steps[selected].input}</p></div>
        <ArrowRight size={20} aria-hidden="true" />
        <div><span>OUTPUT</span><p>{steps[selected].output}</p></div>
      </div>
    </div>
    <div className="architecture-foot"><span><ShieldCheck size={15} />Evidence before claims</span><span><Layers3 size={15} />Apps independent of the guide</span><a href="https://github.com/Androkzn/interactive-portfolio-ai-guide/tree/main/skills" target="_blank" rel="noreferrer">Inspect the contracts <ArrowUpRight size={15} /></a></div>
  </section>;
}

export default function Home() {
  const [activeId, setActiveId] = useState("hoc-v2");
  const [device, setDevice] = useState<DevicePreview>("iphone");
  const [progress, setProgress] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const project = projectById(activeId);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? window.scrollY / max : 0);
        setShowContact(window.scrollY > window.innerHeight * 1.2);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);
  const explore = (id = activeId) => { setActiveId(id); document.getElementById("workspace")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); };
  return <main className="site-shell" id="top">
    <a className="skip-link" href="#workspace">Skip to the live projects</a>
    <div className="reading-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
    <header className="site-header"><a className="wordmark" href="#top"><img className="wordmark-photo" src="/images/andrei-tekhtelev-avatar.png" alt="Andrei Tekhtelev" /><span>ANDREI<br /><b>TEKHTELEV</b></span></a><span className="header-role">FULL-STACK ENGINEER <b>×</b> AI PRACTITIONER</span><nav className="header-actions"><a href="#architecture">The thinking</a><a className="contact-link" href={contactUrl} target="_blank" rel="noreferrer" aria-label="Contact Andrei on LinkedIn" title="Contact Andrei on LinkedIn"><ArrowUpRight size={22} /></a></nav></header>
    <section className="intro" aria-labelledby="hero-title"><div className="intro-main"><h1 id="hero-title">Work that holds<br /><em>up to <a className="question-link" href="#guide">questions<span className="hero-tooltip">Ask about ownership, trade-offs or verification <ArrowUpRight size={14} /></span></a>.</em></h1><p className="hero-description">I build tools for everyday decisions—from managing a home and a budget to understanding Parliament.</p><a className="explore-link" href="#workspace">Try the work <ArrowDown size={17} /></a></div><div className="hero-stats"><span className="section-eyebrow">A few ways in</span><button onClick={() => explore("hoc-v2")}><span className="stat-symbol" aria-hidden="true"><Smartphone size={26} /></span><span><strong>Live applications</strong><small>3 real products. Yours to explore.</small></span><ArrowUpRight size={18} /></button><button onClick={() => { setDevice("ipad"); explore(); }}><span className="stat-symbol" aria-hidden="true"><Code2 size={26} /></span><span><strong>Source platforms</strong><small>iPhone · iPad · Android · Web</small></span><ArrowUpRight size={18} /></button><a href="#architecture"><span className="stat-symbol"><ShieldCheck size={26} /></span><span><strong>AI with guardrails</strong><small>Inspect the engineering decisions.</small></span><ArrowUpRight size={18} /></a><p>Web previews below. Device frames resize the Web app; they are not native emulators.</p></div></section>
    <section className="workspace-section" id="workspace" aria-labelledby="lab-heading"><div className="workspace-section-heading"><div><div className="section-eyebrow"><Layers3 size={14} />Hands-on, not a slideshow</div><h2 id="lab-heading">Pick a product. <em>Make it yours.</em></h2></div></div>
      <nav className="project-rail" aria-label="Choose a live project">{projects.map(item => <button key={item.id} aria-pressed={activeId === item.id} onClick={() => setActiveId(item.id)}><ProjectLogo id={item.id} /><span className="project-copy"><strong>{item.name}</strong><small>{item.summary}</small></span><ArrowUpRight size={19} /></button>)}</nav>
      <div className="workspace"><section className="workbench" aria-label="Live application preview"><div className="viewport-switcher" role="group" aria-label="Preview device">{devices.map(value => <button key={value} aria-pressed={device === value} onClick={() => setDevice(value)}><PreviewDeviceIcon device={value} />{deviceNames[value]}</button>)}</div><ConnectedSourcePreview key={project.id} project={project} device={device} /></section><GuidePanel project={project} onCoreFlow={() => document.querySelector<HTMLIFrameElement>(".connected-preview-frame")?.focus()} /></div>
    </section>
    <Architecture />
    <section className="case-study"><div><div className="section-eyebrow">A closer look</div><h2>Don’t just take my <em>word</em> for it.</h2></div><div className="case-grid"><article><Code2 size={22} /><h3>Inspect the source</h3><p>Every published project links to its repository. Follow a decision beyond the interface.</p></article><article><ShieldCheck size={22} /><h3>Know the boundary</h3><p>The guide distinguishes documented facts from claims that still need evidence.</p></article><article><MessageCircle size={22} /><h3>Have a conversation</h3><p>Want to discuss a system, a team or a role? Let’s talk about the details.</p><a className="contact-link" href={contactUrl} target="_blank" rel="noreferrer" aria-label="Discuss a role with Andrei on LinkedIn" title="Discuss a role with Andrei"><ArrowUpRight size={22} /></a></article></div></section>
    <footer className="site-footer"><span>© 2026 Andrei Tekhtelev</span><span>Real products. Visible decisions.</span><a href="#top">Back to top <ArrowUpRight size={14} /></a></footer>
    <a className={`sticky-contact ${showContact ? "visible" : ""}`} href={contactUrl} target="_blank" rel="noreferrer" tabIndex={showContact ? 0 : -1} aria-hidden={!showContact}><span className="status-dot ready" />Let’s build something <ArrowUpRight size={17} /></a>
  </main>;
}

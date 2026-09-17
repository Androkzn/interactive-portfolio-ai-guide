"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, BatteryFull, Bot, Braces, Check, ClipboardCheck, Code2, CornerDownLeft, DatabaseZap, FileCheck2, Github, Layers3, Linkedin, LockKeyhole, MessageCircle, MonitorCog, Moon, Play, RotateCcw, SearchCheck, Send, ShieldCheck, Signal, Smartphone, Sparkles, Sun, TabletSmartphone, Volume2, VolumeX, WandSparkles, Wifi } from "lucide-react";
import { DEFAULT_PROJECT_ID, DevicePreview, Project, projectById, projects } from "@/lib/content";
import { acceptsPreviewMessage, deviceWidths, portfolioDemoMessageFor } from "@/lib/preview";

type Message = { id: number; role: "guide" | "visitor"; text: string; animate?: boolean };
type Theme = "light" | "dark";
const contactUrl = "https://www.linkedin.com/in/andreitekhtelev/";
const githubUrl = "https://github.com/Androkzn";
const devices: DevicePreview[] = ["iphone", "ipad", "android", "desktop"];
const deviceNames = { iphone: "iPhone", ipad: "iPad", android: "Android", desktop: "Web" };
const deviceFrameAssets: Partial<Record<DevicePreview, { src: string; model: string }>> = {
  iphone: { src: "/images/device-frames/iphone-16-pro-black-titanium.png", model: "iPhone 16 Pro Max" },
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
  "hoc-v2": "/images/apps/house-of-commons-main.png",
  "symply-budget": "/images/apps/symply-budget.png",
};

function ProjectLogo({ id }: { id: Project["id"] }) {
  return <img className={`project-logo project-logo-${id}`} src={projectLogoSources[id]} alt="" aria-hidden="true" />;
}

function PreviewDeviceIcon({ device }: { device: DevicePreview }) {
  const icon = device === "iphone" ? <Smartphone size={16} strokeWidth={2.1} />
    : device === "ipad" ? <TabletSmartphone size={16} strokeWidth={2.1} />
      : device === "android" ? <Bot size={16} strokeWidth={2.1} />
        : <MonitorCog size={16} strokeWidth={2.1} />;
  return <span className={`preview-device-icon preview-device-icon-${device}`} aria-hidden="true"><span className="preview-device-icon-glow" />{icon}</span>;
}

function DeviceStatusBar({ device }: { device: Exclude<DevicePreview, "desktop"> }) {
  return <div className={`device-status-bar device-status-bar-${device}`} aria-hidden="true">
    <span className="device-status-time">9:41</span>
    <span className="device-status-cutout" />
    <span className="device-status-icons"><Signal size={15} strokeWidth={2.25} /><Wifi size={16} strokeWidth={2.25} /><BatteryFull size={18} strokeWidth={2.25} /></span>
  </div>;
}

function makeGuideReply(question: string, project: Project) {
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
    return `**Try ${project.name}**\n\n- Guest email and password are already filled in.\n- Tap Sign In in the live app.\n- Explore the product and try its core flows.\n\nThe guest account is reserved for this portfolio demo.`;
  }
  return `**Explore ${project.name}**\n\nI have prepared answers about the source boundary, documented challenge and core flow. Choose a question below or inspect the source. For a deeper conversation, get in touch with Andrei.\n\nI don’t have a verified answer to every free-form question.`;
}

function initialGuideMessage(project: Project) {
  if (project.id === "symply-house" || project.id === "symply-budget") {
    return `**Guest access is ready.**\n\nThe email and password are already filled in for ${project.name}. Tap Sign In in the live app to start exploring.`;
  }
  return "**No account needed.**\n\nStart exploring the live civic app on the left. Then ask about the decisions behind it; I’ll separate documented facts from what still needs evidence.";
}

type LiveGuideAction = { label: string; answer: string };
type LiveGuideContext = {
  key: string;
  label: string;
  title: string;
  body: string;
  actions: LiveGuideAction[];
};

function guideContextFor(project: Project, pathname: string): LiveGuideContext {
  const path = pathname.toLowerCase();
  const context = (label: string, title: string, body: string, actions: LiveGuideAction[]): LiveGuideContext => ({
    key: `${project.id}:${label}`,
    label,
    title,
    body,
    actions,
  });

  if (path === "/login" || path.includes("login")) {
    return context("READY TO START", "One tap from the demo", `Guest email and password are already filled in for ${project.name}. Tap Sign In in the live app.`, [
      { label: "What happens next?", answer: "You’ll enter the real guest workspace with prepared content, then the guide will follow the screen you open. Feel free to play and interact with the app." },
      { label: "What can I change?", answer: "Explore, add and edit items inside the guest experience. The account is reserved for portfolio visitors." },
    ]);
  }

  if (path.includes("projects")) {
    return context("PROJECTS", "Welcome to Projects", "This workspace turns an idea—renovation, repair or upgrade—into scope, materials, tasks and a visible next step.", [
      { label: "What can I try here?", answer: "Open a project, inspect its plan, then add or update a task to see how household work stays connected." },
      { label: "How is it built?", answer: "Projects compose typed domain records for plans, tasks, spaces, materials and budgets while keeping each workflow independently testable." },
    ]);
  }

  if (path.includes("spending") || path.includes("bills")) {
    return context("SPENDING", "Follow where money goes", "Review transactions and recurring commitments, then move from raw activity to a decision you can act on.", [
      { label: "What can I try here?", answer: "Open a transaction or bill, inspect its category and adjust it to see how the budget view responds." },
      { label: "What is the UX goal?", answer: "Keep financial detail inspectable without turning the screen into a spreadsheet." },
    ]);
  }

  if (path.includes("budget") || path.includes("planning") || path.includes("savings")) {
    const title = project.id === "symply-budget" ? "Give every dollar a purpose" : "Keep home costs in context";
    return context("BUDGET", title, "Balances, plans and goals stay close to the decision they support instead of becoming isolated numbers.", [
      { label: "What can I try here?", answer: "Inspect a category or goal, change an amount and watch the plan recalculate around that decision." },
      { label: "Why local-first?", answer: "The core budget remains responsive and understandable while sync and provider integrations stay explicit boundaries." },
    ]);
  }

  if (path.includes("chat") || path.includes("mira")) {
    return context("ASSISTANT", "Ask, decide, then act", "The assistant is designed to explain context and propose the next step without claiming an action succeeded before the app confirms it.", [
      { label: "What should I ask?", answer: "Ask for a summary, the most important next action or an explanation of a recommendation." },
      { label: "Where are the guardrails?", answer: "Evidence grounds the answer, typed actions bound what can happen and acknowledgements confirm real state changes." },
    ]);
  }

  if (path.includes("settings") || path.includes("profile")) {
    return context("MORE", "Control the experience", "Settings collect personalization, permissions and account boundaries without crowding the daily workflow.", [
      { label: "What can I inspect?", answer: "Try appearance, navigation customization and profile controls to see how the app adapts without changing its core model." },
      { label: "Why separate this?", answer: "Occasional controls stay reachable but do not compete with the primary tasks on Home." },
    ]);
  }

  return context("HOME", project.id === "symply-budget" ? "Your money at a glance" : "Your household at a glance", project.id === "symply-budget"
    ? "Home summarizes the financial signals that need attention now and keeps deeper analysis one tap away."
    : "Home brings tasks, reminders and household context together so the next useful action is immediately visible.", [
    { label: "What should I try first?", answer: project.id === "symply-budget" ? "Open a summary card, then move into Budget or Spending to inspect the underlying detail." : "Open Projects or a task card to move from the household overview into a concrete workflow." },
    { label: "Why this layout?", answer: "The screen prioritizes current decisions and exceptions instead of showing every available feature at once." },
  ]);
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

const ConnectedSourcePreview = memo(function ConnectedSourcePreview({ project, device, onDeviceChange, onNavigate }: { project: Project; device: DevicePreview; onDeviceChange: (device: DevicePreview) => void; onNavigate: (pathname: string) => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [theme, setTheme] = useState<Theme>("light");
  const [appliedTheme, setAppliedTheme] = useState<Theme | null>(null);
  const [themeReady, setThemeReady] = useState(false);
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const url = project.webPreviewUrl
    ? (() => {
        const previewUrl = new URL(project.webPreviewUrl);
        if (portfolioDemoMessageFor(project.id)) previewUrl.searchParams.set("portfolioDemo", "1");
        return previewUrl.toString();
      })()
    : undefined;
  useEffect(() => {
    if (!url) return;
    const origin = new URL(url).origin;
    const demoMessage = portfolioDemoMessageFor(project.id);
    let retries = 0;
    const requestTheme = () => frame.current?.contentWindow?.postMessage({ type: "portfolio:theme", theme: themeRef.current }, origin);
    const requestDemo = () => { if (demoMessage) frame.current?.contentWindow?.postMessage(demoMessage, origin); };
    const handshake = window.setInterval(() => {
      requestTheme();
      requestDemo();
      if (++retries >= 45) window.clearInterval(handshake);
    }, 1000);
    const receive = (event: MessageEvent) => {
      if (!acceptsPreviewMessage(event, frame.current?.contentWindow, origin)) return;
      if (event.data.type === "portfolio:theme-ready") {
        setThemeReady(true);
        frame.current?.contentWindow?.postMessage({ type: "portfolio:theme", theme: themeRef.current }, origin);
      }
      if (event.data.type === "portfolio:theme-applied" && (event.data.theme === "light" || event.data.theme === "dark")) {
        setThemeReady(true);
        setAppliedTheme(event.data.theme);
        window.clearInterval(handshake);
      }
      if (event.data.type === "portfolio:demo-ready" && event.data.projectId === project.id) {
        requestDemo();
        requestTheme();
      }
      if (event.data.type === "portfolio:navigation" && event.data.projectId === project.id && typeof event.data.pathname === "string") {
        onNavigate(event.data.pathname);
      }
    };
    window.addEventListener("message", receive);
    requestTheme();
    requestDemo();
    return () => { window.removeEventListener("message", receive); window.clearInterval(handshake); };
  }, [project.id, url, attempt, onNavigate]);
  const changeTheme = (next: Theme) => {
    setTheme(next);
    if (url) frame.current?.contentWindow?.postMessage({ type: "portfolio:theme", theme: next }, new URL(url).origin);
  };
  if (!url) return <p>Live preview unavailable.</p>;
  const liveFrame = <iframe ref={frame} key={`${project.id}-${attempt}`} title={`${project.name} live Web app`} src={url} onLoad={() => {
    const origin = new URL(url).origin;
    frame.current?.contentWindow?.postMessage({ type: "portfolio:theme", theme: themeRef.current }, origin);
    const demoMessage = portfolioDemoMessageFor(project.id);
    if (demoMessage) frame.current?.contentWindow?.postMessage(demoMessage, origin);
  }} className="connected-preview-frame" loading="eager" referrerPolicy="no-referrer"
    sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-same-origin allow-scripts" />;
  const frameAsset = deviceFrameAssets[device];
  return <div className="connected-preview">
    <div className="connected-preview-bar">
      <div className="preview-bar-actions">
        <div className="app-theme-controls" role="group" aria-label="Live app appearance">
          <span>App theme</span>
          <button disabled={!themeReady} aria-pressed={appliedTheme === "light"} onClick={() => changeTheme("light")}><Sun size={13} />Light</button>
          <button disabled={!themeReady} aria-pressed={appliedTheme === "dark"} onClick={() => changeTheme("dark")}><Moon size={13} />Dark</button>
        </div>
        <div className="viewport-switcher" role="group" aria-label="Preview device">{devices.map(value => <button className={`viewport-option viewport-option-${value}`} key={value} aria-pressed={device === value} onClick={() => onDeviceChange(value)}><PreviewDeviceIcon device={value} />{deviceNames[value]}</button>)}</div>
        <button className="preview-reload" onClick={() => setAttempt(value => value + 1)}><RotateCcw size={13} />Reload app</button>
      </div>
    </div>
    <div className="device-stage">
      <div className={`device-shell device-shell-${device} device-theme-${appliedTheme ?? theme}`} style={{ width: deviceWidths[device] }}>
        {device === "desktop" ? <div className="device-screen">
          <div className="device-chrome device-chrome-desktop"><span className="device-window-dots" aria-hidden="true"><i /><i /><i /></span><span className="device-desktop-title">{project.name}</span><span className="device-desktop-menu" aria-hidden="true">•••</span></div>
          {liveFrame}
        </div> : <>
          <div className="device-live-screen">
            <DeviceStatusBar device={device} />
            <div className="device-app-viewport">{liveFrame}</div>
          </div>
          <img className="device-frame-art" src={frameAsset?.src} alt="" aria-hidden="true" draggable="false" />
          <span className="sr-only">Previewed in a {frameAsset?.model} frame.</span>
        </>}
      </div>
    </div>
    {!portfolioDemoMessageFor(project.id) && <div className="preview-footer"><span>Public data · explore without an account</span></div>}
  </div>;
});

const GuidePanel = memo(function GuidePanel({ project, appPath, onCoreFlow }: { project: Project; appPath: string; onCoreFlow: () => void }) {
  const [input, setInput] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(true);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [messages, setMessages] = useState<Message[]>([{ id: 0, role: "guide", text: initialGuideMessage(project) }]);
  const [activeAction, setActiveAction] = useState<string | null>(null);
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
  }, [messages]);
  const context = guideContextFor(project, appPath);
  useEffect(() => {
    window.speechSynthesis?.cancel();
    speech.current = null;
    setSpeaking(false);
    setActiveAction(null);
    setMessages([{ id: nextId.current++, role: "guide", text: guideContextFor(project, appPath).body, animate: true }]);
  }, [appPath, project]);
  const ask = (text: string) => {
    stop();
    if (text.toLowerCase().includes("core flow")) onCoreFlow();
    const replyId = nextId.current++;
    setActiveAction(text);
    setMessages([{ id: replyId, role: "guide", text: makeGuideReply(text, project), animate: true }]);
  };
  const chooseAction = (action: LiveGuideAction) => {
    stop();
    setActiveAction(action.label);
    setMessages([{ id: nextId.current++, role: "guide", text: action.answer, animate: true }]);
  };
  const speak = () => {
    const latest = [...messages].reverse().find(message => message.role === "guide");
    if (!latest || !voiceAvailable) return;
    window.speechSynthesis?.cancel();
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
  useEffect(() => {
    if (muted || !voiceAvailable) return;
    speak();
  }, [messages, muted, voiceAvailable]);
  const toggleMute = () => {
    if (muted) {
      setMuted(false);
      return;
    }
    setMuted(true);
    stop();
  };
  return <aside className="guide-panel" id="guide" aria-label="Andrei’s project guide">
    <div className="guide-live-head"><Avatar active={speaking} /><button className="voice-button" disabled={!voiceAvailable} onClick={toggleMute} aria-pressed={!muted} aria-label={muted ? "Unmute guide voice" : "Mute guide voice"}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}<span>{muted ? "Muted" : "Mute"}</span></button></div>
    <div className="guide-context-card" aria-live="polite" aria-atomic="true"><h2>{context.title}</h2><div ref={thread} className="guide-thread" tabIndex={0}>{messages.map(message => <div key={message.id} className="message guide"><span className="message-marker"><Sparkles size={13} /></span><div><GuideReply message={message} /></div></div>)}</div></div>
    <div className="guide-actions" aria-label="Suggested questions">{context.actions.map(action => <button key={action.label} className={activeAction === action.label ? "active" : ""} onClick={() => chooseAction(action)}>{action.label}</button>)}</div>
    <form className="chat-form" onSubmit={event => { event.preventDefault(); if (input.trim()) { ask(input.trim()); setInput(""); } }}><input value={input} maxLength={500} onChange={event => setInput(event.target.value)} placeholder="Ask about this screen…" aria-label="Ask about this screen" /><button disabled={!input.trim()} type="submit" aria-label="Send question"><Send size={16} /></button></form>
  </aside>;
});

type ReviewOwner = "andrei" | "prompt-only";
type ReviewTone = "safe" | "blocked" | "unverified";
type ReviewStep = {
  name: string;
  code: string;
  body: string;
  input: string;
  output: string;
};
type ReviewOutcome = {
  label: string;
  title: string;
  body: string;
  metrics: string[];
};
type ReviewResult = {
  verdict: string;
  tone: ReviewTone;
  blockedStep?: number;
  strategy: {
    title: string;
    body: string;
    code: string;
  };
  steps: ReviewStep[];
  stepOutputs: string[];
  outcome: ReviewOutcome;
};
type GuardrailScenarioId = "plumbing-assistant" | "bug-fix" | "code-review";
type GuardrailScenario = {
  id: GuardrailScenarioId;
  label: string;
  assignment: string;
  query: string;
  reviews: Record<ReviewOwner, ReviewResult>;
};

const plumbingSeniorSteps: ReviewStep[] = [
  { name: "Map the service", code: "coverage + policy", body: "Ground triage in the service catalogue, branch coverage, emergency policy and local language rules.", input: "Approved service, branch and privacy data", output: "Known coverage, urgency signals and an evidence boundary" },
  { name: "Define triage", code: "intent + handoff", body: "Define what the assistant can collect and route—and when a human must take over.", input: "Coverage rules + failure modes", output: "Triage contract, required fields and escalation path" },
  { name: "Dispatch safely", code: "bookingId + ack", body: "Create a typed dispatch request and wait for the local branch to acknowledge availability.", input: "Validated customer context + branch candidate", output: "Booking/callback acknowledgement or explicit handoff" },
  { name: "Verify operations", code: "fixtures + evals", body: "Exercise emergencies, French, after-hours, no coverage, outages and human handoffs before 24/7 release.", input: "Call fixtures + expected boundaries", output: "Pass/fail evidence for every route" },
  { name: "Launch with signals", code: "metrics + handoff", body: "Release with traceable conversations, escalation metrics and a rollback path for the operations team.", input: "Verified routes + monitoring plan", output: "A 24/7 system that can be observed and safely changed" },
];

const plumbingShortcutSteps: ReviewStep[] = [
  { name: "Prompt", code: "prompt only", body: "Ask the model to answer plumbing questions from generic knowledge.", input: "A short request for a 24/7 chatbot", output: "A fluent script with no verified branch context" },
  { name: "Infer", code: "model guess", body: "Let the model infer urgency, service area, pricing and availability from the conversation.", input: "Caller text + broad model context", output: "Confident assumptions about the right response" },
  { name: "Connect", code: "text → action", body: "Wire the generated response directly toward booking without a typed dispatch boundary.", input: "Generated answer + partial CRM access", output: "A promise that may not match branch reality" },
];

const invoiceSeniorSteps: ReviewStep[] = [
  { name: "Reconstruct the incident", code: "trace + db", body: "Replay the failing request across logs, traces, retry workers and invoice writes.", input: "Incident timeline + request/invoice IDs", output: "A reproducible failure timeline" },
  { name: "Isolate the cause", code: "idempotency", body: "Separate the symptom from the root cause and define the invariant that must hold under retry.", input: "Failure timeline + retry path", output: "Root-cause hypothesis + durable idempotency contract" },
  { name: "Implement the fix", code: "migration + rollback", body: "Change the system so the invariant is enforced, with a safe migration, rollout and rollback path.", input: "Approved fix design + affected data", output: "Long-term fix with controlled release mechanics" },
  { name: "Verify under pressure", code: "replay + evals", body: "Replay concurrent retries, partial failures and deploy transitions while monitoring duplicate rate.", input: "Concurrency fixtures + observability checks", output: "Evidence that one request creates one invoice" },
  { name: "Watch the release", code: "duplicateRate", body: "Keep the fix observable after release and confirm duplicate invoices stay at zero under real traffic.", input: "Production metrics + alert thresholds", output: "A durable fix with a signal if reality diverges" },
];

const invoiceShortcutSteps: ReviewStep[] = [
  { name: "Prompt", code: "prompt only", body: "Paste the error message into AI and ask for the likely fix.", input: "Error text + a short bug description", output: "A plausible explanation with no incident reconstruction" },
  { name: "Guess", code: "first output", body: "Accept the first duplicate-check suggestion before isolating the retry path.", input: "Generated diagnosis", output: "A likely cause among several competing causes" },
  { name: "Patch", code: "hope → ship", body: "Apply a local guard and treat a green happy path as proof that the bug is fixed.", input: "Small generated code change", output: "A symptom patch without idempotency or rollback" },
];

const codeReviewSeniorSteps: ReviewStep[] = [
  { name: "Read the change in context", code: "diff + intent", body: "Compare the pull request with the ticket, contract and data-flow assumptions before judging the code.", input: "Pull request + product contract", output: "Review scope and questions grounded in intent" },
  { name: "Challenge failure modes", code: "edges + tests", body: "Probe retries, empty states, permissions, integration boundaries and the paths the happy demo never touches.", input: "Diff + known failure modes", output: "Concrete risks and focused test cases" },
  { name: "Request evidence", code: "tests + traces", body: "Ask for proof on the risky paths and separate what the code shows from what the model merely suggests.", input: "Risk list + test evidence", output: "Verified findings with owners and follow-ups" },
  { name: "Approve the release", code: "rollout + rollback", body: "Record residual risk, rollout guardrails and a rollback owner before approving the change.", input: "Verified findings + release plan", output: "An accountable review decision" },
];

const codeReviewShortcutSteps: ReviewStep[] = [
  { name: "Prompt", code: "diff → summary", body: "Paste the diff into AI and accept a confident summary as the review.", input: "Pull request + short prompt", output: "A fluent summary with no verified context" },
  { name: "Scan", code: "happy path", body: "Check names and style while skipping failure modes, integration boundaries and ownership.", input: "Generated review notes", output: "Surface-level findings" },
  { name: "Approve", code: "LGTM too soon", body: "Approve without evidence for tests, rollout or the risks the prompt could not see.", input: "First generated review", output: "An approval with unmeasured residual risk" },
];

const guardrailScenarios: GuardrailScenario[] = [
  {
    id: "plumbing-assistant",
    label: "Build a 24/7 plumbing assistant",
    assignment: "Build a 24/7 AI call-centre assistant for a Canada-wide plumbing network.",
    query: "Build a 24/7 AI call-centre assistant for a Canada-wide plumbing network.",
    reviews: {
      andrei: {
        verdict: "VERIFIED · triage, routing and handoff are release-ready",
        tone: "safe",
        strategy: { title: "Start with the operating reality.", body: "Map coverage, triage and human handoff before choosing a model or connecting a booking action.", code: "evidence → contract" },
        steps: plumbingSeniorSteps,
        stepOutputs: [
          "Service catalogue, branch coverage, emergency policy and privacy references",
          "Triage contract · urgency, postal code, language and human handoff are explicit",
          "Typed booking request issued · branch availability acknowledged before any promise",
          "PASS · emergency, French, outage, privacy and handoff fixtures pass",
        ],
        outcome: {
          label: "WHAT A SENIOR AI ARCHITECT PRODUCES",
          title: "A dependable call-centre system—not just a convincing conversation.",
          body: "The assistant can triage safely, route to the right local branch and hand off when evidence or capability runs out. Every external promise waits for a real system acknowledgement.",
          metrics: ["Risk: bounded", "Handoff: explicit", "Outcome: release-ready"],
        },
      },
      "prompt-only": {
        verdict: "UNVERIFIED · plausible conversation, unsafe dispatch boundary",
        tone: "unverified",
        blockedStep: 2,
        strategy: { title: "Start with a prompt.", body: "Let the model draft a helpful conversation before checking branch coverage, emergency policy or dispatch authority.", code: "prompt → answer" },
        steps: plumbingShortcutSteps,
        stepOutputs: [
          "A generic FAQ prompt · no verified branch, policy or service-area sources",
          "Conversation script drafted · emergency and out-of-scope rules remain implicit",
          "UNVERIFIED · the assistant could promise a booking without a dispatch acknowledgement",
          "Not release-ready · no evidence for routing, privacy or failure recovery",
        ],
        outcome: {
          label: "WHAT THE SHORTCUT USUALLY PRODUCES",
          title: "A polished chatbot that can make an unsafe promise.",
          body: "The first demo may look impressive, but missed emergency rules, stale branch data or an invented appointment can turn a fast prototype into a customer-safety and operations problem.",
          metrics: ["Risk: hidden", "Rework: after incident", "Outcome: do not ship"],
        },
      },
    },
  },
  {
    id: "bug-fix",
    label: "Fix a production bug",
    assignment: "Retries are creating duplicate invoices. Find the cause and propose a safe fix.",
    query: "Retries are creating duplicate invoices. Find the cause and propose a safe fix.",
    reviews: {
      andrei: {
        verdict: "VERIFIED · root cause addressed and long-term fix is release-ready",
        tone: "safe",
        strategy: { title: "Reconstruct before changing code.", body: "Follow one request from retry to database write, then define the invariant that a durable fix must enforce.", code: "incident → invariant" },
        steps: invoiceSeniorSteps,
        stepOutputs: [
          "Incident timeline, retry path, idempotency contract and database references",
          "Root-cause hypothesis tested · long-term fix scoped beyond a symptom patch",
          "Migration and code change proposed · requestId and rollback path defined",
          "PASS · concurrency, replay, regression and observability fixtures pass",
        ],
        outcome: {
          label: "WHAT A SENIOR AI ARCHITECT PRODUCES",
          title: "A root-cause fix with evidence that it will hold under retry pressure.",
          body: "The investigation reconstructs the failure, isolates the actual retry path and designs an idempotent long-term fix with migration, rollback, observability and regression coverage.",
          metrics: ["Cause: evidenced", "Time: planned", "Outcome: release-ready"],
        },
      },
      "prompt-only": {
        verdict: "UNVERIFIED · patch proposed, root cause still unknown",
        tone: "unverified",
        blockedStep: 2,
        strategy: { title: "Patch the symptom quickly.", body: "Use the error text and the first generated suggestion as a substitute for incident reconstruction.", code: "error → patch" },
        steps: invoiceShortcutSteps,
        stepOutputs: [
          "Error text copied into a prompt · no incident timeline or retry-path evidence",
          "Likely duplicate check suggested · competing causes not isolated",
          "A small patch drafted · no idempotency, migration or rollback contract",
          "BLOCKED · the fix cannot be called safe without replay and concurrency evidence",
        ],
        outcome: {
          label: "WHAT THE SHORTCUT USUALLY PRODUCES",
          title: "A symptom patch that moves the failure somewhere else.",
          body: "A generated guard or retry tweak can make the happy path look green while duplicates remain possible under replay, concurrency or a partial failure. The real investigation starts after another incident.",
          metrics: ["Cause: assumed", "Time: after incident", "Outcome: not safe to ship"],
        },
      },
    },
  },
  {
    id: "code-review",
    label: "Code review",
    assignment: "Review a production change before it reaches customers.",
    query: "Review a production change before it reaches customers.",
    reviews: {
      andrei: {
        verdict: "VERIFIED · code review evidence is release-ready",
        tone: "safe",
        strategy: { title: "Review the change in context.", body: "Ground the review in intent, challenge failure modes and require evidence before approving the release.", code: "intent → evidence" },
        steps: codeReviewSeniorSteps,
        stepOutputs: [
          "Pull request, ticket, contract and data-flow assumptions are in scope",
          "Retries, permissions, empty states and integration edges are covered",
          "High-risk findings have focused tests, owners and follow-ups",
          "PASS · residual risk, rollout guardrails and rollback owner recorded",
        ],
        outcome: {
          label: "WHAT A SENIOR AI ARCHITECT PRODUCES",
          title: "A code review that makes the release safer.",
          body: "The change is judged against intent, failure modes and evidence—not just a clean diff. Remaining risk has an owner, a rollout guardrail and a rollback path.",
          metrics: ["Context: grounded", "Evidence: required", "Outcome: release-ready"],
        },
      },
      "prompt-only": {
        verdict: "UNVERIFIED · approval proposed, release risk still unknown",
        tone: "unverified",
        blockedStep: 2,
        strategy: { title: "Start with the generated summary.", body: "Treat a fluent AI review and a clean-looking diff as enough evidence to approve the change.", code: "summary → LGTM" },
        steps: codeReviewShortcutSteps,
        stepOutputs: [
          "Diff pasted into a prompt · product intent and ownership are absent",
          "Happy-path comments generated · edge cases and integration risks skipped",
          "UNVERIFIED · approval proposed without test or rollout evidence",
          "Not release-ready · the real risk appears during review or after release",
        ],
        outcome: {
          label: "WHAT THE SHORTCUT USUALLY PRODUCES",
          title: "An approval that looks finished before the risk is known.",
          body: "A fluent summary can miss the failure modes that matter. Without context, focused tests and a rollout owner, the code review becomes a confident guess with delayed rework.",
          metrics: ["Context: missing", "Evidence: assumed", "Outcome: not safe to ship"],
        },
      },
    },
  },
];

type ArchitectureView = "contract" | "goat";

type PuzzleActionId = "contract" | "ground" | "bound" | "typed" | "confirm" | "evaluate" | "prompt-first" | "generate-first" | "ship-first";
type PuzzleResult = "idle" | "success" | "failure";

const puzzleActions: { id: PuzzleActionId; label: string; detail: string; code: string }[] = [
  { id: "contract", label: "Define the outcome", detail: "Make “storm” an explicit contract.", code: "contract" },
  { id: "ground", label: "Ground in evidence", detail: "Use approved sources and context.", code: "sourceIds[]" },
  { id: "bound", label: "Set the boundary", detail: "Decide what the system is allowed to do.", code: "capability" },
  { id: "typed", label: "Use a typed action", detail: "Turn intent into a validated operation.", code: "GuideAction" },
  { id: "confirm", label: "Confirm real state", detail: "Wait for the interface acknowledgement.", code: "requestId + ack" },
  { id: "evaluate", label: "Evaluate before release", detail: "Run repeatable fixtures and inspect the result.", code: "offline evals" },
  { id: "prompt-first", label: "Write a clever prompt", detail: "The tempting shortcut.", code: "prompt only" },
  { id: "generate-first", label: "Generate first", detail: "Trust the first pretty output.", code: "hope → ship" },
  { id: "ship-first", label: "Ship if it looks right", detail: "Skip the final check.", code: "looks-good" },
];

const correctPuzzleSequence: PuzzleActionId[] = ["contract", "ground", "bound", "typed", "confirm", "evaluate"];
const puzzleFailures = [
  { id: "striped-goat", title: "Wrong species. Perfect confidence.", image: "/images/pink-goat-blue-stripe.png", cause: "A prompt was mistaken for a product contract. The worst possible goat shipped." },
  { id: "wet-goat", title: "Right intention. No protection.", image: "/images/goat-wet-white-sad.png", cause: "The output reached the world before the system had a boundary or a verified state." },
  { id: "storm-goat", title: "The symbol replaced the substance.", image: "/images/goat-storm-on-side-white.png", cause: "The model copied the idea of a storm onto the wrong object instead of producing the capability." },
  { id: "shower-goat", title: "Connected. Still not correct.", image: "/images/goat-under-shower-storm-generator.png", cause: "Every pipe is connected to a storm generator. The user still received a shower." },
  { id: "near-storm-generator", title: "Almost a storm. Still a goat.", image: "/images/goat-near-storm-generator.png", cause: "Five careful handoffs held together. The generator is producing weather, but the final output is still the wrong species." },
] as const;

function failureFor(sequence: PuzzleActionId[]) {
  const progress = Math.min(verifiedPrefixLength(sequence), 5);
  if (progress >= 5) return puzzleFailures[4];
  if (progress >= 3) return puzzleFailures[3];
  if (progress === 2) return puzzleFailures[2];
  if (progress === 1) return puzzleFailures[1];
  return puzzleFailures[0];
}

function verifiedPrefixLength(sequence: PuzzleActionId[]) {
  let length = 0;
  while (length < sequence.length && sequence[length] === correctPuzzleSequence[length]) length += 1;
  return length;
}

function PuzzleActionIcon({ id, locked = false }: { id: PuzzleActionId; locked?: boolean }) {
  const icon = id === "contract" ? <FileCheck2 size={16} strokeWidth={2.1} />
    : id === "ground" ? <DatabaseZap size={16} strokeWidth={2.1} />
      : id === "bound" ? <ShieldCheck size={16} strokeWidth={2.1} />
        : id === "typed" ? <Braces size={16} strokeWidth={2.1} />
          : id === "confirm" ? <ClipboardCheck size={16} strokeWidth={2.1} />
            : id === "evaluate" ? <SearchCheck size={16} strokeWidth={2.1} />
              : id === "prompt-first" ? <WandSparkles size={16} strokeWidth={2.1} />
                : id === "generate-first" ? <Sparkles size={16} strokeWidth={2.1} />
                  : <ArrowUpRight size={16} strokeWidth={2.1} />;
  return <span className={`puzzle-action-icon puzzle-action-icon-${id}`} aria-hidden="true">{icon}{locked && <span className="puzzle-lock-mark"><LockKeyhole size={9} strokeWidth={2.4} /></span>}</span>;
}

function GoatMode() {
  const [sequence, setSequence] = useState<PuzzleActionId[]>([]);
  const [result, setResult] = useState<PuzzleResult>("idle");
  const [failureId, setFailureId] = useState<string | null>(null);
  const [status, setStatus] = useState("Build the chain in the order a senior architect would ship it.");
  const [dragging, setDragging] = useState<PuzzleActionId | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [spellCast, setSpellCast] = useState(false);
  const stormVideo = useRef<HTMLVideoElement | null>(null);
  const failure = puzzleFailures.find(item => item.id === failureId);
  const lockedPrefixLength = Math.min(verifiedCount, verifiedPrefixLength(sequence));

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    stormVideo.current?.pause();
  }, []);

  const playSpell = () => {
    setSpellCast(false);
    window.requestAnimationFrame(() => setSpellCast(true));
    const video = stormVideo.current;
    if (video) {
      video.currentTime = 0;
      void video.play().catch(() => setSpellCast(false));
    }
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Make a storm.");
    const voice = selectBestMaleVoice(window.speechSynthesis.getVoices());
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = "en-US";
    }
    utterance.rate = 0.78;
    utterance.pitch = 0.72;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  };

  const placeAction = (id: PuzzleActionId, targetIndex?: number) => {
    const sourceIndex = sequence.indexOf(id);
    if (sourceIndex !== -1 && sourceIndex < lockedPrefixLength) return;
    if (targetIndex !== undefined && targetIndex < lockedPrefixLength) return;
    const next = sequence.filter(item => item !== id);
    let destination = targetIndex === undefined ? next.length : Math.max(0, Math.min(targetIndex, next.length));
    if (sourceIndex !== -1 && sourceIndex < destination) destination -= 1;
    next.splice(destination, 0, id);
    setSequence(next);
    setResult("idle");
    setFailureId(null);
    setHint(null);
    setStatus("Step added. Ship to production when you are ready to verify the chain.");
  };

  const removeAction = (id: PuzzleActionId) => {
    if (sequence.slice(0, lockedPrefixLength).includes(id)) return;
    setSequence(current => current.filter(item => item !== id));
    setResult("idle");
    setFailureId(null);
    setHint(null);
    setStatus("Step removed. Rebuild the chain when ready.");
  };

  const checkSequence = () => {
    if (sequence.length === 0) {
      setStatus("Add a production action before shipping.");
      return;
    }
    setVerifiedCount(current => Math.max(current, verifiedPrefixLength(sequence)));
    if (sequence.length === correctPuzzleSequence.length && sequence.every((id, index) => id === correctPuzzleSequence[index])) {
      setResult("success");
      setFailureId(null);
      setStatus("VERIFIED · the storm arrived without turning into a goat.");
      return;
    }
    const nextFailure = failureFor(sequence);
    setFailureId(nextFailure.id);
    setResult("failure");
    setStatus(`FAILED · ${nextFailure.title.toLowerCase()}`);
  };

  const resetPuzzle = () => {
    setSequence([]);
    setResult("idle");
    setFailureId(null);
    setDragging(null);
    setDragOverIndex(null);
    setHint(null);
    setVerifiedCount(0);
    setStatus("Build the chain in the order a senior architect would ship it.");
  };

  const askForHint = () => {
    const has = (id: PuzzleActionId) => sequence.includes(id);
    const position = (id: PuzzleActionId) => sequence.indexOf(id);
    const followsSafePath = sequence.length > 0 && sequence.every((id, index) => id === correctPuzzleSequence[index]);
    let nextHint = "The pieces are on the table, but the spell has a small stumble in it. Watch the moment an intention becomes an action—and the moment the result earns its name.";

    if (followsSafePath) {
      const encouragements = [
        "Nice beginning—the spell has found its shape. Keep the next move close to its purpose.",
        "Good rhythm—the request now has something solid beneath it. Keep the circle intact.",
        "The circle is holding. Choose an instrument that can be inspected after it moves.",
        "The spell is becoming operational. Leave room for the world to answer before calling it real.",
        "Almost there—the weather looks promising. Give the result one last sober look before it travels.",
        "That rhythm holds. The chain is ready for its final test."
      ];
      nextHint = encouragements[Math.min(sequence.length - 1, encouragements.length - 1)];
    } else if (sequence.some(id => id === "prompt-first" || id === "generate-first" || id === "ship-first")) {
      nextHint = "One of the shiny shortcuts may be doing too much of the talking. Pretty magic is not the same as a safe spell.";
    } else if (!has("contract")) {
      nextHint = "Before the wand moves, give the spell a shape everyone can point at and agree on.";
    } else if (has("ground") && position("ground") < position("contract")) {
      nextHint = "The librarian arrived before the question was finished. Let the thing being asked take the stage first.";
    } else if (!has("ground")) {
      nextHint = "Every reliable spell has something solid beneath it. Look for the approved pages and context before the weather changes.";
    } else if (!has("bound")) {
      nextHint = "The destination is visible. Now mark the edge of the map so the spell knows where not to wander.";
    } else if (has("typed") && position("typed") < position("bound")) {
      nextHint = "The instrument is tuned, but the circle around it is not. Which should a careful wizard draw first?";
    } else if (!has("typed")) {
      nextHint = "Once the circle is drawn, choose an instrument that can be checked—not merely admired.";
    } else if (!has("confirm")) {
      nextHint = "The wand moved, but the room has not answered yet. Leave a beat for reality to reply.";
    } else if (!has("evaluate")) {
      nextHint = "The storm looks convincing from the window. A senior wizard still checks the same incantation twice.";
    } else if (sequence.length === correctPuzzleSequence.length && sequence.every((id, index) => id === correctPuzzleSequence[index])) {
      nextHint = "The spell has a steady rhythm now. Even the smallest final check should feel unsurprising.";
    }

    setHint(nextHint);
    setStatus(followsSafePath ? "Andrei reviewed the current chain · the spell is holding together." : "Andrei reviewed the current chain.");
  };

  const dropAction = (event: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    event.preventDefault();
    const dropped = event.dataTransfer.getData("text/plain") as PuzzleActionId;
    if (targetIndex >= lockedPrefixLength && puzzleActions.some(item => item.id === dropped)) placeAction(dropped, targetIndex);
    setDragging(null);
    setDragOverIndex(null);
  };

  return <div className={`goat-mode wizard-mode puzzle-mode puzzle-mode-${result}`}>
    <div className="goat-mode-heading">
      <div>
        <div className="section-eyebrow"><WandSparkles size={15} />Production puzzle / senior AI wizard required</div>
        <h2>Connect the spell.<br /><em>Protect the result.</em></h2>
      </div>
      <div className="goat-mode-intro">
        <div className="wizard-identity"><span className="wizard-avatar wizard-avatar-small"><img src="/images/wizard-programmer-ai-logos-avatar.png" alt="AI wizard programmer avatar with AI lab emblems on the robe" /></span><span><strong>AI spellcaster</strong><small>Good at intent. Needs a reviewer.</small></span></div>
        <p>The goal is simple: make a storm. Choose the real production steps, place them in order and earn the verified outcome. The prompt is only the spell.</p>
      </div>
    </div>

    <div className="puzzle-reality-banner">
      <div className="puzzle-ideal-world">
        <span className="wizard-card-label"><span>00</span>Ideal IT reality</span>
        <div className="puzzle-ideal-visuals">
          <div className="puzzle-ideal-scene puzzle-caster-scene">
            <span className="puzzle-scene-label">01 / Spell cast</span>
            <div className={`puzzle-caster-art ${spellCast ? "is-casting" : ""}`}><img src="/images/wizard-programmer-ai-logos-avatar-calm.png" alt="A programmer wizard holding a wand with AI lab emblems on the robe" /><img className="puzzle-magic-effect" src="/images/wizard-magic-effect.png" alt="" aria-hidden="true" /></div>
            <div className="puzzle-spell-bubble"><code>“Make a storm.”</code><button type="button" className={`puzzle-sound-button ${spellCast ? "is-playing" : ""}`} onClick={playSpell} aria-label="Speak the spell and play the storm" aria-keyshortcuts="Enter"><CornerDownLeft size={14} />Speak the spell</button></div>
          </div>
          <div className="puzzle-ideal-arrow" aria-hidden="true"><ArrowRight size={19} /><small>instant</small></div>
          <div className="puzzle-ideal-scene puzzle-result-scene">
            <span className="puzzle-scene-label">02 / Desired result</span>
            <div className={`puzzle-ideal-art ${spellCast ? "is-animating" : ""}`}><video ref={stormVideo} src="/video/storm-spell.mp4" poster="/images/programmer-under-umbrella-storm-banner-ai-logos.png" playsInline preload="metadata" onEnded={() => setSpellCast(false)} onError={() => setSpellCast(false)} aria-label="Animated storm with rain, lightning and thunder" /></div>
          </div>
        </div>
      </div>
      <div className="puzzle-unfortunately">
        <img className="puzzle-unfortunately-wizard" src="/images/wizard-programmer-sad.png" alt="A sad programmer wizard after a spell went wrong" />
        <div className="puzzle-unfortunately-copy">
          <span className="wizard-card-label">Unfortunately...</span>
          <h3>Prompts do not ship outcomes.</h3>
          <p>In production, the first interpretation can drift into an unexpected result. Connect the senior-architect steps below to protect the desired result.</p>
        </div>
      </div>
    </div>

    <div className="puzzle-board">
      <div className="puzzle-builder">
        <div className="puzzle-builder-head"><div><span className="wizard-card-label"><span>01</span>Available actions</span><h3>Choose and connect the safe path.</h3><small className="puzzle-builder-hint">Drag cards into the sequence, or click to add.</small></div></div>
        <div className="puzzle-action-grid" aria-label="Available production actions">
          {puzzleActions.filter(action => !sequence.includes(action.id)).map(action => <button key={action.id} className={`puzzle-action ${dragging === action.id ? "is-dragging" : ""}`} draggable onDragStart={event => { setDragging(action.id); event.dataTransfer.setData("text/plain", action.id); }} onDragEnd={() => { setDragging(null); setDragOverIndex(null); }} onClick={() => placeAction(action.id)}><PuzzleActionIcon id={action.id} /><span><strong>{action.label}</strong><small>{action.detail}</small></span><code>{action.code}</code></button>)}
        </div>
      </div>

      <div className={`puzzle-sequence-panel ${lockedPrefixLength > 0 ? "has-verified" : ""} ${result === "success" ? "is-verified" : ""}`}>
        <div className="puzzle-builder-head"><div><span className="wizard-card-label"><span>02</span>Connected sequence</span><h3>Drop the steps here.</h3><small className="puzzle-builder-hint">Drop onto a card to insert before it. Drop at the end to append.</small></div><button className="puzzle-reset" onClick={resetPuzzle}><RotateCcw size={14} />Reset</button></div>
        <div className="puzzle-sequence" aria-label="Connected production sequence">
          {sequence.length === 0 ? <div className={`puzzle-drop-zone ${dragOverIndex === 0 ? "is-target" : ""}`} onDragEnter={() => dragging && setDragOverIndex(0)} onDragOver={event => { event.preventDefault(); if (dragging) setDragOverIndex(0); }} onDrop={event => dropAction(event, 0)}>Drop any step here</div> : <>
            {sequence.map((id, index) => {
              const action = puzzleActions.find(item => item.id === id);
              const locked = index < lockedPrefixLength;
              return <div key={id} className={`puzzle-sequence-item ${locked ? "is-correct" : ""} ${dragOverIndex === index ? "is-target" : ""}`} onDragEnter={() => dragging && index >= lockedPrefixLength && setDragOverIndex(index)} onDragOver={event => { event.preventDefault(); if (dragging && index >= lockedPrefixLength) setDragOverIndex(index); }} onDrop={event => dropAction(event, index)}>{action && <button className="puzzle-placed" disabled={locked} draggable={!locked} onDragStart={event => { setDragging(action.id); setDragOverIndex(index); event.dataTransfer.setData("text/plain", action.id); }} onDragEnd={() => { setDragging(null); setDragOverIndex(null); }} onClick={() => removeAction(action.id)} aria-label={`${locked ? "Verified and locked" : "Drag to reorder or click to remove"} ${action.label}`} title={locked ? "Verified step · locked" : "Drag to reorder or click to remove"}><PuzzleActionIcon id={action.id} locked={locked} /><span><strong>{action.label}</strong><small>{action.detail}</small></span><code>{action.code}</code></button>}</div>;
            })}
            {sequence.length < puzzleActions.length && <div className={`puzzle-drop-zone puzzle-drop-zone-end ${dragOverIndex === sequence.length ? "is-target" : ""}`} onDragEnter={() => dragging && setDragOverIndex(sequence.length)} onDragOver={event => { event.preventDefault(); if (dragging) setDragOverIndex(sequence.length); }} onDrop={event => dropAction(event, sequence.length)}>Drop another step here</div>}
          </>}
        </div>
        <div className="puzzle-controls"><p aria-live="polite"><span className={`puzzle-status-dot puzzle-status-dot-${result}`} />{status}</p><div className="puzzle-control-buttons"><button className="puzzle-hint-button" onClick={askForHint}><span className="puzzle-andrei-avatar" aria-hidden="true"><img src="/images/andrei-tekhtelev-avatar.png" alt="" /></span>Ask Andrei for a hint</button><button className="puzzle-check" onClick={checkSequence} disabled={sequence.length === 0}><Check size={16} />Ship to production</button></div></div>
        {hint && <div className={`puzzle-hint-card ${lockedPrefixLength > 0 ? "is-encouraging" : ""}`} role="status"><div><span className="puzzle-andrei-avatar puzzle-andrei-avatar-card"><img src="/images/andrei-tekhtelev-avatar.png" alt="Andrei" /></span><strong>Andrei’s hint</strong></div><p>{hint}</p></div>}
      </div>
    </div>

    <div className={`puzzle-result puzzle-result-${result}`}>
      <div className="puzzle-result-copy">
        <span className="wizard-card-label"><span>03</span>{result === "success" ? "Verified outcome" : result === "failure" ? "Intermediate output" : "Outcome checkpoint"}</span>
        <h3>{result === "success" ? "The storm arrived." : result === "failure" && failure ? failure.title : "The result is waiting on your architecture."}</h3>
        <p>{result === "success" ? "The programmer is under an umbrella, the storm is beautiful and the contract survived the journey." : result === "failure" && failure ? failure.cause : "A senior AI wizard does not ship a confident guess. Connect the production steps, then ship when ready."}</p>
        {result === "success" && <div className="wizard-final-checks"><span><Check size={15} />Intent preserved</span><span><Check size={15} />State confirmed</span></div>}
        {result === "success" && <div className="puzzle-architect-contrast" aria-label="What separates a good AI architect from a bad AI architect">
          <div className="puzzle-architect-side puzzle-architect-good"><strong><ShieldCheck size={14} />Good AI architect</strong><p>Names the outcome, grounds decisions, sets boundaries and verifies reality.</p></div>
          <div className="puzzle-architect-side puzzle-architect-bad"><strong><WandSparkles size={14} />Bad AI architect</strong><p>Trusts the prompt, ships the first output and skips the final check.</p></div>
        </div>}
      </div>
      <div className="puzzle-result-art">{result === "success" ? <img src="/images/programmer-under-umbrella-storm-banner-ai-logos.png" alt="A programmer wizard in an AI-logo mantle standing fully visible under an umbrella in a beautiful thunderstorm" /> : result === "failure" && failure ? <img src={failure.image} alt={failure.title} /> : <span className="puzzle-empty-art"><WandSparkles size={35} /><small>Complete the chain to reveal the output</small></span>}{result === "success" && <span className="wizard-final-avatar wizard-avatar"><img src="/images/goat-thumbs-up-avatar.png" alt="Happy white goat giving a thumbs-up" /></span>}</div>
    </div>
    <p className="goat-caption">A wrong result is funny in a cartoon. In a product, the sequence is the spell that keeps the goat from shipping.</p>
  </div>;
}

type OutcomeVisualVariant = "stable" | "chaos" | "blocked";

function BugIcon({ kind = "round", dead = false }: { kind?: "round" | "long" | "tiny" | "winged"; dead?: boolean }) {
  return <svg className={`bug-icon bug-icon-${kind} ${dead ? "bug-icon-dead" : ""}`} viewBox="0 0 70 70" aria-hidden="true">
    <path className="bug-leg bug-leg-one" d="M22 28 8 19M21 37 5 37M23 46 10 56M48 28 62 19M49 37 65 37M47 46 60 56" />
    <path className="bug-antenna" d="M29 13 21 5M41 13 49 5" />
    <ellipse className="bug-body" cx="35" cy="37" rx="14" ry="19" />
    <circle className="bug-head" cx="35" cy="17" r="9" />
    <path className="bug-seam" d="M35 23v28" />
    <circle className="bug-eye" cx="31" cy="15" r="1.6" />
    <circle className="bug-eye" cx="39" cy="15" r="1.6" />
    {kind === "winged" && <path className="bug-wing" d="M23 29c-14-9-19 8-5 18M47 29c14-9 19 8 5 18" />}
    {dead && <path className="bug-cross" d="M12 12 58 58M58 12 12 58" />}
  </svg>;
}

function PlumbingOutcomeVisual({ variant }: { variant: "stable" | "chaos" }) {
  const isStable = variant === "stable";
  const target = isStable ? 100 : 67;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const timer = window.setInterval(() => {
      setProgress(current => {
        if (current >= target) {
          window.clearInterval(timer);
          return current;
        }
        const increment = isStable ? 3 : current < 45 ? 3 : 1;
        return Math.min(target, current + increment);
      });
    }, isStable ? 75 : 95);
    return () => window.clearInterval(timer);
  }, [isStable, target]);

  const reachedTarget = progress >= target;
  const buildStatus = isStable ? progress >= 58 ? "PASS" : progress >= 25 ? "TESTING" : "BUILDING" : progress >= 34 ? "PASS" : progress >= 25 ? "TESTING" : "BUILDING";
  const releaseStatus = isStable ? reachedTarget ? "LIVE" : progress >= 58 ? "DEPLOYING" : "WAITING" : reachedTarget ? "REWORK" : progress >= 45 ? "BUGS" : "WAITING";
  const reviewStatus = isStable ? reachedTarget ? "5 / 5" : "PENDING" : reachedTarget ? "1.8 / 5" : "PENDING";
  const progressCaption = isStable ? reachedTarget ? "Production deployment" : progress >= 58 ? "Build → deploy" : progress >= 25 ? "Running tests" : "Building" : reachedTarget ? "Stalled by bug rework" : progress >= 45 ? "Bug triage" : progress >= 25 ? "Running tests" : "Building";

  return <div className={`plumbing-outcome plumbing-outcome-${variant}`} aria-label={isStable ? "Delivery reached production with positive reviews" : "Delivery stalled at sixty-seven percent because bugs created rework"}>
    <div className="plumbing-outcome-head"><span>DELIVERY TRACK</span><strong>{progress}%</strong></div>
    <div className="plumbing-progress-track"><span className="plumbing-progress-fill" style={{ width: `${progress}%` }} />{!isStable && <span className="plumbing-progress-rework" />}</div>
    <div className="plumbing-progress-caption"><span>{progressCaption}</span><strong>{isStable ? reachedTarget ? "PRODUCTION" : progress >= 58 ? "DEPLOYING" : progress >= 25 ? "TESTING" : "BUILDING" : reachedTarget ? "STRETCHED" : progress >= 45 ? "REWORK" : progress >= 25 ? "TESTING" : "BUILDING"}</strong></div>
    <div className="plumbing-outcome-events" aria-label="Delivery checkpoints">
      <span className="plumbing-outcome-event"><i /> <span>Build + tests</span><strong>{buildStatus}</strong></span>
      <span className="plumbing-outcome-event"><i /> <span>{isStable ? "Deploy to production" : "Bug triage"}</span><strong>{releaseStatus}</strong></span>
      <span className="plumbing-outcome-event"><i /> <span>{isStable ? "User review" : "Customer reviews"}</span><strong>{reviewStatus}</strong></span>
    </div>
  </div>;
}

function PlumbingFeedback({ variant }: { variant: "stable" | "chaos" }) {
  const isStable = variant === "stable";

  return <div className={`plumbing-feedback plumbing-feedback-${variant}`} aria-label={isStable ? "Manager message and positive customer review" : "Angry manager message and negative customer review"}>
    <article className="plumbing-feedback-card plumbing-feedback-manager">
      <div className="plumbing-manager-message"><span className="plumbing-feedback-avatar"><img src="/images/manager-assignment-avatar.png" alt="" /></span><div className="plumbing-manager-bubble"><small>MESSAGE FROM MANAGER</small><strong>{isStable ? "Good job — shipped cleanly." : "This still isn't ready."}</strong><p>{isStable ? "The handoff was clear and the release landed without surprises." : "Why are customers still waiting? We need to fix the rework before release."}</p></div></div>
    </article>
    <article className="plumbing-feedback-card plumbing-feedback-review">
      <div className="plumbing-feedback-head"><span className="plumbing-feedback-rating">{isStable ? "★★★★★" : "★☆☆☆☆"}</span><span><small>APP STORE REVIEW</small><strong>{isStable ? "Homeowner in Toronto" : "Homeowner in Toronto"}</strong></span></div>
      <div className="plumbing-app-review-meta"><span>{isStable ? "5.0" : "1.8"} · {isStable ? "Version 1.0" : "Version 0.3"}</span><span>{isStable ? "2 days ago" : "2 days ago"}</span></div>
      <p>“{isStable ? "The assistant understood my issue and got me to the right local team." : "The booking promise did not hold. I had to call again."}”</p>
    </article>
  </div>;
}

function ReviewOutcomeVisual({ scenarioId, variant }: { scenarioId: GuardrailScenarioId; variant: OutcomeVisualVariant }) {
  if (scenarioId === "plumbing-assistant") return <PlumbingOutcomeVisual variant={variant === "stable" ? "stable" : "chaos"} />;

  const isBugFix = scenarioId === "bug-fix";
  const isCodeReview = scenarioId === "code-review";
  const signalLabel = isBugFix ? "Errors / min" : isCodeReview ? "Review risk" : "Release risk";
  const chartPath = variant === "stable" ? "M8 25 C35 20 68 22 101 24 S122 25 132 27 L143 84 C169 85 205 85 242 85" : "M8 78 C24 41 35 84 51 57 S70 87 86 48 S105 76 121 39 S142 82 158 53 S180 72 196 36 S220 66 242 28";
  const caption = variant === "stable" ? isBugFix ? "Duplicate invoices stopped" : isCodeReview ? "Release risk bounded" : "Verified path holding" : variant === "chaos" ? isBugFix ? "New failure modes appearing" : isCodeReview ? "Review risks appearing" : "Exceptions multiplying" : "No unsafe action released";

  return <div className={`outcome-visual outcome-visual-${variant}`} aria-label={caption}>
    <div className="outcome-visual-head"><span><i className="outcome-signal-dot" />LIVE SIGNAL</span><strong>{signalLabel}</strong></div>
    <div className="outcome-chart"><svg viewBox="0 0 250 100" role="img" aria-label={`${signalLabel} chart`}><path className="outcome-chart-grid" d="M8 20H242M8 50H242M8 80H242" /><path className="outcome-chart-line" d={chartPath} /></svg></div>
    {variant === "stable" && isBugFix && <span className="outcome-dead-bug"><BugIcon dead /></span>}
    {variant === "chaos" && <div className="outcome-bug-swarm"><span><BugIcon kind="tiny" /></span><span><BugIcon kind="round" /></span><span><BugIcon kind="winged" /></span><span><BugIcon kind="long" /></span><span><BugIcon kind="tiny" /></span></div>}
    {variant === "blocked" && <span className="outcome-blocked-mark"><ShieldCheck size={24} /></span>}
    <span className="outcome-visual-caption">{caption}</span>
  </div>;
}

function Architecture() {
  const [scenarioId, setScenarioId] = useState<GuardrailScenarioId>("bug-fix");
  const [owner, setOwner] = useState<ReviewOwner>("andrei");
  const [activePhase, setActivePhase] = useState(-1);
  const [runId, setRunId] = useState(0);
  const [view, setView] = useState<ArchitectureView>("contract");
  const scenario = guardrailScenarios.find(item => item.id === scenarioId) ?? guardrailScenarios[0];
  const review = scenario.reviews[owner];
  const completionPhase = review.blockedStep ?? review.steps.length - 1;
  const isRunning = activePhase >= 0 && activePhase <= completionPhase;
  const isComplete = activePhase > completionPhase;

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setTimeout(() => {
      setActivePhase(current => current >= completionPhase ? completionPhase + 1 : current + 1);
    }, 760);
    return () => window.clearTimeout(timer);
  }, [activePhase, completionPhase, isRunning, runId]);

  const chooseScenario = (id: GuardrailScenarioId) => {
    setScenarioId(id);
    setActivePhase(-1);
  };

  const chooseOwner = (nextOwner: ReviewOwner) => {
    setOwner(nextOwner);
    setActivePhase(-1);
  };

  const runScenario = () => {
    setActivePhase(0);
    setRunId(value => value + 1);
  };

  return <section className="architecture-section" id="architecture">
    <div className="architecture-mode-switcher" role="group" aria-label="Choose an interactive architecture experience">
      <span>Explore the method</span>
      <button className={view === "contract" ? "selected" : ""} aria-pressed={view === "contract"} onClick={() => setView("contract")}><ShieldCheck size={15} />Architecture walkthrough</button>
      <button className={view === "goat" ? "selected goat-selected" : ""} aria-pressed={view === "goat"} onClick={() => setView("goat")}><WandSparkles size={15} />Try the puzzle</button>
    </div>
    {view === "goat" ? <GoatMode /> : <>
      <div className="architecture-heading"><div><div className="section-eyebrow"><ShieldCheck size={15} />Architecture walkthrough</div><h2>Review the work.<br /><em>Protect the release.</em></h2></div><div><p>Choose a real engineering task, assign it to an experienced AI architect or a prompt-first shortcut, and watch the consequences unfold.</p><span className="architecture-label">Choose a task · choose the approach · inspect the decisions</span></div></div>
      <div className="architecture-playground">
        <div className="task-assignment" key={scenario.id} aria-live="polite">
          <span className="task-assignment-avatar"><img src="/images/manager-assignment-avatar.png" alt="Engineering manager holding a task checklist" /></span>
          <div className="task-assignment-bubble"><div className="task-assignment-meta"><strong>Engineering manager</strong><span>just now</span></div><span className="task-assignment-kicker"><MessageCircle size={13} />New assignment</span><p><strong>Hey Andrei — a new task just landed.</strong><br />{scenario.assignment}</p></div>
        </div>
        <div className="playground-query"><span className="playground-kicker">TASK IN REVIEW</span><strong>“{scenario.query}”</strong><span className="playground-hint">Choose a task, then run the architecture review.</span><button className="architecture-run-button" onClick={runScenario} disabled={isRunning}><Play size={15} />{isRunning ? "Reviewing…" : isComplete ? "Run again" : "3 · Run architecture review"}</button></div>
        <div className="scenario-switcher" role="group" aria-label="Choose a task to review"><span className="scenario-switcher-label">1 · Choose the task</span>{guardrailScenarios.map((item, index) => <button key={item.id} className={`scenario-option scenario-option-${item.reviews[owner].tone} ${scenario.id === item.id ? "selected" : ""}`} aria-pressed={scenario.id === item.id} onClick={() => chooseScenario(item.id)}><span className="scenario-number">0{index + 1}</span><span>{item.label}</span></button>)}</div>
        <div className="task-owner-picker" role="group" aria-label="Choose who handles the task"><span className="scenario-switcher-label">2 · Assign the task</span><button className={`task-owner-option ${owner === "andrei" ? "selected" : ""}`} aria-pressed={owner === "andrei"} onClick={() => chooseOwner("andrei")}><img src="/images/andrei-tekhtelev-avatar.png" alt="" aria-hidden="true" /><span><strong>Assign to Andrei</strong><small>Senior engineer + AI architect</small></span><Check size={16} aria-hidden="true" /></button><button className={`task-owner-option ${owner === "prompt-only" ? "selected prompt-only" : ""}`} aria-pressed={owner === "prompt-only"} onClick={() => chooseOwner("prompt-only")}><span className="task-owner-icon"><Bot size={18} aria-hidden="true" /></span><span><strong>Assign to another engineer</strong><small>Prompt-first approach · shallow verification</small></span><Sparkles size={16} aria-hidden="true" /></button></div>
      </div>
      <div className={`simulation-status simulation-status-${isRunning || isComplete ? review.tone : "idle"} ${isRunning ? "is-running" : ""}`} aria-live="polite"><span className="simulation-status-dot" />{isComplete ? review.verdict : isRunning ? `RUNNING · ${review.steps[Math.min(activePhase, review.steps.length - 1)].name.toUpperCase()}` : "READY · run the architecture review"}</div>
      <div className={`architecture-flow ${activePhase < 0 ? "architecture-flow-initial" : ""}`} aria-label="Review stages">
        <article className="architecture-step architecture-strategy is-revealed"><span className="step-top"><span>01</span><span className="architecture-strategy-label">Initial strategy</span></span><strong>{review.strategy.title}</strong><p>{review.strategy.body}</p><code>{review.strategy.code}</code></article>
        {activePhase < 0 ? <article className="architecture-question-card" role="status"><span className="architecture-empty-question">?</span><span className="architecture-empty-label">Run the review to reveal the approach</span></article> : <>
          {review.steps.slice(0, Math.min(activePhase + 1, completionPhase + 1)).map((step, index, visibleSteps) => {
            const blocked = review.blockedStep === index && (activePhase >= index || isComplete);
            const processing = isRunning && activePhase === index;
            const passed = activePhase > index && !blocked;
            return <article key={step.name} className={`architecture-step is-revealed ${processing ? "is-processing" : ""} ${passed ? "is-passed" : ""} ${blocked ? "is-blocked" : ""} ${blocked && review.tone === "unverified" ? "is-unverified" : ""}`}><span className="architecture-pulse" aria-hidden="true" /><span className="step-top"><span>0{index + 2}</span>{(!isComplete || index < visibleSteps.length - 1) && <ArrowRight size={18} />}</span><strong>{step.name}</strong><p>{step.body}</p><code>{step.code}</code>{blocked && <span className="step-verdict">{review.tone === "unverified" ? "UNVERIFIED" : "BLOCKED"}</span>}</article>;
          })}
          {!isComplete && <article className="architecture-question-card" role="status"><span className="architecture-empty-question">?</span><span className="architecture-empty-label">Next decision</span></article>}
        </>}
      </div>
      {isComplete && <div className={`review-outcome review-outcome-${review.tone}`} role="status">
        <div className="review-outcome-copy"><span className="section-eyebrow"><ShieldCheck size={14} />{review.outcome.label}</span><h3>{review.outcome.title}</h3><p>{review.outcome.body}</p><div className="review-outcome-metrics">{review.outcome.metrics.map(metric => <span key={metric}>{metric}</span>)}</div></div>
        <ReviewOutcomeVisual scenarioId={scenario.id} variant={review.tone === "safe" ? "stable" : review.tone === "unverified" ? "chaos" : "blocked"} />
        {scenario.id === "plumbing-assistant" && <PlumbingFeedback variant={review.tone === "safe" ? "stable" : "chaos"} />}
      </div>}
    </>}
  </section>;
}

export default function Home() {
  const [activeId, setActiveId] = useState(DEFAULT_PROJECT_ID);
  const [device, setDevice] = useState<DevicePreview>("iphone");
  const [appPath, setAppPath] = useState("/login");
  const [progress, setProgress] = useState(0);
  const project = projectById(activeId);
  const focusLivePreview = useCallback(() => {
    document.querySelector<HTMLIFrameElement>(".connected-preview-frame")?.focus();
  }, []);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? window.scrollY / max : 0);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);
  const chooseProject = (id: string) => { setActiveId(id); setAppPath("/login"); };
  const explore = (id = activeId) => { chooseProject(id); document.getElementById("workspace")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); };
  return <main className="site-shell" id="top">
    <a className="skip-link" href="#workspace">Skip to the live projects</a>
    <div className="reading-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
    <header className="site-header"><a className="wordmark" href="#top"><img className="wordmark-photo" src="/images/andrei-tekhtelev-avatar.png" alt="Andrei Tekhtelev" /><span>ANDREI<br /><b>TEKHTELEV</b></span></a><span className="header-role">FULL-STACK ENGINEER <b>×</b> AI PRACTITIONER <b>×</b> PRODUCT OWNER</span><nav className="header-contact" aria-label="Contact links"><a href={contactUrl} target="_blank" rel="noreferrer" aria-label="LinkedIn" title="LinkedIn"><Linkedin size={21} strokeWidth={2.1} aria-hidden="true" /><span>LinkedIn</span></a><a href={githubUrl} target="_blank" rel="noreferrer" aria-label="GitHub" title="GitHub"><Github size={21} strokeWidth={2.1} aria-hidden="true" /><span>GitHub</span></a></nav></header>
    <section className="intro" aria-labelledby="hero-title"><div className="intro-main"><div className="section-eyebrow">Products for real decisions</div><h1 id="hero-title">Work that holds<br /><em>up to <a className="question-link" href="#guide">questions<span className="hero-tooltip">Ask about ownership, trade-offs or verification <ArrowUpRight size={14} /></span></a>.</em></h1><p className="hero-description">Three live products for moments when the next step matters: plan a home project, take control of your budget, or make Parliament easier to navigate.</p><div className="hero-actions"><button className="hero-primary" onClick={() => explore()}><span>Start with a live product</span><ArrowRight size={18} /></button><a className="hero-secondary" href="#guide"><span>Ask the guide what changed</span><ArrowUpRight size={17} /></a></div><p className="hero-note">Click through a real workflow, then inspect the decisions behind it.</p></div><div className="hero-stats"><span className="section-eyebrow">Choose your next move</span><button onClick={() => explore("hoc-v2")}><span className="stat-symbol" aria-hidden="true"><Smartphone size={26} /></span><span><strong>Live applications</strong><small>Start with a real workflow, not a slide.</small></span></button><button onClick={() => { setDevice("ipad"); explore(); }}><span className="stat-symbol" aria-hidden="true"><Code2 size={26} /></span><span><strong>Source platforms</strong><small>See the thinking adapt: iPhone · iPad · Android · Web</small></span></button><a href="#architecture"><span className="stat-symbol"><ShieldCheck size={26} /></span><span><strong>AI with guardrails</strong><small>Trace the evidence, trade-offs and boundaries.</small></span></a></div></section>
    <section className="workspace-section" id="workspace" aria-labelledby="lab-heading"><div className="workspace-section-heading"><div><div className="section-eyebrow"><Layers3 size={14} />Hands-on, not a slideshow</div><h2 id="lab-heading">Pick an application. <em>Make it yours.</em></h2></div></div>
      <nav className="project-rail" aria-label="Choose a live project">{projects.map(item => <button key={item.id} aria-pressed={activeId === item.id} onClick={() => chooseProject(item.id)}><ProjectLogo id={item.id} /><span className="project-copy"><strong>{item.name}</strong><small>{item.summary}</small></span></button>)}</nav>
      <div className="workspace"><section className="workbench" aria-label="Live application preview"><ConnectedSourcePreview project={project} device={device} onDeviceChange={setDevice} onNavigate={setAppPath} /></section><GuidePanel project={project} appPath={appPath} onCoreFlow={focusLivePreview} /></div>
    </section>
    <Architecture />
    <section className="case-study"><div><div className="section-eyebrow">A closer look</div><h2>Don’t just take my <em>word</em> for it.</h2></div><div className="case-grid"><article><Code2 size={22} /><h3>Explore the work</h3><p>Try the live products and see how each workflow turns a real question into a useful next step.</p></article><article><ShieldCheck size={22} /><h3>Know the boundary</h3><p>The guide distinguishes documented facts from claims that still need evidence.</p></article><article><MessageCircle size={22} /><h3>Have a conversation</h3><p>Want to discuss a system, a team or a role? <a href={contactUrl} target="_blank" rel="noreferrer">Message me on LinkedIn</a>, email me or give me a call.</p></article></div></section>
    <footer className="site-footer"><span>© 2026 Andrei Tekhtelev</span><span>Real products. Visible decisions.</span></footer>
  </main>;
}

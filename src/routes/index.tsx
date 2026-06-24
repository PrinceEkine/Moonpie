import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Heart,
  Film,
  Video,
  Sparkles,
  Play,
  Pause,
  Copy,
  Check,
  Send,
  Palette,
  Volume2,
  Smile,
  ChevronRight,
  Tv,
  MessageCircle,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";

// Define interactive background themes
type ThemeKey = "midnight" | "sunset" | "emerald" | "cinema";

interface ThemeConfig {
  name: string;
  badge: string;
  bgClass: string;
  primaryColor: string;
  accentGradient: string;
  pillsClass: string;
  quote: string;
}

const THEMES: Record<ThemeKey, ThemeConfig> = {
  midnight: {
    name: "Midnight Romance",
    badge: "Cosmic Glow",
    bgClass: "bg-[#0b0813] text-[#f3eeea]",
    primaryColor: "#ef4444",
    accentGradient:
      "[background-image:radial-gradient(circle_at_15%_20%,oklch(0.6_0.22_15/0.25),transparent_40%),radial-gradient(circle_at_85%_70%,oklch(0.5_0.18_0/0.3),transparent_45%)]",
    pillsClass: "border-red-500/30 bg-red-500/10 text-red-300",
    quote: "Counting stars and sharing scenes, infinite leagues away.",
  },
  sunset: {
    name: "Golden Hour Sunset",
    badge: "Warm Twilight",
    bgClass: "bg-[#0f0811] text-[#fff5eb]",
    primaryColor: "#f43f5e",
    accentGradient:
      "[background-image:radial-gradient(circle_at_15%_20%,oklch(0.65_0.23_15/0.25),transparent_40%),radial-gradient(circle_at_85%_70%,oklch(0.55_0.16_60/0.45),transparent_45%)]",
    pillsClass: "border-pink-500/30 bg-pink-500/10 text-pink-300",
    quote: "A twilight sky, your quiet laughter, closer than the horizon.",
  },
  emerald: {
    name: "Emerald Forest",
    badge: "Northern Lights",
    bgClass: "bg-[#060c09] text-[#eefaf4]",
    primaryColor: "#10b981",
    accentGradient:
      "[background-image:radial-gradient(circle_at_20%_20%,oklch(0.62_0.18_160/0.22),transparent_40%),radial-gradient(circle_at_80%_80%,oklch(0.52_0.15_200/0.32),transparent_45%)]",
    pillsClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    quote: "Deep woods, a silent cabin, and a cozy cinematic light.",
  },
  cinema: {
    name: "Retro Golden Era",
    badge: "Old School Noir",
    bgClass: "bg-[#0d0d0e] text-[#faf6ee]",
    primaryColor: "#eab308",
    accentGradient:
      "[background-image:radial-gradient(circle_at_15%_30%,oklch(0.6_0.15_80/0.18),transparent_40%),radial-gradient(circle_at_85%_65%,oklch(0.4_0.12_40/0.25),transparent_45%)]",
    pillsClass: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    quote: "Vibrant neon, buttery popcorn, and golden screen projections.",
  },
};

interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  size: number;
}

interface InteractiveBubble {
  id: number;
  sender: "you" | "partner";
  text: string;
  isReaction?: boolean;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Moonpie — watch movies together, apart" },
      {
        name: "description",
        content:
          "A private little cinema for two. Press play in sync, see each other's face, hold each other's attention.",
      },
      { property: "og:title", content: "Moonpie — watch movies together, apart" },
      { property: "og:description", content: "A private little cinema for two." },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [joinId, setJoinId] = useState("");
  const [activeTheme, setActiveTheme] = useState<ThemeKey>("midnight");
  const [clickedHearts, setClickedHearts] = useState<Particle[]>([]);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      toast.success("Successfully logged out of your cinema seat.");
    } catch (err) {
      toast.error("Failed to log out.");
    }
  };

  // Interactive mock simulation states
  const [simPlaying, setSimPlaying] = useState(false);
  const [simProgress, setSimProgress] = useState(35);
  const [simReactions, setSimReactions] = useState<Particle[]>([]);
  const [simChat, setSimChat] = useState<InteractiveBubble[]>([
    { id: 1, sender: "partner", text: "Look at this shot! It's stunning..." },
    { id: 2, sender: "you", text: "I'm literally holding my breath!" },
  ]);
  const [typedMessage, setTypedMessage] = useState("");
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Love invite card generator state
  const [inviterName, setInviterName] = useState("");
  const [loverName, setLoverName] = useState("");
  const [customMsg, setCustomMsg] = useState("Let's watch a movie together tonight?");
  const [inviteRoomId] = useState(() => Math.random().toString(36).slice(2, 8));
  const [inviteCopied, setInviteCopied] = useState(false);
  const [isEnvelopeUnsealed, setIsEnvelopeUnsealed] = useState(false);

  // Generate a random background room code
  const currentTheme = THEMES[activeTheme];

  // Particle cleanups
  useEffect(() => {
    if (clickedHearts.length > 0) {
      const timer = setTimeout(() => {
        setClickedHearts((prev) => prev.slice(1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [clickedHearts]);

  useEffect(() => {
    if (simReactions.length > 0) {
      const timer = setTimeout(() => {
        setSimReactions((prev) => prev.filter((p) => Date.now() - p.id < 1500));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [simReactions]);

  // Simulated playhead progress logic
  useEffect(() => {
    if (simPlaying) {
      simIntervalRef.current = setInterval(() => {
        setSimProgress((p) => (p >= 100 ? 0 : p + 0.4));
      }, 100);
    } else {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    }
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [simPlaying]);

  // Automated gentle partner chatting inside mockup to feel organic
  useEffect(() => {
    const chatSequence = [
      { text: "I'm so glad we chose Moonpie ❤️", delay: 9000 },
      { text: "Shall we dim the screen lights?", delay: 18000 },
      { text: "Best movie date ever!", delay: 28000 },
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index < chatSequence.length && simPlaying) {
        const msgText = chatSequence[index].text;
        setSimChat((prev) => [...prev, { id: Date.now(), sender: "partner", text: msgText }]);
        // Trigger virtual floating reaction occasionally
        triggerSimReaction("💖");
        index++;
      }
    }, 11000);

    return () => clearInterval(interval);
  }, [simPlaying]);

  function makeRoom() {
    const id = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
    navigate({ to: "/room/$roomId", params: { roomId: id } });
  }

  function joinRoom(e: React.FormEvent) {
    e.preventDefault();
    const id = joinId.trim().toLowerCase();
    if (id) {
      navigate({ to: "/room/$roomId", params: { roomId: id } });
    }
  }

  // Handle SPA background page clicks to spawn small reactive love bursts
  function handleBgClick(e: React.MouseEvent<HTMLDivElement>) {
    // Avoid triggering if clicking actionable buttons/inputs
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest("a") ||
      target.closest("form") ||
      target.closest("textarea")
    ) {
      return;
    }

    const emojis = ["❤️", "💖", "🍿", "✨", "💫", "🌟"];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const newHeart: Particle = {
      id: Date.now(),
      emoji: randomEmoji,
      x: e.clientX,
      y: e.clientY,
      size: Math.floor(Math.random() * 12) + 14,
    };

    setClickedHearts((prev) => [...prev, newHeart]);
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(5);
      } catch (_) {
        // ignore vibration failures on unsupported browsers
      }
    }
  }

  // Launch emoji on the simulated cinema screen
  function triggerSimReaction(emoji: string) {
    const id = Date.now() + Math.random();
    const newReaction: Particle = {
      id,
      emoji,
      x: Math.floor(Math.random() * 60) + 20, // percentage from left
      y: Math.floor(Math.random() * 20) + 65, // percentage from top
      size: Math.floor(Math.random() * 10) + 20,
    };
    setSimReactions((prev) => [...prev, newReaction]);

    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(10);
      } catch (_) {
        // ignore vibration failures on unsupported browsers
      }
    }
  }

  // Client chatting inside the mockup
  function handleSimSend(e: React.FormEvent) {
    e.preventDefault();
    if (!typedMessage.trim()) return;

    const userMsg = typedMessage.trim();
    setSimChat((prev) => [...prev, { id: Date.now(), sender: "you", text: userMsg }]);
    setTypedMessage("");

    // Simulate partner reaction shortly after
    setTimeout(() => {
      const responseOptions = [
        "Aww, absolutely!",
        "Hahaha totally agree!",
        "Sending you tons of virtual popcorn! 🍿🍿",
        "Wait, watch this character's smile!",
        "Mmm indeed!",
      ];
      const randomReply = responseOptions[Math.floor(Math.random() * responseOptions.length)];
      setSimChat((prev) => [...prev, { id: Date.now() + 1, sender: "partner", text: randomReply }]);
      triggerSimReaction("✨");
    }, 1800);
  }

  // Invitation link copy action
  function handleCopyInvite() {
    const generatedUrl = `${window.location.origin}/room/${inviteRoomId}`;
    const cleanInviter = inviterName.trim() || "Someone precious";
    const cleanLover = loverName.trim() || "my favorite index";

    const formattedMessage = `💌 For ${cleanLover}:\n\n"${customMsg}"\n\nJoin our private Moonpie screen here:\n🔗 ${generatedUrl}\n\nMeet you in our little cinema. Love, ${cleanInviter} ✨`;

    navigator.clipboard.writeText(formattedMessage);
    setInviteCopied(true);
    toast("💌 Custom invitation copied with your secret link!");

    if ("vibrate" in navigator) {
      try {
        navigator.vibrate([15, 30, 15]);
      } catch (_) {
        // ignore vibration failures on unsupported browsers
      }
    }

    setTimeout(() => setInviteCopied(false), 3000);
  }

  const baseVibeVariables: Record<ThemeKey, Record<string, string>> = {
    midnight: {
      "--primary": "#ef4444",
      "--primary-shadow": "rgba(239, 68, 68, 0.25)",
    },
    sunset: {
      "--primary": "#f43f5e",
      "--primary-shadow": "rgba(244, 63, 94, 0.25)",
    },
    emerald: {
      "--primary": "#10b981",
      "--primary-shadow": "rgba(16, 185, 129, 0.25)",
    },
    cinema: {
      "--primary": "#eab308",
      "--primary-shadow": "rgba(234, 179, 8, 0.25)",
    },
  };

  return (
    <div
      onClick={handleBgClick}
      className={`relative min-h-screen overflow-x-hidden transition-colors duration-1000 ${currentTheme.bgClass}`}
      style={baseVibeVariables[activeTheme]}
    >
      {/* Background radial soft light gradient */}
      <div
        className={`pointer-events-none absolute inset-0 opacity-45 transition-all duration-1000 ${currentTheme.accentGradient}`}
      />

      {/* Raining custom interactive hearts overlay */}
      {clickedHearts.map((h) => (
        <span
          key={h.id}
          style={{
            left: h.x - h.size / 2,
            top: h.y - h.size / 2,
            fontSize: `${h.size}px`,
          }}
          className="pointer-events-none fixed z-50 animate-[floatUp_0.8s_ease-out_forwards]"
        >
          {h.emoji}
        </span>
      ))}

      {/* Header bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12 backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <Heart className="size-5 fill-primary text-primary animate-pulse" />
          <span className="font-serif text-2xl font-semibold tracking-wide">Moonpie</span>
        </div>

        {/* Theme Swapper Bar */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 rounded-full border border-border bg-card/65 px-3 py-1.5 md:flex">
            <Palette className="size-3.5 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">
              Vibes:
            </span>
            {(Object.keys(THEMES) as ThemeKey[]).map((themeKey) => (
              <button
                key={themeKey}
                onClick={() => {
                  setActiveTheme(themeKey);
                  toast(`Atmosphere changed to ${THEMES[themeKey].name}!`);
                  if ("vibrate" in navigator) navigator.vibrate(10);
                }}
                className={`relative px-2.5 py-0.5 text-xs rounded-full transition-all ${
                  activeTheme === themeKey
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm scale-105"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {themeKey.toUpperCase()}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleSignOut}
            className="rounded-full border-border bg-card/40 backdrop-blur text-muted-foreground hover:text-foreground hover:bg-destructive/10 h-8 px-3 text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <LogOut className="size-3.5" />
            <span>Leave Seat</span>
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pt-10 pb-24 text-center md:pt-16">
        {/* Small Tagline Pill */}
        <span
          className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.18em] transition-all duration-1000 ${currentTheme.pillsClass}`}
        >
          <Sparkles className="size-3.5" /> {currentTheme.badge}
        </span>

        {/* Dynamic Header */}
        <h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-foreground md:text-7xl">
          Watch the same scene,
          <br />
          <span className="italic text-primary selection:bg-pink-300">in the same breath.</span>
        </h1>

        <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg leading-relaxed">
          The ultimate screen companion for hearts living apart. Sync film overlays, smile side by
          side, and whisper reactions — from across the ocean.
        </p>

        {/* Room Launch & Join Section */}
        <div className="mt-10 flex w-full max-w-md flex-col gap-4">
          <Button
            size="lg"
            onClick={makeRoom}
            className="h-14 rounded-full text-base font-medium shadow-[0_8px_40px_-12px_oklch(0.7_0.18_25/0.6)] cursor-pointer bg-primary text-primary-foreground hover:brightness-110 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
          >
            <Heart className="size-4.5 fill-current animate-[heartBeat_1.2s_infinite]" />
            Start a custom date room
          </Button>

          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border/60" />
            or join one
            <div className="h-px flex-1 bg-border/60" />
          </div>

          <form onSubmit={joinRoom} className="flex gap-2">
            <Input
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              placeholder="Enter date room code"
              className="h-12 rounded-full border-border bg-card/65 text-center text-base tracking-wider placeholder:text-muted-foreground/50 transition-all focus:ring-2 focus:ring-primary/40"
            />
            <Button
              type="submit"
              variant="secondary"
              className="h-12 rounded-full px-6 transition-all hover:bg-muted active:scale-95"
            >
              Join
            </Button>
          </form>
        </div>

        {/* --- INTERACTIVE MODULE 1: MOBILE ATTACHED SWITCHER (VIBE PANEL) --- */}
        <div className="mt-6 flex flex-wrap gap-2 justify-center md:hidden">
          {(Object.keys(THEMES) as ThemeKey[]).map((themeKey) => (
            <button
              key={themeKey}
              onClick={() => {
                setActiveTheme(themeKey);
                toast(`Ambience: ${THEMES[themeKey].name}`);
                if ("vibrate" in navigator) navigator.vibrate(8);
              }}
              className={`px-3 py-1 text-xs rounded-full transition-all ${
                activeTheme === themeKey
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-card/40 text-muted-foreground border border-border/40"
              }`}
            >
              {THEMES[themeKey].name.split(" ")[0]}
            </button>
          ))}
        </div>

        {/* --- INTERACTIVE MODULE 2: LIVE SIMULATED KINO PLAYER (THE PLAYGROUND) --- */}
        <section
          id="cinema-preview"
          className="mt-20 w-full max-w-4xl text-left bg-card/45 backdrop-blur-md rounded-3xl border border-border/80 p-4 md:p-6 shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />

          <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
                Interactive Live Simulation
              </span>
              <h2 className="font-serif text-2xl text-foreground">Moonpie Cinema Demonstration</h2>
              <p className="text-xs text-muted-foreground">
                Interact with media timeline and widgets below to feel the flawless synchronization
                engine.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs text-emerald-400 font-mono tracking-tight bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                You & Partner Connected
              </span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[1fr_300px]">
            {/* The Cinema Stream Screen container */}
            <div className="relative">
              {/* Virtual stream screen */}
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black shadow-inner flex flex-col justify-end">
                {/* Simulated Floating reactions rising */}
                {simReactions.map((reac) => (
                  <span
                    key={reac.id}
                    style={{
                      left: `${reac.x}%`,
                      bottom: `${reac.y}%`,
                      fontSize: `${reac.size}px`,
                    }}
                    className="absolute pointer-events-none z-30 animate-[simRiseReaction_1.4s_cubic-bezier(0.25,1,0.5,1)_forwards] drop-shadow-md select-none"
                  >
                    {reac.emoji}
                  </span>
                ))}

                {/* Abstract graphic to act as live video */}
                <div className="absolute inset-0 z-0">
                  <div
                    className={`w-full h-full absolute transition-opacity duration-1000 ${simPlaying ? "opacity-100" : "opacity-35"}`}
                  >
                    {/* Animated starfield/sunset graphic depends on theme */}
                    <div className="w-full h-full bg-slate-950 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-x-0 bottom-0 top-[20%] bg-radial-gradient from-violet-950/40 to-transparent" />

                      {/* Interactive graphic elements inside mockup screen */}
                      <div
                        style={{
                          transform: simPlaying
                            ? `rotate(${simProgress * 3.6}deg)`
                            : "rotate(0deg)",
                        }}
                        className="w-48 h-48 rounded-full border border-dashed border-primary/25 absolute -bottom-10 opacity-60 transition-transform duration-300"
                      />
                      <div className="w-24 h-24 rounded-full bg-radial-gradient from-pink-500/10 to-transparent absolute top-10 left-12 animate-pulse" />

                      {/* Floating glowing moon */}
                      <div className="absolute right-12 top-6 flex flex-col items-center gap-1">
                        <div className="size-10 rounded-full bg-[#fdfaf2] shadow-[0_0_20px_#fff9e3,inset_-4px_-10px_0_0_#eae2ce] transition-all" />
                        <span className="text-[7px] text-[#fdfaf2]/50 font-mono italic">
                          Moonpie Peak
                        </span>
                      </div>
                    </div>
                  </div>

                  {!simPlaying && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 backdrop-blur-xs text-center p-4">
                      <div className="size-12 rounded-full border border-border bg-card/85 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-300 shadow-md">
                        <Play className="size-5 fill-current ml-1" />
                      </div>
                      <span className="mt-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        Both screens paused
                      </span>
                    </div>
                  )}
                </div>

                {/* Simulated Webcam feeds floating overlay */}
                <div className="absolute top-3 left-3 flex gap-2 z-20">
                  <div
                    onClick={() => {
                      triggerSimReaction("❤️");
                      toast("You blew a heart kiss!");
                    }}
                    className="size-11 rounded-xl bg-orange-500/20 border border-orange-500/40 backdrop-blur-md overflow-hidden flex items-center justify-center relative shadow-lg cursor-pointer group/cam"
                  >
                    <span className="text-[10px] font-semibold text-orange-200">YOU</span>
                    <Heart className="size-3 fill-orange-500 text-orange-400 absolute bottom-1 right-1 opacity-0 group-hover/cam:opacity-100 transition-opacity" />
                  </div>

                  <div
                    onClick={() => {
                      triggerSimReaction("🍿");
                      toast("Your love shared popcorn!");
                    }}
                    className="size-11 rounded-xl bg-primary/20 border border-primary/40 backdrop-blur-md overflow-hidden flex items-center justify-center relative shadow-lg cursor-pointer group/partner animate-pulse"
                  >
                    <span className="text-[10px] font-semibold text-primary">LOVE</span>
                    <Smile className="size-3 text-primary absolute bottom-1 right-1 opacity-100 group-hover/partner:scale-110 transition-transform" />
                  </div>
                </div>

                {/* Simulated overlay synced pill */}
                {simPlaying && (
                  <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-emerald-500 text-[10px] font-semibold text-white px-2 py-0.5 shadow-md animate-bounce">
                    <Check className="size-3" /> Synced Live
                  </div>
                )}

                {/* Controls and duration bar overlay */}
                <div className="relative z-10 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col gap-1.5 w-full">
                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                    <span>
                      {Math.floor(simProgress / 10)
                        .toString()
                        .padStart(2, "0")}
                      :{(Math.floor(simProgress * 6) % 60).toString().padStart(2, "0")}
                    </span>
                    <span className="text-primary italic">Now synchronizing...</span>
                    <span>10:00</span>
                  </div>

                  {/* Playhead slider */}
                  <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden cursor-pointer">
                    <div
                      style={{ width: `${simProgress}%` }}
                      className="h-full bg-primary relative transition-all"
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 size-2.5 rounded-full bg-white shadow-md" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/5">
                    <button
                      onClick={() => {
                        setSimPlaying(!simPlaying);
                        toast(simPlaying ? "Paused cinema stream." : "Co-video initiated!");
                      }}
                      className="text-white hover:text-primary transition-colors flex items-center gap-1"
                    >
                      {simPlaying ? (
                        <Pause className="size-4.5 fill-current" />
                      ) : (
                        <Play className="size-4.5 fill-current" />
                      )}
                      <span className="text-xs font-medium">{simPlaying ? "Pause" : "Play"}</span>
                    </button>

                    {/* Quick Reactions bar */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-zinc-400 uppercase tracking-wider mr-1">
                        Reactions:
                      </span>
                      {["❤️", "🍿", "😭", "😮", "✨"].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => triggerSimReaction(emoji)}
                          className="hover:scale-130 transition-transform px-1 cursor-pointer select-none text-sm"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Chat columns representation */}
            <div className="flex min-h-[300px] flex-col rounded-2xl border border-border/80 bg-background/50 overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5 bg-card/30">
                <span className="font-serif text-[11px] tracking-wide text-muted-foreground uppercase flex items-center gap-1.5">
                  <MessageCircle className="size-3 text-primary" /> Live Date Whispers
                </span>
                <span className="text-[9px] font-mono text-primary/8s bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  Encrypted
                </span>
              </div>

              {/* Chat screen lists */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
                {simChat.map((bub) => (
                  <div
                    key={bub.id}
                    className={`flex flex-col max-w-[85%] ${
                      bub.sender === "you" ? "ml-auto items-end" : "mr-auto items-start"
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-3 py-2 leading-relaxed ${
                        bub.sender === "you"
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-muted text-foreground rounded-tl-none border border-border/40"
                      }`}
                    >
                      {bub.text}
                    </div>
                    <span className="text-[8px] text-muted-foreground/60 mt-0.5 px-1 uppercase tracking-widest font-mono">
                      {bub.sender === "you" ? "you" : "love"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Chat action form */}
              <form
                onSubmit={handleSimSend}
                className="p-2 border-t border-border/60 bg-card/25 flex gap-1.5"
              >
                <Input
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  placeholder="Whisper message..."
                  className="h-8.5 rounded-full border-border bg-background/80 text-xs text-base md:text-xs"
                />
                <Button type="submit" size="icon" className="h-8.5 w-8.5 rounded-full shrink-0">
                  <Send className="size-3.5" />
                </Button>
              </form>
            </div>
          </div>
        </section>

        {/* --- INTERACTIVE MODULE 3: PERSORTINAL / CUSTOM SEAD CARD INVIATION GENERATOR --- */}
        <section className="mt-24 w-full max-w-xl text-left bg-card/30 backdrop-blur-lg border border-border/60 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="size-5 text-primary fill-primary/30" />
            <h3 className="font-serif text-xl text-foreground">Design a Sealed Date Invite</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-6">
            Input names below to assemble a beautiful custom date message with a pre-configured
            Moonpie room, ready to invite your sweetheart.
          </p>

          <div className="grid gap-4 md:grid-cols-2 mb-4">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Your Name
              </label>
              <Input
                value={inviterName}
                onChange={(e) => setInviterName(e.target.value)}
                placeholder="E.g., Jack"
                className="h-10 rounded-xl input-primary text-base md:text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Your Partner's Name
              </label>
              <Input
                value={loverName}
                onChange={(e) => setLoverName(e.target.value)}
                placeholder="E.g., Rose"
                className="h-10 rounded-xl input-primary text-base md:text-sm"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Invitation Whisper Message
            </label>
            <Input
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              placeholder="What do you want to tell them?"
              className="h-11 rounded-xl input-primary text-base md:text-sm"
            />
          </div>

          {/* Envelope interaction mockup card */}
          <div className="relative border border-dashed border-primary/20 rounded-2xl bg-card/85 p-5 min-h-[140px] flex flex-col justify-between overflow-hidden shadow-inner group">
            <div className="absolute -top-10 -right-10 size-24 rounded-full bg-primary/5 group-hover:scale-150 transition-transform duration-700" />

            <div className="flex items-start justify-between z-10">
              <div>
                <span className="text-[9px] font-mono text-primary tracking-widest uppercase block mb-1">
                  Preview Invitation
                </span>
                <p className="font-serif text-base text-card-foreground italic leading-relaxed">
                  " {customMsg || "Let's watch a movie tonight?"} "
                </p>
              </div>
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary self-start shrink-0">
                <Heart className="size-4 fill-current" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground z-10">
              <span className="font-mono text-[10px]">
                Target: {loverName.trim() || "(Partner Name)"}
              </span>
              <Button
                onClick={handleCopyInvite}
                size="sm"
                className="rounded-full bg-primary leading-none text-primary-foreground font-semibold flex items-center gap-1.5 text-xs h-8 px-4"
              >
                {inviteCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {inviteCopied ? "Copied!" : "Lock Invite Link"}
              </Button>
            </div>
          </div>
        </section>

        {/* Dynamic quote of active theme */}
        <p className="mt-12 text-xs text-muted-foreground/80 font-serif italic max-w-md transition-all duration-1000">
          "{currentTheme.quote}"
        </p>

        {/* Feature section */}
        <section id="how" className="mt-28 grid w-full gap-6 text-left md:grid-cols-3">
          {[
            {
              icon: Heart,
              title: "Make a date",
              body: "Create your private sanctuary in one click. Customize the ambience color palette to match your mood.",
            },
            {
              icon: Tv,
              title: "Cozy Sync Player",
              body: "Paste streaming links. When either of you hits pause or seek, both players move together instantly.",
            },
            {
              icon: Video,
              title: "True Presence Live",
              body: "Integrated crystal clear video and voice streams sit snugly beside the player window, keeping you close.",
            },
          ].map((step, i) => (
            <div
              key={i}
              className="group rounded-3xl border border-border/80 bg-card/45 p-6 backdrop-blur transition-all duration-300 hover:border-primary/45 hover:-translate-y-1"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary transition-transform group-hover:scale-110">
                <step.icon className="size-5" />
              </div>
              <h3 className="mb-2 text-xl font-medium text-foreground">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="relative z-10 pb-8 text-center text-xs text-muted-foreground/60">
        Created with{" "}
        <Heart className="inline size-3.5 fill-primary text-primary animate-[heartBeat_1.6s_infinite]" />{" "}
        for hearts bridging distances.
      </footer>

      {/* Styled Animations sheet */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0.6);
            opacity: 0;
          }
          10% {
            opacity: 0.95;
            transform: translateY(-10px) scale(1.1);
          }
          100% {
            transform: translateY(-120px) scale(0.7);
            opacity: 0;
          }
        }
        @keyframes simRiseReaction {
          0% {
            transform: translateY(0) scale(0.5);
            opacity: 0;
          }
          15% {
            opacity: 1;
            transform: translateY(-15px) scale(1.2);
          }
          100% {
            transform: translateY(-130px) translateX(var(--drift, 10px)) rotate(12deg);
            opacity: 0;
          }
        }
        @keyframes heartBeat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
      `}</style>
    </div>
  );
}

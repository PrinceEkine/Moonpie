import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Heart,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Send,
  Link as LinkIcon,
  Play,
  Pause,
  Film,
  Check,
  MonitorUp,
  Moon,
  Sun,
  ListMusic,
  Timer,
  Camera,
  History,
  Dice5,
  CloudRain,
  Flame,
  Building2,
  VolumeX,
  Sparkles,
  Plus,
  Trash2,
  StickyNote,
  X,
  Mic as MicIcon,
  Palette,
  RefreshCw,
  LogOut,
  HeartHandshake,
} from "lucide-react";
import { db, handleFirestoreError, OperationType, auth } from "@/lib/firebase";
import { LoversTheater } from "../components/LoversTheater";
import { CouplesRoom } from "../components/CouplesRoom";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  addDoc,
  getDocs,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/room/$roomId")({
  head: ({ params }) => ({
    meta: [
      { title: `Room ${params.roomId} · Moonpie` },
      { name: "description", content: "A private movie date for two." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Room,
});

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function safeVibrate(pattern: number | number[]): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(pattern);
    } catch (_) {
      // Safely ignore vib errors in sandboxed iframes
    }
  }
}

async function safeCopyText(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      // Safely ignore copy failures
    }
  }
  return false;
}

type ChatMsg = { id: string; from: string; text: string; at: number; reaction?: boolean };
type VoiceMsg = { id: string; from: string; audio: string; at: number };
type QueueItem = { id: string; url: string; title: string };

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

const ROULETTE: QueueItem[] = [
  { id: "r1", url: "https://www.youtube.com/watch?v=zSWdZVtXT7E", title: "Interstellar — Trailer" },
  { id: "r2", url: "https://www.youtube.com/watch?v=LjhCEhWiKXk", title: "La La Land — Trailer" },
  { id: "r3", url: "https://www.youtube.com/watch?v=8hP9D6kZseM", title: "Amélie — Trailer" },
  { id: "r4", url: "https://www.youtube.com/watch?v=2LqzF5WauAw", title: "The Notebook — Trailer" },
  {
    id: "r5",
    url: "https://www.youtube.com/watch?v=d9MyW72ELq0",
    title: "Pride & Prejudice — Trailer",
  },
  {
    id: "r6",
    url: "https://www.youtube.com/watch?v=OtRm6dWqQDc",
    title: "Before Sunrise — Trailer",
  },
];

const REACTION_EMOJIS = ["❤️", "🍿", "🍷", "🔥", "💋", "⭐", "😂", "😢", "🤯"];

type Ambient = "off" | "rain" | "fire" | "city";

const PEER_ICE: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
};

function toEmbed(url: string): { src: string; kind: "iframe" | "video" } | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    // YouTube
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v");
      if (id) return { src: `https://www.youtube.com/embed/${id}?autoplay=0`, kind: "iframe" };
      if (u.pathname.startsWith("/shorts/")) {
        const shortsId = u.pathname.split("/")[2];
        if (shortsId)
          return { src: `https://www.youtube.com/embed/${shortsId}?autoplay=0`, kind: "iframe" };
      }
      if (u.pathname.startsWith("/embed/")) {
        return { src: url, kind: "iframe" };
      }
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) return { src: `https://www.youtube.com/embed/${id}?autoplay=0`, kind: "iframe" };
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return { src: `https://player.vimeo.com/video/${id}`, kind: "iframe" };
    }
    // Direct video
    if (/\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(u.pathname)) {
      return { src: url, kind: "video" };
    }
    // Generic iframe attempt (many streaming sites block this; we still try)
    return { src: url, kind: "iframe" };
  } catch {
    return null;
  }
}

function Room() {
  const { roomId } = Route.useParams();
  const me = useMemo(() => Math.random().toString(36).slice(2, 8), []);
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<"cinema" | "whispers" | "presence">("cinema");
  const [unreadCount, setUnreadCount] = useState(0);

  // Lifted state variables to prevent temporal dead zone (TDZ) for refs accessed before initialization
  const [cuddleMode, setCuddleMode] = useState(false);
  const [loversTheater, setLoversTheater] = useState(false);
  const [couplesRoomActive, setCouplesRoomActive] = useState(false);
  const [warmGlow, setWarmGlow] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ThemeKey>("midnight");
  const [note, setNote] = useState("");
  const [ambient, setAmbient] = useState<Ambient>("off");

  const mobileTabRef = useRef(mobileTab);
  useEffect(() => {
    mobileTabRef.current = mobileTab;
  }, [mobileTab]);

  useEffect(() => {
    if (mobileTab === "whispers") {
      setUnreadCount(0);
    }
  }, [mobileTab]);

  // Draggable PiP state
  const [pipPos, setPipPos] = useState({ x: 0, y: 0 });
  const [hasPositionedPip, setHasPositionedPip] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const pipStartPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!hasPositionedPip && typeof window !== "undefined" && window.innerWidth > 0) {
      setPipPos({ x: window.innerWidth - 110, y: window.innerHeight - 260 });
      setHasPositionedPip(true);
    }
  }, [hasPositionedPip]);

  const handleDragStart = (clientX: number, clientY: number) => {
    dragStartRef.current = { x: clientX, y: clientY };
    pipStartPosRef.current = { ...pipPos };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;

    const screenW = typeof window !== "undefined" ? window.innerWidth : 400;
    const screenH = typeof window !== "undefined" ? window.innerHeight : 600;

    const newX = Math.max(10, Math.min(screenW - 110, pipStartPosRef.current.x + dx));
    const newY = Math.max(80, Math.min(screenH - 170, pipStartPosRef.current.y + dy));

    setPipPos({ x: newX, y: newY });
  };

  const handleDragEnd = () => {
    const screenW = typeof window !== "undefined" ? window.innerWidth : 400;
    const screenH = typeof window !== "undefined" ? window.innerHeight : 600;

    const centerX = screenW / 2;
    const centerY = screenH / 2;

    const snapLeft = 16;
    const snapRight = screenW - 116;
    const snapTop = 80;
    const snapBottom = screenH - 180;

    const targetX = pipPos.x < centerX ? snapLeft : snapRight;
    const targetY = pipPos.y < centerY ? snapTop : snapBottom;

    setPipPos({ x: targetX, y: targetY });

    safeVibrate(10);
  };

  // Movie state
  const [movieUrl, setMovieUrl] = useState("");
  const [activeUrl, setActiveUrl] = useState("");
  const embed = useMemo(() => toEmbed(activeUrl), [activeUrl]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isRemoteActionRef = useRef(false);
  const latestRoomDataRef = useRef<any>(null);
  const [playing, setPlaying] = useState(false);

  // Chat
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // WebRTC
  const [callOn, setCallOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [partnerMicOn, setPartnerMicOn] = useState(true);
  const [partnerCamOn, setPartnerCamOn] = useState(true);
  const [partnerJoined, setPartnerJoined] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const iceQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const isPoliteRef = useRef(false);

  const countdownIntervalRef = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);
  function copyLink() {
    const inviteUrl = `${window.location.origin}/room/${roomId}`;
    void safeCopyText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleSignOut() {
    try {
      await auth.signOut();
      toast.success("Signed out of your romantic sanctuary.");
    } catch (err) {
      toast.error("Could not sign out.");
    }
  }

  // Refs to prevent state capture in real-time listeners and lock cycles
  const activeThemeRef = useRef(activeTheme);
  activeThemeRef.current = activeTheme;
  const cuddleModeRef = useRef(cuddleMode);
  cuddleModeRef.current = cuddleMode;
  const warmGlowRef = useRef(warmGlow);
  warmGlowRef.current = warmGlow;
  const ambientRef = useRef(ambient);
  ambientRef.current = ambient;
  const noteRef = useRef(note);
  noteRef.current = note;
  const activeUrlRef = useRef(activeUrl);
  activeUrlRef.current = activeUrl;
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const camOnRef = useRef(camOn);
  camOnRef.current = camOn;
  const micOnRef = useRef(micOn);
  micOnRef.current = micOn;

  const lastCountdownTriggerRef = useRef<number | null>(null);
  const lastConfettiTriggerRef = useRef<number | null>(null);

  // Custom high-performance Firestore replacement for old Supabase realtime broadcasting
  const broadcast = useCallback(
    async (event: string, payload: unknown) => {
      try {
        const roomRef = doc(db, "rooms", roomId);
        if (event === "chat" || event === "reaction") {
          const data = payload as ChatMsg;
          await setDoc(doc(db, "rooms", roomId, "chat", data.id), data);
        } else if (event === "voice") {
          const data = payload as VoiceMsg;
          await setDoc(doc(db, "rooms", roomId, "voice", data.id), data);
        } else if (event === "queue-add") {
          const data = payload as QueueItem;
          await setDoc(doc(db, "rooms", roomId, "queue", data.id), {
            id: data.id,
            url: data.url,
            title: data.title,
            at: Date.now(),
          });
        } else if (event === "queue-remove") {
          const data = payload as { id: string };
          await deleteDoc(doc(db, "rooms", roomId, "queue", data.id));
        } else if (event === "movie") {
          const data = payload as { url: string };
          await updateDoc(roomRef, {
            activeUrl: data.url,
            movieUrl: data.url,
            playing: false,
            currentTime: 0,
          });
        } else if (event === "playback") {
          const data = payload as { action: "play" | "pause" | "seek"; time: number };
          await updateDoc(roomRef, {
            playing: data.action === "play",
            currentTime: data.time,
          });
        } else if (event === "theme") {
          const data = payload as { theme: ThemeKey };
          await updateDoc(roomRef, { theme: data.theme });
        } else if (event === "countdown") {
          await updateDoc(roomRef, {
            countdownStart: Date.now(),
            playing: false,
            currentTime: videoRef.current?.currentTime ?? 0,
          });
        } else if (event === "confetti") {
          await updateDoc(roomRef, { confettiTrigger: Date.now() });
        } else if (event === "note") {
          const data = payload as { text: string };
          await updateDoc(roomRef, { note: data.text });
        } else if (event === "webrtc") {
          const data = payload as { type: string; sdp?: unknown; candidate?: unknown };
          const sigId = generateUUID();
          await setDoc(doc(db, "rooms", roomId, "signals", sigId), {
            id: sigId,
            from: me,
            type: data.type,
            sdp: data.sdp ? JSON.parse(JSON.stringify(data.sdp)) : null,
            candidate: data.candidate ? JSON.parse(JSON.stringify(data.candidate)) : null,
            at: Date.now(),
          });
        } else if (event === "typing") {
          const sigId = generateUUID();
          await setDoc(doc(db, "rooms", roomId, "signals", sigId), {
            id: sigId,
            from: me,
            type: "typing",
            at: Date.now(),
          });
        } else if (event === "media-state") {
          const data = payload as { camOn: boolean; micOn: boolean };
          await updateDoc(doc(db, "rooms", roomId, "presence", me), {
            camOn: data.camOn,
            micOn: data.micOn,
            updatedAt: Date.now(),
          });
        }
      } catch (err) {
        console.warn(`Firestore broadcast event failure for ${event}:`, err);
      }
    },
    [roomId, me],
  );

  // Set up the Realtime synced rooms via Firebase Core snapshot triggers
  useEffect(() => {
    const subscribeTime = Date.now();

    // 1. Core Room document bootstrapping & subscription
    const initAndSubscribeRoom = async () => {
      try {
        const roomRef = doc(db, "rooms", roomId);
        const snap = await getDoc(roomRef);
        if (!snap.exists()) {
          await setDoc(roomRef, {
            id: roomId,
            createdAt: new Date().toISOString(),
            activeUrl: "",
            movieUrl: "",
            playing: false,
            currentTime: 0,
            theme: "midnight",
            countdown: null,
            countdownStart: null,
            warmGlow: false,
            cuddleMode: false,
            ambient: "off",
            note: "",
            confettiTrigger: null,
          });
        }
      } catch (err) {
        console.warn("Room initial document boot warning:", err);
      }
    };
    initAndSubscribeRoom();

    const roomRef = doc(db, "rooms", roomId);
    const unsubscribeRoom = onSnapshot(
      roomRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        latestRoomDataRef.current = data;

        // Theme Sync
        if (data.theme && data.theme !== activeThemeRef.current) {
          setActiveTheme(data.theme);
          toast(`Atmosphere synchronized: ${THEMES[data.theme as ThemeKey].name}`);
          safeVibrate(10);
        }

        // Sync Atmosphere UI Filter toggles
        if (typeof data.cuddleMode === "boolean" && data.cuddleMode !== cuddleModeRef.current) {
          setCuddleMode(data.cuddleMode);
        }
        if (typeof data.warmGlow === "boolean" && data.warmGlow !== warmGlowRef.current) {
          setWarmGlow(data.warmGlow);
        }
        if (data.ambient && data.ambient !== ambientRef.current) {
          setAmbientSound(data.ambient as Ambient);
        }
        if (typeof data.note === "string" && data.note !== noteRef.current) {
          setNote(data.note);
        }

        // Synchronized Movie video state playback
        if (data.activeUrl && data.activeUrl !== activeUrlRef.current) {
          isRemoteActionRef.current = true;
          setActiveUrl(data.activeUrl);
          setMovieUrl(data.activeUrl);
          logHistory(data.activeUrl);
          setTimeout(() => {
            isRemoteActionRef.current = false;
          }, 400);
        }

        const v = videoRef.current;
        if (v) {
          let stateChanged = false;

          // Sync Play/Pause state
          if (typeof data.playing === "boolean" && data.playing !== playingRef.current) {
            stateChanged = true;
            isRemoteActionRef.current = true;
            if (data.playing) {
              void v.play().catch(() => {});
              setPlaying(true);
            } else {
              v.pause();
              setPlaying(false);
            }
          }

          // Sync Seek position independently
          if (typeof data.currentTime === "number") {
            const timeDiff = Math.abs(v.currentTime - data.currentTime);
            // Threshold of 1.5 seconds to prevent endless feedback loops while catching up
            if (timeDiff > 1.5) {
              stateChanged = true;
              isRemoteActionRef.current = true;
              v.currentTime = data.currentTime;
            }
          }

          if (stateChanged) {
            setTimeout(() => {
              isRemoteActionRef.current = false;
            }, 500);
          }
        }

        // Countdown syncer trigger
        if (data.countdownStart && data.countdownStart > subscribeTime && data.countdownStart !== lastCountdownTriggerRef.current) {
          lastCountdownTriggerRef.current = data.countdownStart;
          runCountdown();
        }

        // End-credits Confetti trigger
        if (data.confettiTrigger && data.confettiTrigger > subscribeTime && data.confettiTrigger !== lastConfettiTriggerRef.current) {
          lastConfettiTriggerRef.current = data.confettiTrigger;
          startConfettiEffect();
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `rooms/${roomId}`),
    );

    // 2. Chat Messaging real-time listeners
    const chatRef = collection(db, "rooms", roomId, "chat");
    const unsubscribeChat = onSnapshot(
      query(chatRef, orderBy("at", "asc")),
      (snap) => {
        const list = snap.docs.map((doc) => doc.data() as ChatMsg);
        setChat(list);

        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            const item = change.doc.data() as ChatMsg;
            if (item.from !== me && item.at >= subscribeTime) {
              if (item.reaction) {
                spawnHeart(item.text);
                safeVibrate([10, 30, 10]);
              } else {
                if (mobileTabRef.current !== "whispers") {
                  setUnreadCount((u) => u + 1);
                }
              }
            }
          }
        });
      },
      (err) => handleFirestoreError(err, OperationType.GET, `rooms/${roomId}/chat`),
    );

    // 3. Voice whisper messages listener
    const voiceRef = collection(db, "rooms", roomId, "voice");
    const unsubscribeVoice = onSnapshot(
      query(voiceRef, orderBy("at", "asc")),
      (snap) => {
        const list = snap.docs.map((doc) => doc.data() as VoiceMsg);
        setVoiceMsgs(list);

        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            const item = change.doc.data() as VoiceMsg;
            if (item.from !== me && item.at >= subscribeTime) {
              toast("💌 A whisper arrived");
              if (mobileTabRef.current !== "whispers") {
                setUnreadCount((u) => u + 1);
              }
            }
          }
        });
      },
      (err) => handleFirestoreError(err, OperationType.GET, `rooms/${roomId}/voice`),
    );

    // 4. Cinema Playlist Queue listener
    const queueRef = collection(db, "rooms", roomId, "queue");
    const unsubscribeQueue = onSnapshot(
      query(queueRef, orderBy("at", "asc")),
      (snap) => {
        const list = snap.docs.map((doc) => doc.data() as QueueItem);
        setQueue(list);
      },
      (err) => handleFirestoreError(err, OperationType.GET, `rooms/${roomId}/queue`),
    );

    // 5. Presences Tracking & Peer heartbeat liveness manager
    const presenceRef = doc(db, "rooms", roomId, "presence", me);
    setDoc(presenceRef, {
      id: me,
      camOn: camOnRef.current,
      micOn: micOnRef.current,
      joinedAt: Date.now(),
      updatedAt: Date.now(),
    }).catch((err) => console.error(err));

    const presenceInterval = setInterval(() => {
      updateDoc(presenceRef, { updatedAt: Date.now() }).catch(() => {});
    }, 8000);

    const handleUnload = () => {
      deleteDoc(doc(db, "rooms", roomId, "presence", me));
    };
    window.addEventListener("beforeunload", handleUnload);

    const matchPresenceCol = collection(db, "rooms", roomId, "presence");
    const unsubscribePresence = onSnapshot(
      matchPresenceCol,
      (snap) => {
        const list = snap.docs.map(
          (doc) => doc.data() as { id: string; camOn: boolean; micOn: boolean; updatedAt: number },
        );
        const others = list.filter((p) => p.id !== me);
        // Clean up stale users that crashed or disconnected (tolerate up to 5 mins clock skew)
        const activeOthers = others.filter((p) => Math.abs(Date.now() - p.updatedAt) < 300000);
        const active = activeOthers.length > 0;

        setPartnerJoined(active);
        if (active) {
          const firstPartner = activeOthers[0];
          setPartnerCamOn(firstPartner.camOn);
          setPartnerMicOn(firstPartner.micOn);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `rooms/${roomId}/presence`),
    );

    // 6. WebRTC Signaling connection router
    const signalsRef = collection(db, "rooms", roomId, "signals");
    const unsubscribeSignals = onSnapshot(
      query(signalsRef, where("at", ">=", subscribeTime)),
      (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            const item = change.doc.data();
            if (item.from !== me) {
              handleSignal(item);
            }
          }
        });
      },
    );

    return () => {
      unsubscribeRoom();
      unsubscribeChat();
      unsubscribeVoice();
      unsubscribeQueue();
      unsubscribePresence();
      unsubscribeSignals();
      clearInterval(presenceInterval);
      window.removeEventListener("beforeunload", handleUnload);
      deleteDoc(doc(db, "rooms", roomId, "presence", me)).catch(() => {});
      teardownCall();
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  useEffect(() => {
    if (callOn && localStreamRef.current && localVideoRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callOn, localVideoRef.current]);

  useEffect(() => {
    if (callOn) {
      void broadcast("media-state", { camOn, micOn });
    }
  }, [camOn, micOn, callOn, broadcast]);

  function sendChat(text: string, reaction = false) {
    const msg: ChatMsg = { id: generateUUID(), from: me, text, at: Date.now(), reaction };
    if (reaction) spawnHeart(text);
    setChat((c) => [...c, msg]);
    broadcast(reaction ? "reaction" : "chat", msg);
    safeVibrate(reaction ? 15 : 5);
  }

  function loadMovie(e: React.FormEvent) {
    e.preventDefault();
    const url = movieUrl.trim();
    if (!url) return;
    setActiveUrl(url);
    broadcast("movie", { url });
    logHistory(url);
    toast("Movie loaded for both of you");
  }

  const syncVideoToLatest = useCallback(() => {
    const v = videoRef.current;
    const data = latestRoomDataRef.current;
    if (!v || !data) return;

    isRemoteActionRef.current = true;

    // Sync current play/pause state
    if (typeof data.playing === "boolean") {
      if (data.playing) {
        void v.play().catch(() => {});
        setPlaying(true);
      } else {
        v.pause();
        setPlaying(false);
      }
    }

    // Sync current seek position
    if (typeof data.currentTime === "number") {
      v.currentTime = data.currentTime;
    }

    setTimeout(() => {
      isRemoteActionRef.current = false;
    }, 500);
  }, []);

  function onLocalPlay() {
    if (isRemoteActionRef.current) return;
    setPlaying(true);
    broadcast("playback", { action: "play", time: videoRef.current?.currentTime ?? 0 });
  }
  function onLocalPause() {
    if (isRemoteActionRef.current) return;
    setPlaying(false);
    broadcast("playback", { action: "pause", time: videoRef.current?.currentTime ?? 0 });
  }
  function onLocalSeeked() {
    if (isRemoteActionRef.current) return;
    broadcast("playback", { action: "seek", time: videoRef.current?.currentTime ?? 0 });
  }

  function forceSyncVideo() {
    const v = videoRef.current;
    if (!v) {
      void broadcast("webrtc", { type: "request-sync" });
      toast.success("Requested video state from your partner");
      return;
    }
    broadcast("playback", { action: playing ? "play" : "pause", time: v.currentTime });
    toast.success("Synchronized video playback with partner");
  }

  // ---- WebRTC ----
  function createPC() {
    const pc = new RTCPeerConnection(PEER_ICE);
    pc.onicecandidate = (e) => {
      if (e.candidate) broadcast("webrtc", { type: "ice", candidate: e.candidate });
    };
    pc.ontrack = (e) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };
    pcRef.current = pc;
    return pc;
  }

  async function startCall(video: boolean) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setCamOn(video);
      setMicOn(true);
      const pc = createPC();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      setCallOn(true);

      // Caller is "impolite" - sends the offer
      isPoliteRef.current = false;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      broadcast("webrtc", { type: "offer", sdp: offer });
    } catch (err) {
      console.error(err);
      toast.error("Could not access camera/mic");
    }
  }

  async function handleSignal(payload: unknown) {
    const msg = payload as {
      type: string;
      sdp?: RTCSessionDescriptionInit;
      candidate?: RTCIceCandidateInit;
    };

    if (msg.type === "offer") {
      // Incoming call: get media and answer (with video-to-audio-only fallback)
      if (!localStreamRef.current) {
        let stream: MediaStream | null = null;
        let hasVideo = true;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            hasVideo = false;
          } catch {
            toast.error("Your partner is calling but mic/camera access was denied");
            return;
          }
        }
        localStreamRef.current = stream;
        setCallOn(true);
        setCamOn(hasVideo);
        setMicOn(true);
      }
      const pc = pcRef.current ?? createPC();
      localStreamRef.current.getTracks().forEach((t) => {
        if (!pc.getSenders().find((s) => s.track === t)) pc.addTrack(t, localStreamRef.current!);
      });
      isPoliteRef.current = true;
      await pc.setRemoteDescription(msg.sdp!);

      // Apply queued ICE candidates for this PeerConnection
      while (iceQueueRef.current.length > 0) {
        const cand = iceQueueRef.current.shift();
        if (cand) {
          await pc
            .addIceCandidate(cand)
            .catch((err) => console.warn("Failed to add queued ICE on offer", err));
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      broadcast("webrtc", { type: "answer", sdp: answer });
    } else if (msg.type === "answer") {
      const pc = pcRef.current;
      if (pc && pc.signalingState !== "stable") {
        await pc.setRemoteDescription(msg.sdp!);

        // Apply queued ICE candidates for this PeerConnection
        while (iceQueueRef.current.length > 0) {
          const cand = iceQueueRef.current.shift();
          if (cand) {
            await pc
              .addIceCandidate(cand)
              .catch((err) => console.warn("Failed to add queued ICE on answer", err));
          }
        }
      }
    } else if (msg.type === "ice") {
      try {
        const pc = pcRef.current;
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(msg.candidate!);
        } else {
          iceQueueRef.current.push(msg.candidate!);
        }
      } catch (e) {
        console.warn("ICE add failed", e);
      }
    } else if (msg.type === "bye") {
      teardownCall();
    } else if (msg.type === "request-sync") {
      const v = videoRef.current;
      if (v) {
        void broadcast("playback", {
          action: playingRef.current ? "play" : "pause",
          time: v.currentTime,
        });
      }
    } else if (msg.type === "typing") {
      setPartnerTyping(true);
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
      typingTimeout.current = window.setTimeout(() => {
        setPartnerTyping(false);
      }, 3000);
    }
  }

  function teardownCall() {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallOn(false);
    setSharing(false);
    iceQueueRef.current = [];
  }

  function endCall() {
    broadcast("webrtc", { type: "bye" });
    teardownCall();
  }

  function toggleMic() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    }
  }
  async function toggleCam() {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOn(track.enabled);
    } else if (callOn) {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
        const newVideoTrack = tempStream.getVideoTracks()[0];
        if (newVideoTrack && localStreamRef.current) {
          localStreamRef.current.addTrack(newVideoTrack);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          const pc = pcRef.current;
          if (pc) {
            pc.addTrack(newVideoTrack, localStreamRef.current);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            broadcast("webrtc", { type: "offer", sdp: offer });
          }
          setCamOn(true);
        }
      } catch (err) {
        toast.error("Could not access camera");
      }
    }
  }

  // Floating hearts effect
  const [hearts, setHearts] = useState<number[]>([]);
  const [floaters, setFloaters] = useState<{ id: number; emoji: string; left: number }[]>([]);
  function spawnHeart(emoji = "❤️") {
    const id = Date.now() + Math.random();
    setHearts((h) => [...h, id]);
    setFloaters((f) => [...f, { id, emoji, left: 15 + Math.random() * 70 }]);
    setTimeout(() => {
      setHearts((h) => h.filter((x) => x !== id));
      setFloaters((f) => f.filter((x) => x.id !== id));
    }, 2800);
  }

  // Typing indicator
  const [partnerTyping, setPartnerTyping] = useState(false);
  const typingTimeout = useRef<number | null>(null);
  const lastTypingNotifyRef = useRef<number>(0);
  function notifyTyping() {
    const now = Date.now();
    if (now - lastTypingNotifyRef.current > 3000) {
      lastTypingNotifyRef.current = now;
      void broadcast("typing", { from: me });
    }
  }

  // Cuddle mode + warm overlay
  const currentTheme = THEMES[activeTheme];

  function changeTheme(theme: ThemeKey) {
    setActiveTheme(theme);
    broadcast("theme", { theme });
    toast(`Changed atmosphere to: ${THEMES[theme].name}`);
    safeVibrate(15);
  }

  function cycleTheme() {
    const keys = Object.keys(THEMES) as ThemeKey[];
    const nextIdx = (keys.indexOf(activeTheme) + 1) % keys.length;
    changeTheme(keys[nextIdx]);
  }

  function handleBgClick(e: React.MouseEvent<HTMLDivElement>) {
    // Avoid triggering if clicking buttons/inputs/iframes/videos
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest("a") ||
      target.closest("form") ||
      target.closest("textarea") ||
      target.closest("iframe") ||
      target.closest("video") ||
      target.closest(".interactive-panel") ||
      target.closest("select")
    ) {
      return;
    }

    const emojis = ["❤️", "💖", "🍿", "✨", "💫", "🌟", "🌹", "💋"];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    sendChat(randomEmoji, true);
  }

  // Playlist queue
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [queueDraft, setQueueDraft] = useState("");
  function addToQueue(url: string, title?: string) {
    const t = url.trim();
    if (!t) return;
    const item: QueueItem = { id: generateUUID(), url: t, title: title || t.slice(0, 40) };
    setQueue((q) => [...q, item]);
    broadcast("queue-add", item);
    setQueueDraft("");
  }
  function removeQueue(id: string) {
    setQueue((q) => q.filter((x) => x.id !== id));
    broadcast("queue-remove", { id });
  }
  function playQueue(item: QueueItem) {
    setActiveUrl(item.url);
    setMovieUrl(item.url);
    broadcast("movie", { url: item.url });
    toast(`Now playing: ${item.title}`);
  }

  // Countdown
  const [countdown, setCountdown] = useState<number | null>(null);
  function startCountdown() {
    // Immediately pause local video
    const v = videoRef.current;
    if (v) {
      v.pause();
    }
    setPlaying(false);
    broadcast("countdown", { start: Date.now() });
    runCountdown();
  }
  function runCountdown() {
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
    }
    // Pause video immediately on countdown start
    const v = videoRef.current;
    if (v) {
      v.pause();
    }
    setPlaying(false);

    let n = 3;
    setCountdown(n);
    const iv = window.setInterval(() => {
      n -= 1;
      if (n <= 0) {
        if (countdownIntervalRef.current) {
          window.clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setCountdown(null);
        const v2 = videoRef.current;
        if (v2) {
          void v2.play().catch(() => {});
          setPlaying(true);
        }
      } else {
        setCountdown(n);
      }
    }, 1000);
    countdownIntervalRef.current = iv;
  }

  // Scratchpad (shared sticky note)
  const [noteOpen, setNoteOpen] = useState(false);
  function updateNote(value: string) {
    setNote(value);
    broadcast("note", { text: value });
  }

  // Watch history (localStorage)
  const [history, setHistory] = useState<{ url: string; at: number }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`duet-history-${roomId}`) || "[]");
    } catch {
      return [];
    }
  });
  function logHistory(url: string) {
    setHistory((h) => {
      const next = [{ url, at: Date.now() }, ...h.filter((x) => x.url !== url)].slice(0, 10);
      localStorage.setItem(`duet-history-${roomId}`, JSON.stringify(next));
      return next;
    });
  }
  const [historyOpen, setHistoryOpen] = useState(false);

  // Voice whispers (record short audio)
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  async function toggleRecord() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recordChunksRef.current = [];
      rec.ondataavailable = (e) => recordChunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordChunksRef.current, { type: "audio/webm" });
        if (blob.size > 200_000) {
          toast.error("Whisper too long — keep it under ~5s");
          setRecording(false);
          return;
        }
        const buf = await blob.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const b64 = btoa(binary);
        const msg: VoiceMsg = { id: generateUUID(), from: me, audio: b64, at: Date.now() };
        setVoiceMsgs((v) => [...v, msg]);
        broadcast("voice", msg);
        setRecording(false);
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      setTimeout(() => {
        if (rec.state === "recording") rec.stop();
      }, 5000);
    } catch {
      toast.error("Mic access denied");
    }
  }
  const [voiceMsgs, setVoiceMsgs] = useState<VoiceMsg[]>([]);
  function playVoice(v: VoiceMsg) {
    const bin = atob(v.audio);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr], { type: "audio/webm" }));
    new Audio(url).play();
  }

  // Screen share
  const screenSenderRef = useRef<RTCRtpSender | null>(null);
  const [sharing, setSharing] = useState(false);
  async function toggleScreenShare() {
    const pc = pcRef.current;
    if (!pc) {
      toast.error("Start a call first");
      return;
    }
    if (sharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      const camTrack = localStreamRef.current?.getVideoTracks()[0];
      if (screenSenderRef.current) {
        await screenSenderRef.current.replaceTrack(camTrack || null);
      }
      setSharing(false);
      return;
    }
    try {
      const ds = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = ds;
      const track = ds.getVideoTracks()[0];
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(track);
        screenSenderRef.current = sender;
      }
      track.onended = () => {
        screenStreamRef.current?.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
        const ct = localStreamRef.current?.getVideoTracks()[0];
        if (screenSenderRef.current) {
          void screenSenderRef.current.replaceTrack(ct || null);
        }
        setSharing(false);
      };
      setSharing(true);
    } catch {
      toast.error("Screen share cancelled");
    }
  }

  // Photo booth
  // Photo booth helper to center crop
  function drawVideoCentered(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    dx: number,
    dy: number,
    dWidth: number,
    dHeight: number,
  ) {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const targetAspect = dWidth / dHeight;
    const videoAspect = vw / vh;

    let sx = 0,
      sy = 0,
      sWidth = vw,
      sHeight = vh;

    if (videoAspect > targetAspect) {
      sWidth = vh * targetAspect;
      sx = (vw - sWidth) / 2;
    } else {
      sHeight = vw / targetAspect;
      sy = (vh - sHeight) / 2;
    }

    ctx.drawImage(video, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
  }

  function snapPhoto() {
    const canvas = document.createElement("canvas");
    const lv = localVideoRef.current,
      rv = remoteVideoRef.current;
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#1a0f1a";
    ctx.fillRect(0, 0, 640, 360);
    if (rv && rv.videoWidth) drawVideoCentered(ctx, rv, 0, 0, 320, 360);
    if (lv && lv.videoWidth) drawVideoCentered(ctx, lv, 320, 0, 320, 360);
    ctx.fillStyle = "#ffd9c2";
    ctx.font = "italic 22px serif";
    ctx.fillText(`Moonpie · ${new Date().toLocaleDateString()}`, 16, 340);
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `moonpie-${Date.now()}.png`;
    a.click();
    toast("Snapped! Saved to downloads.");
  }

  // Ambient sounds
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientNodesRef = useRef<{ stop: () => void } | null>(null);
  function setAmbientSound(mode: Ambient) {
    ambientNodesRef.current?.stop();
    ambientNodesRef.current = null;
    setAmbient(mode);
    if (mode === "off") return;
    const ctx =
      audioCtxRef.current ??
      new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
    audioCtxRef.current = ctx;
    void ctx.resume();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    if (mode === "rain") {
      filter.type = "lowpass";
      filter.frequency.value = 1200;
      gain.gain.value = 0.15;
    }
    if (mode === "fire") {
      filter.type = "lowpass";
      filter.frequency.value = 350;
      gain.gain.value = 0.18;
    }
    if (mode === "city") {
      filter.type = "lowpass";
      filter.frequency.value = 600;
      gain.gain.value = 0.08;
    }
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    ambientNodesRef.current = {
      stop: () => {
        try {
          src.stop();
        } catch {
          /* ignore */
        }
        src.disconnect();
        filter.disconnect();
        gain.disconnect();
      },
    };
  }
  useEffect(
    () => () => {
      ambientNodesRef.current?.stop();
      audioCtxRef.current?.close();
    },
    [],
  );

  // End-credits confetti
  const [confetti, setConfetti] = useState(false);
  const [confettiItems, setConfettiItems] = useState<
    { left: number; delay: number; emoji: string }[]
  >([]);

  function startConfettiEffect() {
    const emojis = ["💖", "✨", "🌹", "🍾", "💫"];
    const items = Array.from({ length: 60 }).map((_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      emoji: emojis[i % emojis.length],
    }));
    setConfettiItems(items);
    setConfetti(true);
    setTimeout(() => {
      setConfetti(false);
      setConfettiItems([]);
    }, 4500);
  }

  function fireConfetti() {
    broadcast("confetti", {});
    startConfettiEffect();
  }

  // Movie roulette
  function rouletteSpin() {
    const pick = ROULETTE[Math.floor(Math.random() * ROULETTE.length)];
    setActiveUrl(pick.url);
    setMovieUrl(pick.url);
    broadcast("movie", { url: pick.url });
    toast(`🎲 Roulette picked: ${pick.title}`);
  }

  const isPipActive = isMobile && callOn && mobileTab !== "presence";

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
      className={`relative flex min-h-screen flex-col transition-colors duration-1000 select-none overflow-x-hidden ${currentTheme.bgClass} ${
        cuddleMode ? "brightness-[0.7] saturate-[0.7]" : ""
      }`}
      style={baseVibeVariables[activeTheme]}
    >
      {/* Immersive Theme Ambient Glow */}
      <div
        className={`pointer-events-none fixed inset-0 opacity-40 transition-all duration-1000 ${currentTheme.accentGradient}`}
      />

      {warmGlow && (
        <div
          className="pointer-events-none fixed inset-0 z-30 mix-blend-soft-light"
          style={{
            background:
              "radial-gradient(ellipse at center, oklch(0.85 0.18 50 / 0.45), transparent 70%)",
          }}
        />
      )}
      {countdown !== null && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <span
            key={countdown}
            className="font-serif text-[14rem] italic text-primary animate-[pop_1s_ease-out]"
          >
            {countdown}
          </span>
        </div>
      )}
      {confetti && (
        <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
          {confettiItems.map((item, i) => (
            <span
              key={i}
              className="absolute -top-4 text-2xl animate-[fall_3.5s_linear_forwards]"
              style={{ left: `${item.left}%`, animationDelay: `${item.delay}s` }}
            >
              {item.emoji}
            </span>
          ))}
        </div>
      )}

      {/* Viewport Floating Hearts/Emoji Interactions */}
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
        {floaters.map((f) => (
          <span
            key={f.id}
            className="absolute bottom-10 text-4xl animate-[floatUp_2.8s_ease-out_forwards]"
            style={{ left: `${f.left}%` }}
          >
            {f.emoji}
          </span>
        ))}
      </div>

      {/* Header */}
      <header className="flex items-center justify-between gap-2 border-b border-border/60 bg-background/60 px-3 py-2.5 backdrop-blur md:px-8">
        <Link to="/" className="flex items-center gap-1.5 shrink-0">
          <Heart className="size-5 fill-primary text-primary" />
          <span className="font-serif text-lg font-semibold hidden min-[400px]:inline">
            Moonpie
          </span>
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <span
            className={`size-2 rounded-full ${
              partnerJoined
                ? "bg-emerald-400 shadow-[0_0_10px] shadow-emerald-400/60"
                : "bg-muted-foreground/40"
            }`}
          />
          <span className="hidden sm:inline">
            {partnerJoined ? "Your partner is here" : "Waiting for partner…"}
          </span>
          <span className="inline sm:hidden text-[10px]">
            {partnerJoined ? "Partner" : "Waiting"}
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Synchronized Vibe Theme Swapper - Desktop Row */}
          <div className="hidden sm:flex items-center gap-1 bg-card/45 border border-border/40 rounded-full p-0.5 interactive-panel md:mr-1">
            {(Object.keys(THEMES) as ThemeKey[]).map((t) => {
              const isSelected = activeTheme === t;
              const themeCfg = THEMES[t];
              return (
                <button
                  key={t}
                  onClick={(e) => {
                    e.stopPropagation();
                    changeTheme(t);
                  }}
                  className={`group relative flex items-center justify-center rounded-full transition-all size-7 ${
                    isSelected
                      ? "bg-foreground text-background shadow-md scale-105"
                      : "hover:bg-card/75 text-muted-foreground hover:text-foreground"
                  }`}
                  title={`Change atmosphere to ${themeCfg.name}`}
                >
                  <Palette className="size-3.5" />
                  <span className="absolute top-9 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all bg-card/95 border border-border/50 text-[10px] text-foreground px-2 py-0.5 rounded whitespace-nowrap z-50 pointer-events-none shadow-md">
                    {themeCfg.name}
                  </span>
                  <span
                    className="absolute bottom-1 size-1 rounded-full"
                    style={{ backgroundColor: themeCfg.primaryColor }}
                  />
                </button>
              );
            })}
          </div>

          {/* Synchronized Vibe Theme Swapper - Mobile Cycle Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              cycleTheme();
            }}
            className="flex sm:hidden items-center justify-center rounded-full border border-border/40 bg-card/45 size-8 text-muted-foreground hover:text-foreground active:scale-90 transition-all relative"
            title="Cycle atmosphere theme"
          >
            <Palette className="size-3.5" />
            <span
              className="absolute bottom-1 right-1 size-1.5 rounded-full"
              style={{ backgroundColor: currentTheme.primaryColor }}
            />
          </button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setWarmGlow((w) => !w)}
            className="rounded-full size-8 p-0"
            title="Warm light"
          >
            {warmGlow ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCuddleMode((c) => !c)}
            className="rounded-full size-8 p-0"
            title="Cuddle mode"
          >
            <Heart className={`size-4 ${cuddleMode ? "fill-primary text-primary" : ""}`} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setLoversTheater((t) => !t);
              setCouplesRoomActive(false);
              setCuddleMode(false);
            }}
            className="rounded-full size-8 p-0"
            title="Lover's Theater Mode"
          >
            <Film className={`size-4 ${loversTheater ? "text-primary fill-primary/20" : ""}`} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setCouplesRoomActive((t) => !t);
              setLoversTheater(false);
              setCuddleMode(false);
            }}
            className={`rounded-full h-8 px-2.5 text-xs inline-flex items-center gap-1.5 shrink-0 ${
              couplesRoomActive ? "bg-primary/10 text-primary border border-primary/20" : ""
            }`}
            title="Couple's Sanctuary Mode"
          >
            <HeartHandshake className={`size-4 ${couplesRoomActive ? "text-primary fill-primary/10 animate-pulse" : ""}`} />
            <span className="hidden min-[480px]:inline">Couple's Sanctuary</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSignOut}
            className="rounded-full size-8 p-0 text-muted-foreground hover:text-foreground hover:bg-destructive/10"
            title="Sign Out"
          >
            <LogOut className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={copyLink}
            className="rounded-full h-8 px-2.5 text-xs inline-flex items-center gap-1 shrink-0"
          >
            {copied ? <Check className="size-3" /> : <LinkIcon className="size-3" />}
            <span className="hidden min-[360px]:inline">{copied ? "Copied" : "Share"}</span>
          </Button>
        </div>
      </header>

      {couplesRoomActive ? (
        <CouplesRoom roomId={roomId} onClose={() => setCouplesRoomActive(false)} />
      ) : loversTheater ? (
        <LoversTheater
          embed={embed}
          videoRef={videoRef}
          onLocalPlay={onLocalPlay}
          onLocalPause={onLocalPause}
          onLocalSeeked={onLocalSeeked}
          syncVideoToLatest={syncVideoToLatest}
          floaters={floaters}
          movieUrl={movieUrl}
          setMovieUrl={setMovieUrl}
          loadMovie={loadMovie}
          startCountdown={startCountdown}
          rouletteSpin={rouletteSpin}
          addToQueue={addToQueue}
          setHistoryOpen={setHistoryOpen}
          setNoteOpen={setNoteOpen}
          warmGlow={warmGlow}
          setWarmGlow={setWarmGlow}
          cuddleMode={cuddleMode}
          setCuddleMode={setCuddleMode}
          ambient={ambient}
          setAmbientSound={setAmbientSound}
          currentTheme={currentTheme}
          partnerJoined={partnerJoined}
          myPresence={{ camOn, micOn }}
          partnerPresence={{ camOn: partnerCamOn, micOn: partnerMicOn }}
          onCloseTheater={() => setLoversTheater(false)}
          onSendHeartReaction={(emoji) => sendChat(emoji, true)}
        />
      ) : (
        <div
          className={`transition-all duration-500 flex-1 ${
            isMobile
              ? "flex flex-col gap-4 p-4 pb-24"
              : cuddleMode
                ? "grid grid-cols-1 gap-4 p-4 md:p-6"
                : "grid grid-cols-1 md:grid-cols-[1fr_340px] gap-4 p-4 md:p-6"
          }`}
        >
        {/* Movie pane */}
        <div
          className={`flex-col gap-4 transition-all duration-300 ${
            isMobile && mobileTab !== "cinema" ? "hidden" : "flex"
          }`}
        >
          <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-border bg-black shadow-2xl">
            {!embed && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <Film className="size-10 text-primary/70" />
                <p className="font-serif text-xl text-foreground">Paste a movie link to begin</p>
                <p className="max-w-sm text-sm">
                  YouTube, Vimeo, direct .mp4 links, or any streaming page URL. Whatever you both
                  can watch.
                </p>
              </div>
            )}
            {embed?.kind === "iframe" && (
              <iframe
                key={embed.src}
                src={embed.src}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                className="h-full w-full"
              />
            )}
            {embed?.kind === "video" && (
              <video
                ref={videoRef}
                src={embed.src}
                controls
                onPlay={onLocalPlay}
                onPause={onLocalPause}
                onSeeked={onLocalSeeked}
                onLoadedMetadata={syncVideoToLatest}
                className="h-full w-full"
              />
            )}

            {/* Floating hearts */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {floaters.map((f) => (
                <span
                  key={f.id}
                  className="absolute bottom-4 text-3xl animate-[floatUp_2.6s_ease-out_forwards]"
                  style={{ left: `${f.left}%` }}
                >
                  {f.emoji}
                </span>
              ))}
            </div>
          </div>

          <form onSubmit={loadMovie} className="flex gap-2">
            <Input
              value={movieUrl}
              onChange={(e) => setMovieUrl(e.target.value)}
              placeholder="Paste a video or streaming link…"
              className="h-12 rounded-full border-border bg-card/60 text-base md:text-sm"
            />
            <Button type="submit" className="h-12 rounded-full px-6">
              Load
            </Button>
          </form>

          {/* Feature toolbar */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card/40 p-2 backdrop-blur">
            <Button size="sm" variant="ghost" onClick={startCountdown} className="rounded-full">
              <Timer className="size-4" /> 3-2-1
            </Button>
            <Button size="sm" variant="ghost" onClick={rouletteSpin} className="rounded-full">
              <Dice5 className="size-4" /> Roulette
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => addToQueue(movieUrl)}
              className="rounded-full"
              disabled={!movieUrl.trim()}
            >
              <Plus className="size-4" /> Queue
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setHistoryOpen((h) => !h)}
              className="rounded-full"
            >
              <History className="size-4" /> History
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setNoteOpen((n) => !n)}
              className="rounded-full"
            >
              <StickyNote className="size-4" /> Note
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={forceSyncVideo}
              className="rounded-full text-primary hover:text-primary-foreground hover:bg-primary/20"
              disabled={!activeUrl}
              title="Force sync video state to your partner"
            >
              <RefreshCw className="size-4" /> Sync
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={snapPhoto}
              className="rounded-full"
              disabled={!callOn}
            >
              <Camera className="size-4" /> Snap
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleScreenShare}
              className="rounded-full"
              disabled={!callOn}
            >
              <MonitorUp className={`size-4 ${sharing ? "text-primary" : ""}`} /> Share
            </Button>
            <Button size="sm" variant="ghost" onClick={fireConfetti} className="rounded-full">
              <Sparkles className="size-4" /> Credits
            </Button>
            <div className="ml-auto flex items-center gap-1">
              <Button
                size="icon"
                variant={ambient === "rain" ? "secondary" : "ghost"}
                className="size-8 rounded-full"
                onClick={() => setAmbientSound(ambient === "rain" ? "off" : "rain")}
                title="Rain"
              >
                <CloudRain className="size-4" />
              </Button>
              <Button
                size="icon"
                variant={ambient === "fire" ? "secondary" : "ghost"}
                className="size-8 rounded-full"
                onClick={() => setAmbientSound(ambient === "fire" ? "off" : "fire")}
                title="Fireplace"
              >
                <Flame className="size-4" />
              </Button>
              <Button
                size="icon"
                variant={ambient === "city" ? "secondary" : "ghost"}
                className="size-8 rounded-full"
                onClick={() => setAmbientSound(ambient === "city" ? "off" : "city")}
                title="City"
              >
                <Building2 className="size-4" />
              </Button>
              {ambient !== "off" && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 rounded-full"
                  onClick={() => setAmbientSound("off")}
                >
                  <VolumeX className="size-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Queue panel */}
          {queue.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card/40 p-3 backdrop-blur">
              <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <ListMusic className="size-3.5" /> Up next
              </div>
              <ul className="space-y-1.5">
                {queue.map((q) => (
                  <li
                    key={q.id}
                    className="flex items-center gap-2 rounded-xl bg-background/40 px-3 py-2 text-sm"
                  >
                    <button
                      onClick={() => playQueue(q)}
                      className="flex-1 truncate text-left hover:text-primary"
                    >
                      {q.title}
                    </button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 rounded-full"
                      onClick={() => removeQueue(q.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* History */}
          {historyOpen && (
            <div className="rounded-2xl border border-border/60 bg-card/40 p-3 backdrop-blur">
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
                <span className="flex items-center gap-2">
                  <History className="size-3.5" /> Watched together
                </span>
                <button onClick={() => setHistoryOpen(false)}>
                  <X className="size-3.5" />
                </button>
              </div>
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground">No history yet.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {history.map((h, i) => (
                    <li key={i}>
                      <button
                        onClick={() => {
                          setActiveUrl(h.url);
                          setMovieUrl(h.url);
                          broadcast("movie", { url: h.url });
                        }}
                        className="block w-full truncate rounded-lg bg-background/40 px-3 py-1.5 text-left hover:text-primary"
                      >
                        {h.url}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Scratchpad */}
          {noteOpen && (
            <div className="rounded-2xl border border-amber-300/30 bg-amber-100/10 p-3 backdrop-blur">
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-widest text-amber-200/80">
                <span className="flex items-center gap-2">
                  <StickyNote className="size-3.5" /> Shared note
                </span>
                <button onClick={() => setNoteOpen(false)}>
                  <X className="size-3.5" />
                </button>
              </div>
              <textarea
                value={note}
                onChange={(e) => updateNote(e.target.value)}
                placeholder="Date ideas, your favourite line, a tiny love letter…"
                className="h-24 w-full resize-none rounded-xl bg-background/40 p-3 font-serif text-base md:text-sm italic text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          )}

          {embed?.kind === "video" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              Playback is synced — when one of you presses play, both screens move together.
            </div>
          )}
          {embed?.kind === "iframe" && (
            <div className="text-xs text-muted-foreground">
              Embedded players (like YouTube) play independently — count down together in chat for a
              perfect start.
            </div>
          )}
        </div>

        {/* Right column: video call + chat */}
        <aside
          className={`transition-all duration-500 ${
            isMobile
              ? "flex flex-col gap-4 w-full"
              : cuddleMode
                ? "fixed bottom-6 right-6 w-80 max-h-[380px] z-40 bg-card/90 backdrop-blur-md rounded-3xl p-2.5 shadow-2xl border border-border"
                : "relative flex min-h-0 flex-col gap-4"
          }`}
        >
          <div
            onTouchStart={
              isPipActive
                ? (e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)
                : undefined
            }
            onTouchMove={
              isPipActive
                ? (e) => {
                    e.preventDefault();
                    handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
                  }
                : undefined
            }
            onTouchEnd={isPipActive ? handleDragEnd : undefined}
            onMouseDown={isPipActive ? (e) => handleDragStart(e.clientX, e.clientY) : undefined}
            onMouseMove={
              isPipActive
                ? (e) => {
                    if (e.buttons === 1) handleDragMove(e.clientX, e.clientY);
                  }
                : undefined
            }
            onMouseUp={isPipActive ? handleDragEnd : undefined}
            style={
              isPipActive
                ? {
                    position: "fixed",
                    left: 0,
                    top: 0,
                    transform: `translate3d(${pipPos.x}px, ${pipPos.y}px, 0)`,
                    width: "100px",
                    height: "140px",
                    zIndex: 9999,
                  }
                : {}
            }
            className={`${
              isMobile
                ? callOn
                  ? mobileTab === "presence"
                    ? "relative overflow-hidden rounded-3xl border border-border bg-card shadow-xl aspect-square w-full"
                    : "overflow-hidden rounded-2xl border-2 border-primary/60 bg-black shadow-2xl cursor-grab active:cursor-grabbing"
                  : mobileTab === "presence"
                    ? "relative overflow-hidden rounded-3xl border border-border bg-card shadow-xl aspect-square w-full"
                    : "hidden"
                : `relative overflow-hidden rounded-3xl border border-border bg-card shadow-xl transition-all duration-500 ${cuddleMode ? "aspect-video w-full" : "aspect-[4/5]"}`
            }`}
          >
            {/* Remote */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full bg-black object-cover"
            />

            {/* Remote Camera Muted / Voice Only Overlay */}
            {callOn && !partnerCamOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-950/90 text-center animate-in fade-in duration-300">
                <div className="relative flex items-center justify-center">
                  <div className="absolute size-24 animate-ping rounded-full bg-primary/20 duration-[3000ms]" />
                  <div className="absolute size-16 animate-pulse rounded-full bg-primary/30" />
                  <div className="relative flex size-12 items-center justify-center rounded-full bg-primary text-xl font-serif text-primary-foreground shadow-lg shadow-primary-shadow">
                    L
                  </div>
                </div>
                <div>
                  <p className="font-serif text-sm tracking-wide text-foreground">
                    Connected in Voice Call
                  </p>
                  <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1.5 mt-1">
                    {partnerMicOn ? (
                      <span className="flex items-center gap-1">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                        </span>
                        Voicing Live...
                      </span>
                    ) : (
                      "Microphone Muted"
                    )}
                  </p>
                </div>
              </div>
            )}

            {!callOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/70 px-6 text-center backdrop-blur">
                <VideoIcon className="size-8 text-primary fill-primary/10 animate-[heartBeat_2.5s_infinite]" />
                <p className="font-serif text-lg">Be in the room together</p>
                <p className="text-xs text-muted-foreground">
                  Start a video or voice call so you're side by side.
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => startCall(true)}
                    className="rounded-full bg-primary text-primary-foreground hover:brightness-110 shadow-md"
                  >
                    <VideoIcon className="size-4" /> Video Call
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => startCall(false)}
                    className="rounded-full hover:bg-muted"
                  >
                    <Mic className="size-4" /> Voice Call
                  </Button>
                </div>
              </div>
            )}

            {/* Local PiP */}
            {callOn && (
              <div
                className={`absolute rounded-2xl border border-border bg-black shadow-md transition-all ${
                  isMobile && mobileTab !== "presence"
                    ? "right-1.5 top-1.5 h-12 w-9 rounded-lg pointer-events-none"
                    : "right-3 top-3 h-24 w-20 shadow-lg"
                }`}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover rounded-2xl"
                />
                {!camOn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-zinc-900 border border-border">
                    <div className="flex size-7 items-center justify-center rounded-full bg-zinc-800 text-xs font-serif text-zinc-300">
                      Y
                    </div>
                  </div>
                )}
              </div>
            )}
            {callOn && (!isMobile || mobileTab === "presence") && (
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/70 px-2 py-1.5 backdrop-blur">
                <Button
                  size="icon"
                  variant={micOn ? "secondary" : "destructive"}
                  className="size-9 rounded-full"
                  onClick={toggleMic}
                >
                  {micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
                </Button>
                <Button
                  size="icon"
                  variant={camOn ? "secondary" : "destructive"}
                  className="size-9 rounded-full"
                  onClick={toggleCam}
                >
                  {camOn ? <VideoIcon className="size-4" /> : <VideoOff className="size-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  className="size-9 rounded-full"
                  onClick={endCall}
                >
                  <PhoneOff className="size-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Chat */}
          <div
            className={`${
              isMobile
                ? mobileTab === "whispers"
                  ? "flex flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-card/50 backdrop-blur-md animate-in fade-in duration-300 h-[calc(100vh-210px)] min-h-[400px]"
                  : "hidden"
                : `flex min-h-[260px] flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-card/60 backdrop-blur ${cuddleMode ? "hidden" : "flex"}`
            }`}
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <span className="font-serif text-sm tracking-wide text-muted-foreground">
                Whispers
              </span>
              <div className="flex flex-wrap gap-1">
                {REACTION_EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => sendChat(e, true)}
                    className="rounded-full bg-primary/10 px-2 py-1 text-sm transition-transform hover:scale-110 hover:bg-primary/20"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3 text-sm">
              {chat.length === 0 && (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No messages yet. Say something sweet.
                </p>
              )}
              {chat.map((m) => {
                const mine = m.from === me;
                if (m.reaction) {
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <span className="text-2xl animate-[pop_0.3s_ease-out]">{m.text}</span>
                    </div>
                  );
                }
                return (
                  <div key={m.id} className={`flex items-end gap-1.5 ${mine ? "justify-end" : "justify-start"} mb-1`}>
                    {!mine && (
                      <div className="flex size-5 select-none items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-secondary-foreground shadow-sm">
                        L
                      </div>
                    )}
                    <div
                      className={
                        mine
                          ? "max-w-[75%] rounded-2xl rounded-br-sm bg-primary px-3 py-1.5 text-primary-foreground shadow-sm animate-in slide-in-from-right-2 duration-150"
                          : "max-w-[75%] rounded-2xl rounded-bl-sm bg-secondary px-3 py-1.5 text-secondary-foreground shadow-sm animate-in slide-in-from-left-2 duration-150"
                      }
                    >
                      {m.text}
                    </div>
                    {mine && (
                      <div className="flex size-5 select-none items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary shadow-sm border border-primary/20">
                        Y
                      </div>
                    )}
                  </div>
                );
              })}
              {voiceMsgs.map((v) => {
                const mine = v.from === me;
                return (
                  <div key={v.id} className={`flex items-center gap-1.5 ${mine ? "justify-end" : "justify-start"} mb-1`}>
                    {!mine && (
                      <div className="flex size-5 select-none items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-secondary-foreground shadow-sm">
                        L
                      </div>
                    )}
                    <button
                      onClick={() => playVoice(v)}
                      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs shadow-sm animate-in duration-150 ${mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                    >
                      <MicIcon className="size-3" /> Play whisper
                    </button>
                    {mine && (
                      <div className="flex size-5 select-none items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary shadow-sm border border-primary/20">
                        Y
                      </div>
                    )}
                  </div>
                );
              })}
              {partnerTyping && (
                <div className="flex justify-start">
                  <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-secondary px-3 py-2.5">
                    <span
                      className="size-1.5 animate-bounce rounded-full bg-foreground/60"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="size-1.5 animate-bounce rounded-full bg-foreground/60"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="size-1.5 animate-bounce rounded-full bg-foreground/60"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const t = draft.trim();
                if (!t) return;
                sendChat(t);
                setDraft("");
              }}
              className="flex items-center gap-2 border-t border-border/60 p-3"
            >
              <Input
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  notifyTyping();
                }}
                placeholder="Whisper to your love…"
                className="h-10 rounded-full border-border bg-background/60 text-base md:text-sm"
              />
              <Button
                type="button"
                size="icon"
                variant={recording ? "destructive" : "secondary"}
                className="size-10 rounded-full"
                onClick={toggleRecord}
                title="Voice whisper (5s max)"
              >
                <MicIcon className="size-4" />
              </Button>
              <Button type="submit" size="icon" className="size-10 rounded-full">
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </aside>
      </div>
      )}

      {/* Mobile Tab bar dock */}
      {isMobile && (
        <div className="fixed bottom-5 left-1/2 z-50 flex w-[90%] max-w-sm -translate-x-1/2 items-center justify-around rounded-full border border-border/80 bg-card/85 px-3 py-2.5 shadow-[0_-8px_30px_rgb(0,0,0,0.18)] backdrop-blur-xl">
          <button
            onClick={() => {
              setMobileTab("cinema");
              safeVibrate(5);
            }}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
              mobileTab === "cinema"
                ? "text-primary scale-105 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Film className="size-5" />
            <span>Cinema</span>
          </button>

          <button
            onClick={() => {
              setMobileTab("whispers");
              safeVibrate(5);
            }}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
              mobileTab === "whispers"
                ? "text-primary scale-105 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="relative">
              <Send className="size-5 rotate-[-20deg]" />
              {unreadCount > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <span>Whispers</span>
          </button>

          <button
            onClick={() => {
              setMobileTab("presence");
              safeVibrate(5);
            }}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
              mobileTab === "presence"
                ? "text-primary scale-105 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="relative">
              <VideoIcon className="size-5" />
              {callOn && (
                <span className="absolute -right-1 -top-1 flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_oklch(0.7_0.2_140)] animate-ping" />
              )}
            </div>
            <span>Presence</span>
          </button>
        </div>
      )}

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translateY(-220px) scale(1.2); opacity: 0; }
        }
        @keyframes pop {
          0% { transform: scale(0.3); opacity: 0; }
          30% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

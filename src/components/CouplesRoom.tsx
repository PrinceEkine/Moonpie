import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Heart,
  Play,
  Pause,
  Film,
  Tv,
  Users,
  Volume2,
  VolumeX,
  Sparkles,
  Flame,
  Sun,
  Moon,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Send,
  Trash2,
  ChevronRight,
  Clock,
  ExternalLink,
  CloudRain,
  Building2,
  StickyNote,
  Timer,
} from "lucide-react";
import { db, auth, handleFirestoreError, OperationType } from "@/lib/firebase";
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface CouplesRoomProps {
  roomId: string;
  onClose?: () => void;
}

interface ChatMsg {
  id: string;
  from: string;
  text: string;
  at: number;
  reaction?: boolean;
}

interface Presence {
  id: string;
  displayName?: string;
  camOn: boolean;
  micOn: boolean;
  joinedAt: number;
  updatedAt: number;
}

interface QueueItem {
  id: string;
  url: string;
  title: string;
  at: number;
}

interface LoveNote {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  color: string;
  mood: string;
  at: number;
  likes: number;
  likedBy: string[];
}

const THEMES = {
  midnight: {
    name: "Midnight Silk",
    primaryColor: "#ef4444",
    bgClass: "bg-[#0b0813]",
    accentGradient: "from-red-500/10 via-transparent to-purple-500/10",
    quote: "You are my blue sky in the middle of a starry night.",
  },
  sunset: {
    name: "Golden Hour Sunset",
    primaryColor: "#f97316",
    bgClass: "bg-[#180e0a]",
    accentGradient: "from-orange-500/10 via-transparent to-amber-500/10",
    quote: "With you, every sunset feels like a warm embrace.",
  },
  emerald: {
    name: "Emerald Conservatory",
    primaryColor: "#10b981",
    bgClass: "bg-[#060e0a]",
    accentGradient: "from-emerald-500/10 via-transparent to-teal-500/10",
    quote: "Grow old with me, the best is yet to be.",
  },
  cinema: {
    name: "Lumière Classics",
    primaryColor: "#eab308",
    bgClass: "bg-[#0f0f10]",
    accentGradient: "from-yellow-500/10 via-transparent to-zinc-500/10",
    quote: "In a world of cinema, you are my favorite masterpiece.",
  },
};

const NOTE_STYLES = {
  rose: {
    bg: "bg-rose-500/10 border-rose-500/30 text-rose-100",
    badge: "bg-rose-500/20 text-rose-300",
    button: "text-rose-400 hover:bg-rose-500/20",
    glow: "shadow-[0_0_15px_rgba(244,63,94,0.1)]",
    title: "Soft Rose",
  },
  lavender: {
    bg: "bg-purple-500/10 border-purple-500/30 text-purple-100",
    badge: "bg-purple-500/20 text-purple-300",
    button: "text-purple-400 hover:bg-purple-500/20",
    glow: "shadow-[0_0_15px_rgba(168,85,247,0.1)]",
    title: "Lavender Sky",
  },
  peach: {
    bg: "bg-orange-500/10 border-orange-500/30 text-orange-100",
    badge: "bg-orange-500/20 text-orange-300",
    button: "text-orange-400 hover:bg-orange-500/20",
    glow: "shadow-[0_0_15px_rgba(249,115,22,0.1)]",
    title: "Peach Sunset",
  },
  mint: {
    bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-100",
    badge: "bg-emerald-500/20 text-emerald-300",
    button: "text-emerald-400 hover:bg-emerald-500/20",
    glow: "shadow-[0_0_15px_rgba(16,185,129,0.1)]",
    title: "Mint Glow",
  },
};

type ThemeKey = keyof typeof THEMES;

function toEmbed(url: string): { src: string; kind: "iframe" | "video" } | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    
    // YouTube embeds
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      let id = "";
      if (u.hostname.includes("youtu.be")) {
        id = u.pathname.slice(1);
      } else {
        id = u.searchParams.get("v") || "";
      }
      if (id) return { src: `https://www.youtube.com/embed/${id}?autoplay=0`, kind: "iframe" };
    }
    
    // Generic direct video URLs
    if (url.match(/\.(mp4|webm|ogg|m4v)($|\?)/i)) {
      return { src: url, kind: "video" };
    }
    
    // Fallback as iframe
    return { src: url, kind: "iframe" };
  } catch (_) {
    return null;
  }
}

export function CouplesRoom({ roomId, onClose }: CouplesRoomProps) {
  const me = auth.currentUser?.uid || "anonymous";
  const meName = auth.currentUser?.displayName || "You";

  // Video State
  const [activeUrl, setActiveUrl] = useState("");
  const [movieInput, setMovieInput] = useState("");
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const embed = useMemo(() => toEmbed(activeUrl), [activeUrl]);

  // UI state
  const [activeTheme, setActiveTheme] = useState<ThemeKey>("midnight");
  const [warmGlow, setWarmGlow] = useState(false);
  const [cuddleMode, setCuddleMode] = useState(false);
  const [ambient, setAmbient] = useState<"off" | "rain" | "fire" | "city">("off");
  
  // Realtime lists
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [partners, setPartners] = useState<Presence[]>([]);
  const [floaters, setFloaters] = useState<Array<{ id: string; left: number; emoji: string }>>([]);

  // Love Notes states
  const [loveNotes, setLoveNotes] = useState<LoveNote[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [noteColor, setNoteColor] = useState("rose");
  const [noteMood, setNoteMood] = useState("Sweet");

  // Hardware/RTC peripherals mockup states
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);

  // Refs to guard play loopback & presence alerts
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isRemoteActionRef = useRef(false);
  const currentTheme = THEMES[activeTheme];
  const partnersRef = useRef<string[]>([]);

  // Countdown states
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const lastCountdownTriggerRef = useRef<number | null>(null);

  // Sounds elements
  const rainAudioRef = useRef<HTMLAudioElement | null>(null);
  const fireAudioRef = useRef<HTMLAudioElement | null>(null);
  const cityAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize and stop sounds
  useEffect(() => {
    rainAudioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2433/2433-84.wav");
    rainAudioRef.current.loop = true;
    rainAudioRef.current.volume = 0.45;

    fireAudioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2432/2432-84.wav");
    fireAudioRef.current.loop = true;
    fireAudioRef.current.volume = 0.55;

    cityAudioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/1243/1243-84.wav");
    cityAudioRef.current.loop = true;
    cityAudioRef.current.volume = 0.3;

    return () => {
      rainAudioRef.current?.pause();
      fireAudioRef.current?.pause();
      cityAudioRef.current?.pause();
    };
  }, []);

  // Sync ambient sound selection with DOM audio elements
  useEffect(() => {
    rainAudioRef.current?.pause();
    fireAudioRef.current?.pause();
    cityAudioRef.current?.pause();

    if (ambient === "rain") rainAudioRef.current?.play().catch(() => {});
    if (ambient === "fire") fireAudioRef.current?.play().catch(() => {});
    if (ambient === "city") cityAudioRef.current?.play().catch(() => {});
  }, [ambient]);

  // Countdown timer controls
  const runCountdown = useCallback(() => {
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
  }, []);

  const startCountdown = () => {
    // Pause video locally first to avoid delay
    const v = videoRef.current;
    if (v) {
      v.pause();
    }
    setPlaying(false);

    const roomRef = doc(db, "rooms", roomId);
    updateDoc(roomRef, {
      countdownStart: Date.now(),
      playing: false,
      currentTime: videoRef.current?.currentTime || 0,
    })
      .then(() => {
        runCountdown();
      })
      .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`));
  };

  // Clean up countdown interval on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Helper to spawn a floating heart/reaction element on screen
  const spawnHeart = useCallback((emoji: string) => {
    const id = Math.random().toString(36).slice(2, 9);
    const left = Math.floor(Math.random() * 60) + 20; // range 20% to 80%
    setFloaters((prev) => [...prev, { id, left, emoji }]);
    setTimeout(() => {
      setFloaters((prev) => prev.filter((f) => f.id !== id));
    }, 2800);
  }, []);

  // 1. Subscribe to Room Core Document (Media sync)
  useEffect(() => {
    if (!roomId) return;

    const subscribeTime = Date.now();
    const roomRef = doc(db, "rooms", roomId);
    
    // Create room if it doesn't exist
    setDoc(roomRef, {
      id: roomId,
      createdAt: Date.now(),
    }, { merge: true }).catch((err) => handleFirestoreError(err, OperationType.CREATE, `rooms/${roomId}`));

    const unsubscribe = onSnapshot(roomRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      // Theme
      if (data.theme && data.theme !== activeTheme) {
        setActiveTheme(data.theme as ThemeKey);
      }

      // Countdown syncer trigger
      if (data.countdownStart && data.countdownStart > subscribeTime && data.countdownStart !== lastCountdownTriggerRef.current) {
        lastCountdownTriggerRef.current = data.countdownStart;
        runCountdown();
      }

      // Warm glow & cuddle mode
      if (typeof data.warmGlow === "boolean") setWarmGlow(data.warmGlow);
      if (typeof data.cuddleMode === "boolean") setCuddleMode(data.cuddleMode);
      if (data.ambient) setAmbient(data.ambient);

      // Active media synchronization
      if (data.activeUrl && data.activeUrl !== activeUrl) {
        isRemoteActionRef.current = true;
        setActiveUrl(data.activeUrl);
        setMovieInput(data.activeUrl);
        setTimeout(() => { isRemoteActionRef.current = false; }, 350);
      }

      // Sync play state
      const v = videoRef.current;
      if (v) {
        if (typeof data.playing === "boolean" && data.playing !== playing) {
          isRemoteActionRef.current = true;
          setPlaying(data.playing);
          if (data.playing) {
            v.play().catch(() => {});
          } else {
            v.pause();
          }
          setTimeout(() => { isRemoteActionRef.current = false; }, 350);
        }

        // Sync seek position
        if (typeof data.currentTime === "number") {
          const delta = Math.abs(v.currentTime - data.currentTime);
          if (delta > 2.0) {
            isRemoteActionRef.current = true;
            v.currentTime = data.currentTime;
            setCurrentTime(data.currentTime);
            setTimeout(() => { isRemoteActionRef.current = false; }, 350);
          }
        }
      } else {
        if (typeof data.playing === "boolean") setPlaying(data.playing);
        if (typeof data.currentTime === "number") setCurrentTime(data.currentTime);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `rooms/${roomId}`));

    return () => unsubscribe();
  }, [roomId, activeUrl, playing, runCountdown]);

  // 2. Subscribe to Presence list and detect enters/leaves
  useEffect(() => {
    if (!roomId || !me) return;

    // Set self presence
    const selfPresenceRef = doc(db, "rooms", roomId, "presence", me);
    setDoc(selfPresenceRef, {
      id: me,
      displayName: meName,
      camOn,
      micOn,
      joinedAt: Date.now(),
      updatedAt: Date.now(),
    }).catch((err) => handleFirestoreError(err, OperationType.CREATE, `rooms/${roomId}/presence/${me}`));

    // Keepalive heartbeat
    const heartbeat = setInterval(() => {
      updateDoc(selfPresenceRef, { updatedAt: Date.now() }).catch(() => {});
    }, 5000);

    // Watch other partners in the room
    const presenceCol = collection(db, "rooms", roomId, "presence");
    const unsubscribe = onSnapshot(presenceCol, (snap) => {
      const activePartners: Presence[] = [];
      const threshold = Date.now() - 15000; // 15 seconds timeout
      
      snap.forEach((d) => {
        const item = d.data() as Presence;
        if (item.id !== me && item.updatedAt > threshold) {
          activePartners.push(item);
        }
      });

      // Detect enters/leaves
      const currentIds = activePartners.map(p => p.id);
      const prevIds = partnersRef.current;

      currentIds.forEach((id) => {
        if (!prevIds.includes(id)) {
          const joinedUser = activePartners.find(p => p.id === id);
          const name = joinedUser?.displayName || "Your partner";
          toast.success(`${name} has stepped into your Couple's Sanctuary! 💖`, {
            icon: "✨",
            duration: 5000,
          });
          spawnHeart("💖");
          spawnHeart("✨");
          spawnHeart("🥰");
        }
      });

      prevIds.forEach((id) => {
        if (!currentIds.includes(id)) {
          toast.info(`Your partner has stepped out of the Sanctuary. 🍂`, {
            icon: "🌙",
            duration: 4000,
          });
        }
      });

      partnersRef.current = currentIds;
      setPartners(activePartners);
    });

    return () => {
      clearInterval(heartbeat);
      unsubscribe();
      deleteDoc(selfPresenceRef).catch(() => {});
    };
  }, [roomId, me, meName, camOn, micOn, spawnHeart]);

  // 3. Subscribe to Chat messages / reaction stream
  useEffect(() => {
    if (!roomId) return;
    const chatCol = collection(db, "rooms", roomId, "chat");
    const chatQuery = query(chatCol, orderBy("at", "desc"), limit(35));

    const unsubscribe = onSnapshot(chatQuery, (snap) => {
      const msgs: ChatMsg[] = [];
      snap.forEach((doc) => {
        msgs.push(doc.data() as ChatMsg);
      });
      // Sort ascending for chat listing
      setChatMessages(msgs.reverse());

      // Trigger reaction animations for recently added emojis
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data() as ChatMsg;
          if (data.reaction && Date.now() - data.at < 3500) {
            spawnHeart(data.text);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [roomId, spawnHeart]);

  // 4. Subscribe to Lineup Queue
  useEffect(() => {
    if (!roomId) return;
    const queueCol = collection(db, "rooms", roomId, "queue");
    const queueQuery = query(queueCol, orderBy("at", "asc"));

    const unsubscribe = onSnapshot(queueQuery, (snap) => {
      const items: QueueItem[] = [];
      snap.forEach((doc) => {
        items.push(doc.data() as QueueItem);
      });
      setQueue(items);
    });

    return () => unsubscribe();
  }, [roomId]);

  // 5. Subscribe to Love Notes collection
  useEffect(() => {
    if (!roomId) return;
    const notesCol = collection(db, "rooms", roomId, "loveNotes");
    const notesQuery = query(notesCol, orderBy("at", "desc"), limit(20));

    const unsubscribe = onSnapshot(notesQuery, (snap) => {
      const notes: LoveNote[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        notes.push({
          id: d.id,
          senderId: d.senderId,
          senderName: d.senderName,
          text: d.text,
          color: d.color,
          mood: d.mood,
          at: d.at,
          likes: d.likes || 0,
          likedBy: d.likedBy || [],
        });
      });
      setLoveNotes(notes);

      // Trigger real-time notifications for newly added notes by partner
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data() as LoveNote;
          if (data.senderId !== me && Date.now() - data.at < 5000) {
            toast.info(`💌 Love Note from ${data.senderName}: "${data.text.slice(0, 45)}..."`, {
              duration: 7000,
              icon: "💝",
            });
            spawnHeart("💖");
            spawnHeart("💌");
          }
        }
      });
    }, (err) => handleFirestoreError(err, OperationType.GET, `rooms/${roomId}/loveNotes`));

    return () => unsubscribe();
  }, [roomId, me, spawnHeart]);

  // Broadcast media play action to Firestore
  const handleLocalPlay = () => {
    if (isRemoteActionRef.current) return;
    const roomRef = doc(db, "rooms", roomId);
    updateDoc(roomRef, {
      playing: true,
      currentTime: videoRef.current?.currentTime || 0,
    }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`));
  };

  // Broadcast media pause action to Firestore
  const handleLocalPause = () => {
    if (isRemoteActionRef.current) return;
    const roomRef = doc(db, "rooms", roomId);
    updateDoc(roomRef, {
      playing: false,
      currentTime: videoRef.current?.currentTime || 0,
    }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`));
  };

  // Broadcast media seeking action to Firestore
  const handleLocalSeeked = () => {
    if (isRemoteActionRef.current) return;
    const roomRef = doc(db, "rooms", roomId);
    updateDoc(roomRef, {
      currentTime: videoRef.current?.currentTime || 0,
    }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`));
  };

  // Broadcast loading a new movie URL to Firestore
  const handleLoadMovie = (e: React.FormEvent) => {
    e.preventDefault();
    const t = movieInput.trim();
    if (!t) return;

    const roomRef = doc(db, "rooms", roomId);
    updateDoc(roomRef, {
      activeUrl: t,
      playing: false,
      currentTime: 0,
    })
      .then(() => toast.success("Atmosphere ticket printed! Playing movie in sync. 🎟️"))
      .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`));
  };

  // Change Theme environment
  const handleThemeChange = (themeKey: ThemeKey) => {
    const roomRef = doc(db, "rooms", roomId);
    updateDoc(roomRef, { theme: themeKey })
      .then(() => toast.info(`Aura changed to ${THEMES[themeKey].name}`))
      .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`));
  };

  // Send a text or visual reaction
  const handleSendChat = (text: string, isReaction = false) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const id = Math.random().toString(36).slice(2, 9);
    const chatRef = doc(db, "rooms", roomId, "chat", id);
    
    setDoc(chatRef, {
      id,
      from: meName,
      text: trimmed,
      at: Date.now(),
      reaction: isReaction,
    })
      .then(() => {
        if (!isReaction) setChatInput("");
      })
      .catch((err) => handleFirestoreError(err, OperationType.CREATE, `rooms/${roomId}/chat/${id}`));
  };

  // Queue manipulation
  const handleAddToQueue = () => {
    const t = movieInput.trim();
    if (!t) return;
    const id = Math.random().toString(36).slice(2, 9);
    const itemRef = doc(db, "rooms", roomId, "queue", id);
    
    setDoc(itemRef, {
      id,
      url: t,
      title: t.split("/").pop() || "Lover's Film Lineup",
      at: Date.now(),
    })
      .then(() => {
        setMovieInput("");
        toast.success("Saved movie to lineup queue! 🍿");
      })
      .catch((err) => handleFirestoreError(err, OperationType.CREATE, `rooms/${roomId}/queue/${id}`));
  };

  const handlePlayFromQueue = (item: QueueItem) => {
    const roomRef = doc(db, "rooms", roomId);
    updateDoc(roomRef, {
      activeUrl: item.url,
      playing: false,
      currentTime: 0,
    }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`));
  };

  const handleRemoveFromQueue = (id: string) => {
    const itemRef = doc(db, "rooms", roomId, "queue", id);
    deleteDoc(itemRef).catch((err) => handleFirestoreError(err, OperationType.DELETE, `rooms/${roomId}/queue/${id}`));
  };

  // Love Note Pin function
  const handlePostLoveNote = (e: React.FormEvent) => {
    e.preventDefault();
    const text = noteInput.trim();
    if (!text) return;

    if (text.length > 140) {
      toast.error("Love notes should be sweet and short (under 140 characters).");
      return;
    }

    const id = Math.random().toString(36).slice(2, 9);
    const noteRef = doc(db, "rooms", roomId, "loveNotes", id);

    setDoc(noteRef, {
      id,
      senderId: me,
      senderName: meName,
      text,
      color: noteColor,
      mood: noteMood,
      at: Date.now(),
      likes: 0,
      likedBy: [],
    })
      .then(() => {
        setNoteInput("");
        toast.success("Love note pinned on your partner's wall! 📌💌");
        spawnHeart("💖");
        spawnHeart("💌");
      })
      .catch((err) => handleFirestoreError(err, OperationType.CREATE, `rooms/${roomId}/loveNotes/${id}`));
  };

  // Heart love note toggle function
  const handleHeartNote = (noteId: string) => {
    const note = loveNotes.find(n => n.id === noteId);
    if (!note) return;

    const likedBy = note.likedBy || [];
    const hasLiked = likedBy.includes(me);
    
    const updatedLikedBy = hasLiked 
      ? likedBy.filter(uid => uid !== me)
      : [...likedBy, me];

    const noteRef = doc(db, "rooms", roomId, "loveNotes", noteId);
    updateDoc(noteRef, {
      likedBy: updatedLikedBy,
      likes: updatedLikedBy.length,
    })
      .then(() => {
        if (!hasLiked) {
          toast.success("Sent a heart back! 🥰");
          spawnHeart("❤️");
        }
      })
      .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}/loveNotes/${noteId}`));
  };

  // Delete love note function
  const handleDeleteNote = (noteId: string) => {
    const noteRef = doc(db, "rooms", roomId, "loveNotes", noteId);
    deleteDoc(noteRef)
      .then(() => toast.info("Love note swept away. 🍂"))
      .catch((err) => handleFirestoreError(err, OperationType.DELETE, `rooms/${roomId}/loveNotes/${noteId}`));
  };

  // Toggle Filters / Ambiances
  const handleToggleWarmGlow = () => {
    const roomRef = doc(db, "rooms", roomId);
    updateDoc(roomRef, { warmGlow: !warmGlow }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`));
  };

  const handleToggleCuddleMode = () => {
    const roomRef = doc(db, "rooms", roomId);
    updateDoc(roomRef, { cuddleMode: !cuddleMode }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`));
  };

  const handleAmbientChange = (val: "off" | "rain" | "fire" | "city") => {
    const roomRef = doc(db, "rooms", roomId);
    updateDoc(roomRef, { ambient: val }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`));
  };

  return (
    <div className={`relative flex flex-col min-h-screen ${currentTheme.bgClass} text-foreground overflow-x-hidden select-none transition-colors duration-700`}>
      {/* Dynamic theme accent light */}
      <div className={`absolute top-0 inset-x-0 h-96 bg-gradient-to-b ${currentTheme.accentGradient} pointer-events-none blur-3xl opacity-60 z-0`} />

      {countdown !== null && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <span
            key={countdown}
            className="font-serif text-[14rem] italic animate-[pop_1s_ease-out]"
            style={{ color: currentTheme.primaryColor || "#f43f5e" }}
          >
            {countdown}
          </span>
        </div>
      )}

      {/* Warm candlelight glow filter overlay */}
      <div
        className={`pointer-events-none fixed inset-0 bg-amber-500/5 transition-opacity duration-1000 z-40 ${
          warmGlow ? "opacity-100 mix-blend-color-burn" : "opacity-0"
        }`}
      />

      {/* Cuddle dark focus mode filter overlay */}
      <div
        className={`pointer-events-none fixed inset-0 bg-[#050308]/65 backdrop-blur-xs transition-opacity duration-1000 z-30 ${
          cuddleMode ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Primary Header */}
      <header className="relative w-full z-10 border-b border-border/40 bg-background/30 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 group text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="size-8 rounded-full border border-border/50 flex items-center justify-center bg-card/40 backdrop-blur group-hover:-translate-x-0.5 transition-transform">
              ←
            </span>
            <span className="hidden sm:inline">Exit Cinema</span>
          </button>
          
          <div className="h-6 w-px bg-border/40 hidden sm:block" />
          
          <div className="flex items-center gap-2">
            <Heart className="size-5 fill-primary text-primary animate-pulse" />
            <span className="font-serif italic font-bold text-lg">Couple's Sanctuary</span>
            <span className="text-xs font-mono text-muted-foreground/60 px-2 py-0.5 bg-card border border-border rounded-full">
              ID: {roomId}
            </span>
          </div>
        </div>

        {/* Top toolbar Controls */}
        <div className="flex items-center gap-3">
          {/* Theme selection dropdown */}
          <div className="flex items-center gap-1.5 bg-card/60 border border-border/80 px-2.5 py-1 rounded-full text-xs">
            {Object.keys(THEMES).map((key) => {
              const active = activeTheme === key;
              return (
                <button
                  key={key}
                  onClick={() => handleThemeChange(key as ThemeKey)}
                  className={`px-2 py-0.5 rounded-full transition-all text-[11px] capitalize cursor-pointer ${
                    active ? "bg-primary text-primary-foreground font-semibold" : "hover:text-foreground text-muted-foreground"
                  }`}
                >
                  {key}
                </button>
              );
            })}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleToggleWarmGlow}
            className={`rounded-full size-8 p-0 border border-border/50 ${warmGlow ? "text-amber-400 bg-amber-500/10" : "text-muted-foreground"}`}
            title="Warm Candlelight glow filter"
          >
            {warmGlow ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </header>

      {/* Main Sanctuary Grid */}
      <main className="relative flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:p-8 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 z-10">
        
        {/* Left Column: Theatre & Controls */}
        <div className="flex flex-col gap-6">
          
          {/* 1. Proscenium Theatre Panel */}
          <div className="relative aspect-video w-full rounded-3xl border border-border bg-black overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col group">
            
            {/* Ambient Background Light Spill */}
            <div
              className="absolute inset-x-12 -bottom-10 h-32 opacity-25 blur-3xl pointer-events-none transition-opacity duration-1000 group-hover:opacity-40"
              style={{
                background: `radial-gradient(circle, ${currentTheme.primaryColor} 0%, transparent 70%)`,
              }}
            />

            {/* Left/Right Cinema Curtains overlays */}
            <div className="absolute inset-y-0 left-0 w-8 md:w-16 bg-gradient-to-r from-black/95 via-neutral-900/60 to-transparent pointer-events-none z-10 border-r border-neutral-900/30" />
            <div className="absolute inset-y-0 right-0 w-8 md:w-16 bg-gradient-to-l from-black/95 via-neutral-900/60 to-transparent pointer-events-none z-10 border-l border-neutral-900/30" />

            {/* Screen Inner Stage container */}
            <div className="absolute inset-0 px-8 md:px-16 py-3 flex items-center justify-center z-0">
              {!activeUrl ? (
                <div className="text-center max-w-sm flex flex-col items-center gap-4 text-muted-foreground p-6">
                  <div
                    className="size-16 rounded-full flex items-center justify-center bg-primary/5 border border-primary/20 shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-pulse"
                    style={{ color: currentTheme.primaryColor }}
                  >
                    <Film className="size-8" />
                  </div>
                  <h3 className="font-serif text-2xl text-foreground font-medium">Theater Seats Unoccupied</h3>
                  <p className="text-xs text-muted-foreground/80 leading-relaxed">
                    Paste a direct streaming link or YouTube URL below to print your movie date ticket.
                  </p>
                </div>
              ) : (
                <div className="w-full h-full rounded-2xl overflow-hidden bg-neutral-950 border border-zinc-900 relative flex items-center justify-center">
                  
                  {embed?.kind === "iframe" && (
                    <iframe
                      key={embed.src}
                      src={embed.src}
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                      className="h-full w-full object-contain"
                    />
                  )}

                  {embed?.kind === "video" && (
                    <video
                      ref={videoRef}
                      src={embed.src}
                      controls
                      onPlay={handleLocalPlay}
                      onPause={handleLocalPause}
                      onSeeked={handleLocalSeeked}
                      className="h-full w-full object-contain"
                    />
                  )}

                  {/* Floating hearts emojis layer */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                    {floaters.map((f) => (
                      <span
                        key={f.id}
                        className="absolute bottom-4 text-3xl animate-[floatUp_2.8s_ease-out_forwards]"
                        style={{ left: `${f.left}%` }}
                      >
                        {f.emoji}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Micro details panel */}
            <div className="absolute bottom-3 left-10 text-[10px] font-mono text-muted-foreground/50 pointer-events-none select-none z-20 flex items-center gap-1.5 uppercase">
              <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
              <span>DTS Surround Realtime Synced</span>
            </div>
          </div>

          {/* 2. Shared Couple Seats & Presence widget */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Seat 1: Self Connection */}
            <div className="relative rounded-2xl border border-border/50 bg-card/30 backdrop-blur-md p-4 flex items-center justify-between hover:bg-card/40 transition-colors shadow-xs">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-full border flex items-center justify-center shadow-xs transition-colors ${
                  camOn ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-primary/5 border-primary/20 text-primary"
                }`}>
                  <Heart className={`size-5 ${!camOn ? "fill-current animate-pulse" : "fill-none"}`} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">Row A · Seat 1</span>
                  <span className="text-sm font-semibold flex items-center gap-1.5">
                    {meName} <span className="text-[10px] font-medium text-primary/80 bg-primary/10 px-1.5 rounded-full">You</span>
                  </span>
                </div>
              </div>

              {/* Hardware Toggles */}
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setMicOn(!micOn)}
                  className={`size-8 p-0 rounded-full ${micOn ? "text-emerald-400 bg-emerald-500/10" : "text-muted-foreground hover:bg-muted"}`}
                  title={micOn ? "Mic active" : "Mic muted"}
                >
                  {micOn ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCamOn(!camOn)}
                  className={`size-8 p-0 rounded-full ${camOn ? "text-emerald-400 bg-emerald-500/10" : "text-muted-foreground hover:bg-muted"}`}
                  title={camOn ? "Cam active" : "Cam muted"}
                >
                  {camOn ? <VideoIcon className="size-3.5" /> : <VideoOff className="size-3.5" />}
                </Button>
              </div>
            </div>

            {/* Seat 2: Partner Connection */}
            <div className="relative rounded-2xl border border-border/50 bg-card/30 backdrop-blur-md p-4 flex items-center justify-between hover:bg-card/40 transition-colors shadow-xs">
              {partners.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-2 text-center">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                    <Users className="size-4" />
                    <span>Seat 2 empty. Waiting for partner...</span>
                  </div>
                </div>
              ) : (
                partners.map((partner) => (
                  <div key={partner.id} className="flex-1 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-full border flex items-center justify-center shadow-xs transition-colors ${
                        partner.camOn ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-primary/5 border-primary/20 text-primary"
                      }`}>
                        <Heart className={`size-5 ${!partner.camOn ? "fill-current animate-pulse" : "fill-none"}`} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">Row A · Seat 2</span>
                        <span className="text-sm font-semibold">{partner.displayName || "Lover"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] bg-background/50 border border-border px-2 py-0.5 rounded-full text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        {partner.micOn ? <Mic className="size-3 text-emerald-400" /> : <MicOff className="size-3" />}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        {partner.camOn ? <VideoIcon className="size-3 text-emerald-400" /> : <VideoOff className="size-3" />}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3. Stream Admission control form & Sync Features toolbar */}
          <div className="space-y-4">
            <form onSubmit={handleLoadMovie} className="relative flex items-center">
              <Input
                value={movieInput}
                onChange={(e) => setMovieInput(e.target.value)}
                placeholder="Paste cinema direct media URL or YouTube URL..."
                className="h-12 rounded-full border-border/80 bg-card/40 pl-5 pr-44 text-sm focus:ring-2 focus:ring-primary/40 text-foreground shadow-sm"
              />
              <div className="absolute right-1.5 top-1.5 flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddToQueue}
                  className="h-9 rounded-full px-3 text-xs flex items-center gap-1 border-border bg-card/50"
                  disabled={!movieInput.trim()}
                >
                  Lineup Queue
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-9 rounded-full px-5 font-semibold text-xs active:scale-95 transition-all text-white bg-primary hover:bg-primary/95 shadow-md"
                >
                  Play Link
                </Button>
              </div>
            </form>

            {/* Quick Interactions Bar & Ambient Audio Toggles */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/50 bg-card/25 p-3.5 backdrop-blur-md">
              
              {/* Emojis Reactions */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mr-1">Reactions:</span>
                {["❤️", "🍿", "🍷", "💋", "✨", "🔥"].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendChat(emoji, true)}
                    className="hover:scale-135 active:scale-95 transition-transform px-1 select-none text-lg drop-shadow-sm cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* White Noise Toggle Button group */}
              <div className="flex items-center gap-1 bg-background/55 border border-border/70 p-0.5 rounded-full text-xs">
                {[
                  { id: "off", label: "Silence", icon: VolumeX },
                  { id: "rain", label: "Rain cabin", icon: CloudRain },
                  { id: "fire", label: "Fireplace", icon: Flame },
                  { id: "city", label: "City twilight", icon: Building2 },
                ].map((item) => {
                  const active = ambient === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleAmbientChange(item.id as any)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full transition-all text-[11px] cursor-pointer ${
                        active ? "bg-primary/10 border border-primary/20 text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* 3-2-1 Countdown Trigger */}
              <Button
                size="sm"
                variant="ghost"
                onClick={startCountdown}
                className="rounded-full text-xs font-semibold flex items-center gap-1.5 h-8 border border-border/40 text-muted-foreground hover:text-foreground"
                title="Initiate a synced 3-2-1 countdown to play together"
              >
                <Timer className="size-3.5" />
                <span>3-2-1 Countdown</span>
              </Button>

              {/* Special Cuddle overlay toggle */}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleToggleCuddleMode}
                className={`rounded-full text-xs font-semibold flex items-center gap-1.5 h-8 border border-border/40 ${
                  cuddleMode ? "text-primary bg-primary/10 border-primary/20" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="size-3.5 animate-pulse" />
                <span>Cuddle Overlay</span>
              </Button>
            </div>
          </div>

          {/* 4. Love Notes Wall */}
          <div className="relative rounded-3xl border border-border/50 bg-card/25 backdrop-blur-md p-6 flex flex-col gap-6 shadow-xs overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500/40 to-transparent pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <StickyNote className="size-5" />
                </div>
                <div>
                  <h3 className="font-serif italic font-bold text-lg text-foreground">Love Notes Wall</h3>
                  <p className="text-[11px] text-muted-foreground/80">Leave sweet, real-time messages on your shared board</p>
                </div>
              </div>

              {/* Quick Preset mood filters */}
              <div className="flex items-center gap-1.5 bg-background/40 border border-border/50 p-1 rounded-full text-xs self-start">
                {Object.keys(NOTE_STYLES).map((colorKey) => {
                  const style = NOTE_STYLES[colorKey as keyof typeof NOTE_STYLES];
                  const active = noteColor === colorKey;
                  return (
                    <button
                      key={colorKey}
                      type="button"
                      onClick={() => setNoteColor(colorKey)}
                      className={`size-6 rounded-full border transition-all relative ${
                        colorKey === "rose" ? "bg-rose-500 border-rose-400" :
                        colorKey === "lavender" ? "bg-purple-500 border-purple-400" :
                        colorKey === "peach" ? "bg-orange-500 border-orange-400" :
                        "bg-emerald-500 border-emerald-400"
                      } ${active ? "ring-2 ring-primary scale-110 z-10" : "opacity-75 hover:opacity-100"}`}
                      title={style.title}
                    />
                  );
                })}
              </div>
            </div>

            {/* Note Composer Form */}
            <form onSubmit={handlePostLoveNote} className="flex gap-3 items-center">
              <Input
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Write a sweet love note (max 140 chars)..."
                maxLength={140}
                className="flex-1 h-11 rounded-full border-border/80 bg-background/30 text-xs pl-5 focus:ring-rose-500/30 text-foreground"
              />
              
              <div className="flex items-center gap-1.5 bg-background/30 border border-border/60 rounded-full px-2 h-11">
                {["Sweet", "Cozy", "Playful", "Dreamy"].map((mood) => {
                  const active = noteMood === mood;
                  return (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => setNoteMood(mood)}
                      className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                        active ? "bg-rose-500/20 text-rose-300 font-bold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {mood}
                    </button>
                  );
                })}
              </div>

              <Button
                type="submit"
                size="sm"
                className="h-11 rounded-full px-5 font-semibold text-xs text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-xs"
              >
                Pin Note
              </Button>
            </form>

            {/* Realtime Pinned Notes Board */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1">
              {loveNotes.length === 0 ? (
                <div className="col-span-full py-8 text-center rounded-2xl border border-dashed border-border/40 bg-card/10 flex flex-col items-center justify-center gap-2">
                  <Heart className="size-6 text-muted-foreground/30 fill-none" />
                  <p className="text-xs text-muted-foreground/60 italic font-serif">"The love notes board is waiting for your secrets..."</p>
                </div>
              ) : (
                loveNotes.map((note) => {
                  const style = NOTE_STYLES[note.color as keyof typeof NOTE_STYLES] || NOTE_STYLES.rose;
                  const isMe = note.senderId === me;
                  const hasLiked = note.likedBy?.includes(me);
                  
                  return (
                    <div
                      key={note.id}
                      className={`relative rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all duration-300 hover:scale-[1.02] ${style.bg} ${style.glow} animate-in fade-in zoom-in-95 duration-500`}
                    >
                      {/* Note Header Pin */}
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${style.badge}`}>
                          {note.mood}
                        </span>
                        {isMe && (
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            className="size-5 rounded-full flex items-center justify-center hover:bg-black/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Sweep note away"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        )}
                      </div>

                      {/* Content */}
                      <div className="pt-2 pr-12">
                        <p className="font-serif italic text-sm leading-relaxed text-slate-100 whitespace-pre-wrap">
                          "{note.text}"
                        </p>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between border-t border-white/5 pt-2.5 mt-1">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-300">
                            {note.senderName}
                          </span>
                          <span className="text-[9px] text-slate-400/60 font-mono">
                            {new Date(note.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleHeartNote(note.id)}
                          className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full transition-all cursor-pointer ${
                            hasLiked ? "bg-rose-500/20 text-rose-300 font-bold" : style.button
                          }`}
                        >
                          <Heart className={`size-3.5 ${hasLiked ? "fill-rose-400 text-rose-400" : ""}`} />
                          <span>{note.likes || 0}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Chat Whispers & Lineup playlist Queue */}
        <aside className="flex flex-col gap-6">
          
          {/* Chat whispers box */}
          <div className="flex flex-col h-[320px] lg:h-[400px] rounded-3xl border border-border/50 bg-card/20 backdrop-blur-md overflow-hidden relative shadow-sm">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary/10 via-primary/35 to-primary/10" />
            
            <div className="px-5 py-3.5 border-b border-border/40 flex items-center justify-between">
              <span className="font-serif italic font-bold text-sm">Whispers Date Chat</span>
              <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <p className="text-xs text-muted-foreground/60 italic font-serif">"Tell your sweetheart a secret..."</p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.from === meName;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[85%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"} animate-in fade-in duration-300`}
                    >
                      <span className="text-[9px] text-muted-foreground/60 mb-0.5 px-1 font-medium">{msg.from}</span>
                      <div className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                        msg.reaction
                          ? "bg-transparent text-2xl px-1 py-0 shadow-none scale-120 select-none animate-bounce"
                          : isMe
                            ? "bg-primary text-primary-foreground rounded-tr-none shadow-xs"
                            : "bg-card border border-border/80 text-foreground rounded-tl-none shadow-xs"
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); handleSendChat(chatInput); }}
              className="p-3 border-t border-border/40 bg-background/25 flex items-center gap-2"
            >
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Whisper a loving word..."
                className="h-10 rounded-full border-border/80 bg-background/40 text-xs pl-4"
              />
              <Button type="submit" size="sm" className="size-9 rounded-full p-0 shrink-0 text-white bg-primary hover:bg-primary/95 cursor-pointer">
                <Send className="size-4" />
              </Button>
            </form>
          </div>

          {/* Lineup Film Playlist Queue box */}
          <div className="flex flex-col h-[200px] lg:h-[230px] rounded-3xl border border-border/50 bg-card/20 backdrop-blur-md overflow-hidden relative shadow-sm">
            <div className="px-5 py-3 border-b border-border/40 font-serif italic font-bold text-sm">
              Movie Lineup Playlist ({queue.length})
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {queue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <p className="text-xs text-muted-foreground/60 italic font-serif">No custom movie lineup saved yet.</p>
                </div>
              ) : (
                queue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-card/40 border border-border/40 group hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 overflow-hidden mr-2">
                      <Tv className="size-4 text-primary/60 shrink-0" />
                      <span className="text-xs font-semibold truncate text-muted-foreground group-hover:text-foreground">
                        {item.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePlayFromQueue(item)}
                        className="size-7 p-0 rounded-full text-emerald-400 hover:bg-emerald-500/10"
                        title="Load movie to theatre"
                      >
                        <Play className="size-3 fill-current" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveFromQueue(item.id)}
                        className="size-7 p-0 rounded-full text-destructive/80 hover:bg-destructive/10"
                        title="Delete from list"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </main>

      {/* Floating theme footer quotation */}
      <footer className="w-full text-center py-6 px-4 border-t border-border/30 bg-background/10 z-10 text-[11px] text-muted-foreground/45 font-serif italic">
        "{currentTheme.quote}"
      </footer>

      {/* Custom Keyframes in scope styles */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0.65) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-280px) scale(1.4) rotate(15deg);
            opacity: 0;
          }
        }
        @keyframes pop {
          0% { transform: scale(0.3); opacity: 0; }
          30% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

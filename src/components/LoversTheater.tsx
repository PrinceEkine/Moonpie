import { useRef, useEffect } from "react";
import {
  Heart,
  Timer,
  Dice5,
  Plus,
  History,
  StickyNote,
  Sun,
  Moon,
  ChevronLeft,
  Video as VideoIcon,
  VideoOff,
  Mic,
  MicOff,
  Flame,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/firebase";

interface LoversTheaterProps {
  embed: { src: string; kind: "iframe" | "video" } | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  isCreator?: boolean;
  roomCreatorName?: string;
  onLocalPlay: () => void;
  onLocalPause: () => void;
  onLocalSeeked: () => void;
  syncVideoToLatest: () => void;
  floaters: Array<{ id: string; left: number; emoji: string }>;
  movieUrl: string;
  setMovieUrl: (url: string) => void;
  loadMovie: (e: React.FormEvent) => void;
  startCountdown: () => void;
  rouletteSpin: () => void;
  addToQueue: (url: string) => void;
  setHistoryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setNoteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  warmGlow: boolean;
  setWarmGlow: React.Dispatch<React.SetStateAction<boolean>>;
  cuddleMode: boolean;
  setCuddleMode: React.Dispatch<React.SetStateAction<boolean>>;
  ambient: "off" | "rain" | "fire" | "city";
  setAmbientSound: (ambient: "off" | "rain" | "fire" | "city") => void;
  currentTheme: {
    name: string;
    primaryColor: string;
    bgClass: string;
    accentGradient: string;
    pillsClass: string;
    quote: string;
  };
  partnerJoined: boolean;
  myPresence?: { camOn: boolean; micOn: boolean };
  partnerPresence?: { camOn: boolean; micOn: boolean };
  onCloseTheater: () => void;
  onSendHeartReaction: (emoji: string) => void;
}

export function LoversTheater({
  embed,
  videoRef,
  iframeRef,
  isCreator = true,
  roomCreatorName = "The Room Creator",
  onLocalPlay,
  onLocalPause,
  onLocalSeeked,
  syncVideoToLatest,
  floaters,
  movieUrl,
  setMovieUrl,
  loadMovie,
  startCountdown,
  rouletteSpin,
  addToQueue,
  setHistoryOpen,
  setNoteOpen,
  warmGlow,
  setWarmGlow,
  cuddleMode,
  setCuddleMode,
  ambient,
  setAmbientSound,
  currentTheme,
  partnerJoined,
  myPresence = { camOn: false, micOn: false },
  partnerPresence = { camOn: false, micOn: false },
  onCloseTheater,
  onSendHeartReaction,
}: LoversTheaterProps) {
  const meName = auth.currentUser?.displayName || "You";

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in duration-700">
      {/* Curved Theater Screen Top Glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-[2px] opacity-40 blur-sm"
        style={{
          background: `radial-gradient(circle, ${currentTheme.primaryColor} 0%, transparent 100%)`,
          boxShadow: `0 0 15px 2px ${currentTheme.primaryColor}`,
        }}
      />

      {/* Theater Top Title bar */}
      <div className="w-full flex items-center justify-between mb-6 z-10">
        <button
          onClick={onCloseTheater}
          className="flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ChevronLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Exit Theater</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: currentTheme.primaryColor }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ backgroundColor: currentTheme.primaryColor }}
            />
          </span>
          <span className="font-serif text-xs italic text-muted-foreground">
            Lover's Theater Mode
          </span>
        </div>
      </div>

      {/* Main Theater Proscenium Frame */}
      <div className="relative w-full aspect-video rounded-[32px] border border-zinc-800/80 bg-black overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] group">
        {/* Ambient Backlight Glow under the screen */}
        <div
          className="absolute inset-x-10 -bottom-10 h-32 opacity-25 blur-[60px] pointer-events-none transition-all duration-1000 group-hover:opacity-40"
          style={{
            background: `radial-gradient(circle, ${currentTheme.primaryColor} 0%, transparent 70%)`,
          }}
        />

        {/* Elegant Theater Curtains Overlay (Left/Right margins) */}
        <div className="absolute inset-y-0 left-0 w-8 md:w-16 bg-gradient-to-r from-neutral-950 via-neutral-900 to-transparent pointer-events-none z-10 border-r border-neutral-900/40 opacity-90">
          <div className="h-full w-full bg-[linear-gradient(90deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.15)_50%,rgba(0,0,0,0)_100%)] bg-[size:8px_100%]" />
        </div>
        <div className="absolute inset-y-0 right-0 w-8 md:w-16 bg-gradient-to-l from-neutral-950 via-neutral-900 to-transparent pointer-events-none z-10 border-l border-neutral-900/40 opacity-90">
          <div className="h-full w-full bg-[linear-gradient(-90deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.15)_50%,rgba(0,0,0,0)_100%)] bg-[size:8px_100%]" />
        </div>

        {/* Video Player Render */}
        <div className="absolute inset-0 px-8 md:px-16 py-2 z-0">
          {!embed ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-muted-foreground p-6">
              <div
                className="size-14 rounded-full flex items-center justify-center bg-primary/5 border border-primary/20 shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-pulse"
                style={{ color: currentTheme.primaryColor }}
              >
                <Heart className="size-7 fill-current" />
              </div>
              <p className="font-serif text-2xl text-foreground">Waiting for movie ticket...</p>
              <p className="max-w-md text-xs text-muted-foreground/80 leading-relaxed">
                Paste a streaming URL in the admission slot below. Your partner will see it play instantly in perfect synchronization.
              </p>
            </div>
          ) : (
            <div className="w-full h-full rounded-2xl overflow-hidden border border-zinc-900 bg-neutral-950 relative">
               {embed.kind === "iframe" && (
                <iframe
                  ref={iframeRef}
                  key={embed.src}
                  src={embed.src}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="h-full w-full"
                />
              )}
              {embed.kind === "video" && (
                <video
                  ref={videoRef}
                  src={embed.src}
                  controls={isCreator}
                  onPlay={onLocalPlay}
                  onPause={onLocalPause}
                  onSeeked={onLocalSeeked}
                  onLoadedMetadata={syncVideoToLatest}
                  className="h-full w-full"
                />
              )}

              {/* Floating Hearts inside theater */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
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
          )}
        </div>
      </div>

      {/* Symmetrical Theater "Seating Layout" for both Lovers */}
      <div className="grid grid-cols-2 gap-4 md:gap-8 w-full max-w-3xl mt-8 z-10">
        {/* Seat 1: You */}
        <div className="flex flex-col items-center p-3 md:p-4 rounded-2xl bg-card/20 backdrop-blur-xs border border-border/40 relative shadow-sm hover:bg-card/30 transition-colors">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-36 bg-primary/5 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center gap-3">
            <div
              className={`size-10 rounded-full flex items-center justify-center border text-primary shadow-sm relative transition-all duration-300 ${
                myPresence.camOn
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-primary/5 border-primary/20 text-primary"
              }`}
            >
              <Heart className={`size-5 ${!myPresence.camOn ? "fill-current animate-pulse" : "fill-none animate-none"}`} />
              {myPresence.camOn && (
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-400 border-2 border-background" />
              )}
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-serif italic text-muted-foreground uppercase tracking-widest">Row A · Seat 1</span>
              <span className="text-sm font-semibold text-foreground flex items-center gap-1">
                {meName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground bg-background/40 px-2 py-0.5 rounded-full border border-border/20">
            {myPresence.micOn ? (
              <span className="flex items-center gap-1 text-emerald-400"><Mic className="size-2.5" /> Mic live</span>
            ) : (
              <span className="flex items-center gap-1 text-muted-foreground/60"><MicOff className="size-2.5" /> Muted</span>
            )}
            <span className="text-muted-foreground/30">•</span>
            {myPresence.camOn ? (
              <span className="flex items-center gap-1 text-emerald-400"><VideoIcon className="size-2.5" /> Camera on</span>
            ) : (
              <span className="flex items-center gap-1 text-muted-foreground/60"><VideoOff className="size-2.5" /> Camera off</span>
            )}
          </div>
        </div>

        {/* Seat 2: Partner */}
        <div className="flex flex-col items-center p-3 md:p-4 rounded-2xl bg-card/20 backdrop-blur-xs border border-border/40 relative shadow-sm hover:bg-card/30 transition-colors">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-36 bg-primary/5 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center gap-3">
            <div
              className={`size-10 rounded-full flex items-center justify-center border text-primary shadow-sm relative transition-all duration-300 ${
                partnerPresence.camOn
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-primary/5 border-primary/20 text-primary"
              }`}
            >
              <Heart className={`size-5 ${!partnerPresence.camOn ? "fill-current animate-pulse" : "fill-none animate-none"}`} />
              {partnerPresence.camOn && (
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-400 border-2 border-background" />
              )}
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-serif italic text-muted-foreground uppercase tracking-widest">Row A · Seat 2</span>
              <span className="text-sm font-semibold text-foreground flex items-center gap-1">
                {partnerJoined ? "Partner" : "Empty Seat"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground bg-background/40 px-2 py-0.5 rounded-full border border-border/20">
            {!partnerJoined ? (
              <span className="text-muted-foreground/50 italic animate-pulse">Waiting for your love...</span>
            ) : (
              <>
                {partnerPresence.micOn ? (
                  <span className="flex items-center gap-1 text-emerald-400"><Mic className="size-2.5" /> Mic live</span>
                ) : (
                  <span className="flex items-center gap-1 text-muted-foreground/60"><MicOff className="size-2.5" /> Muted</span>
                )}
                <span className="text-muted-foreground/30">•</span>
                {partnerPresence.camOn ? (
                  <span className="flex items-center gap-1 text-emerald-400"><VideoIcon className="size-2.5" /> Camera on</span>
                ) : (
                  <span className="flex items-center gap-1 text-muted-foreground/60"><VideoOff className="size-2.5" /> Camera off</span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Form and Controls underneath */}
      <div className="w-full max-w-3xl mt-8 space-y-4 z-10">
        {!isCreator && (
          <div className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-500 px-4 py-2.5 rounded-full flex items-center justify-center gap-2 font-medium">
            <span>🔒 Control Locked: Only the room creator ({roomCreatorName}) can load movies, play/pause, or trigger countdowns.</span>
          </div>
        )}

        {/* Ticket-styled URL input */}
        <form onSubmit={loadMovie} className="relative flex items-center">
          <Input
            value={movieUrl}
            onChange={(e) => setMovieUrl(e.target.value)}
            placeholder={isCreator ? "Slot in movie or YouTube URL..." : `Controls locked by ${roomCreatorName}`}
            disabled={!isCreator}
            className="h-12 rounded-full border-border bg-card/45 pl-5 pr-28 text-sm focus:ring-2 focus:ring-primary/40 text-foreground shadow-sm"
          />
          <div className="absolute right-1.5 top-1.5 flex gap-1">
            <Button
              type="submit"
              size="sm"
              disabled={!isCreator}
              className="h-9 rounded-full px-5 font-semibold text-xs transition-all active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: currentTheme.primaryColor }}
            >
              Play Link
            </Button>
          </div>
        </form>

        {/* Cinematic features toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/25 p-3 backdrop-blur-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={startCountdown}
              disabled={!isCreator}
              className="rounded-full h-8 text-xs font-semibold flex items-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <Timer className="size-3.5" /> Settle Curtains (Countdown)
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={rouletteSpin}
              disabled={!isCreator}
              className="rounded-full h-8 text-xs font-semibold flex items-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <Dice5 className="size-3.5" /> Film Roulette
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => addToQueue(movieUrl)}
              className="rounded-full h-8 text-xs font-semibold flex items-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
              disabled={!isCreator || !movieUrl.trim()}
            >
              <Plus className="size-3.5" /> Save Lineup
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Reactions */}
            <div className="flex items-center gap-1.5">
              {["❤️", "🍿", "🍷", "💋", "✨"].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onSendHeartReaction(emoji)}
                  className="hover:scale-130 active:scale-95 transition-transform px-1 cursor-pointer select-none text-base drop-shadow-sm"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-border/40" />

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setWarmGlow((w) => !w)}
              className="rounded-full size-8 p-0 text-muted-foreground hover:text-foreground"
              title="Warm candlelight mode"
            >
              {warmGlow ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </div>
        </div>

        {/* Ambient audio toggles */}
        <div className="flex flex-wrap items-center justify-center gap-4 py-2">
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mr-1">
            Ambient White Noise:
          </span>
          {[
            { id: "off", label: "Silence", icon: VolumeX },
            { id: "rain", label: "Rain cabin", icon: Flame },
            { id: "fire", label: "Fireplace", icon: Flame },
            { id: "city", label: "City twilight", icon: Flame },
          ].map((item) => {
            const isSelected = ambient === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setAmbientSound(item.id as any)}
                className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full transition-all border ${
                  isSelected
                    ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                    : "bg-transparent border-transparent text-muted-foreground/70 hover:text-foreground"
                }`}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Theme Quote */}
      <p className="mt-8 text-xs text-muted-foreground/50 font-serif italic max-w-sm text-center">
        "{currentTheme.quote}"
      </p>
    </div>
  );
}

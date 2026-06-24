import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Heart, Sparkles, LogIn, UserPlus, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Clear error on toggle
  useEffect(() => {
    setError(null);
  }, [isSignUp]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Using signInWithPopup because redirect doesn't work well in sandboxed iframes
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Sync user profile to Firestore
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(
        userDocRef,
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || "Someone Precious",
          photoURL: user.photoURL || null,
          lastLogin: Date.now(),
        },
        { merge: true }
      );

      toast.success(`Welcome back, ${user.displayName || "sweetheart"}! ❤️`);
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      let errMsg = "Could not sign in with Google. Please try again.";
      if (err.message?.includes("popup-blocked")) {
        errMsg = "Popup blocked by browser. Please allow popups for this site.";
      }
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (isSignUp && !displayName) {
      setError("Please enter your name.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // Sign Up Flow
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;

        // Update profile display name
        await updateProfile(user, {
          displayName: displayName,
        });

        // Sync user to Firestore
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: displayName,
          lastLogin: Date.now(),
          createdAt: Date.now(),
        });

        toast.success(`Sanctuary created! Welcome, ${displayName}! 🍿`);
      } else {
        // Sign In Flow
        const result = await signInWithEmailAndPassword(auth, email, password);
        const user = result.user;
        
        // Sync last login
        await setDoc(doc(db, "users", user.uid), {
          lastLogin: Date.now(),
        }, { merge: true });

        toast.success(`Welcome back, ${user.displayName || "sweetheart"}! ❤️`);
      }
    } catch (err: any) {
      console.error("Email Auth Error:", err);
      let friendlyMsg = err.message || "An authentication error occurred.";
      if (err.code === "auth/email-already-in-use") {
        friendlyMsg = "This email is already registered. Please sign in.";
      } else if (err.code === "auth/wrong-password" || err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        friendlyMsg = "Incorrect email or password. Please try again.";
      } else if (err.code === "auth/invalid-email") {
        friendlyMsg = "Please enter a valid email address.";
      }
      setError(friendlyMsg);
      toast.error(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#0b0813] text-[#f3eeea] overflow-hidden px-4">
      {/* Background radial romance lights */}
      <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:radial-gradient(circle_at_15%_20%,oklch(0.6_0.22_15/0.25),transparent_40%),radial-gradient(circle_at_85%_70%,oklch(0.5_0.18_0/0.3),transparent_45%)]" />

      {/* Raining tiny glowing hearts */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${12 + Math.random() * 12}s`,
              fontSize: `${12 + Math.random() * 16}px`,
            }}
            className="absolute -top-10 text-primary animate-[driftDown_15s_linear_infinite]"
          >
            ❤️
          </div>
        ))}
      </div>

      <div className="relative w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 border border-primary/20 shadow-[0_0_20px_rgba(239,68,68,0.25)] animate-pulse mb-3">
            <Heart className="size-7 fill-primary text-primary" />
          </div>
          <h1 className="font-serif text-4xl tracking-wide font-bold">Moonpie</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
            A private cinema sanctuary for two. Watch your favorite movies side-by-side, in sync.
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-card/40 backdrop-blur-xl border border-border/80 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Your Name
                </label>
                <Input
                  type="text"
                  placeholder="E.g., Jack"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={loading}
                  className="h-11 rounded-xl border-border bg-background/50 focus:ring-2 focus:ring-primary/40 text-base md:text-sm"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="you@love.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-11 rounded-xl border-border bg-background/50 focus:ring-2 focus:ring-primary/40 text-base md:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-11 rounded-xl border-border bg-background/50 focus:ring-2 focus:ring-primary/40 text-base md:text-sm"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive animate-in fade-in slide-in-from-bottom-1">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
            >
              {loading ? (
                <Loader2 className="size-4.5 animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="size-4.5" />
                  Create Cinema Seat
                </>
              ) : (
                <>
                  <LogIn className="size-4.5" />
                  Enter Sanctuary
                </>
              )}
            </Button>
          </form>

          {/* Social Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest text-muted-foreground">
              <span className="bg-transparent px-3 text-[10px]">Or connect with</span>
            </div>
          </div>

          {/* Google Sign-In */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            variant="outline"
            className="w-full h-11 rounded-xl border-border hover:bg-muted bg-background/30 font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
          >
            {loading ? (
              <Loader2 className="size-4.5 animate-spin" />
            ) : (
              <>
                <svg className="size-4.5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22-.19-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google Account
              </>
            )}
          </Button>

          {/* Toggle Screen Mode */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            {isSignUp ? "Already have a ticket?" : "First time watching together?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={loading}
              className="text-primary hover:underline font-semibold focus:outline-none"
            >
              {isSignUp ? "Sign In" : "Sign Up For Free"}
            </button>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes driftDown {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.5;
          }
          90% {
            opacity: 0.5;
          }
          100% {
            transform: translateY(105vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

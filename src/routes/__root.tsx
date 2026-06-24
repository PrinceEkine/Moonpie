import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { AuthScreen } from "../components/AuthScreen";
import { Heart } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";

// Prevent cross-origin iframe or browser-extension script errors from triggering full app crashes
if (typeof window !== "undefined") {
  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    const msgStr = String(message || "");
    const srcStr = String(source || "");
    if (
      msgStr.includes("Script error") ||
      msgStr === "Script error." ||
      srcStr.includes("youtube.com") ||
      srcStr.includes("google.com") ||
      srcStr.includes("doubleclick")
    ) {
      console.warn("Muted cross-origin or third-party iframe script error:", message, source);
      return true; // Stop event propagation
    }
    if (originalOnError) {
      return originalOnError.apply(window, [message, source, lineno, colno, error]);
    }
    return false;
  };

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const reasonStr = String(reason?.message || reason || "");
    if (
      reasonStr.includes("Script error") ||
      reasonStr.includes("youtube") ||
      reasonStr.includes("widget") ||
      reasonStr.includes("google.com")
    ) {
      event.preventDefault();
      event.stopPropagation();
      console.warn("Muted generic third-party promise rejection:", reason);
    }
  });

  window.addEventListener(
    "error",
    (event) => {
      const msgStr = String(event.message || "");
      if (msgStr.includes("Script error") || msgStr === "Script error.") {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true,
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Moonpie — watch movies together, apart" },
      {
        name: "description",
        content:
          "Share a movie and a live video call with the person you love, no matter the distance.",
      },
      { name: "author", content: "Moonpie" },
      { property: "og:title", content: "Moonpie — watch movies together, apart" },
      {
        property: "og:description",
        content: "Share a movie and a live video call with the person you love.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0813]">
        <div className="flex flex-col items-center gap-4 text-center">
          <Heart className="size-12 fill-primary text-primary animate-[heartBeat_1.2s_infinite]" />
          <p className="font-serif text-lg text-muted-foreground/80 italic">Opening the cinema curtains...</p>
        </div>
        <style>{`
          @keyframes heartBeat {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { getRouter, startInstance } from "../router";

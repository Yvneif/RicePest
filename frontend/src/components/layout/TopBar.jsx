import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Download, Moon, Sun, Leaf } from "lucide-react";
import { useOnline } from "../../hooks/useOnline";
import { getStoredTheme, applyTheme } from "../../lib/device";

/** Top bar with brand, theme toggle, offline indicator. */
export function TopBar({ title = "Rice Pest Identifier", backTo = null }) {
  const online = useOnline();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(getStoredTheme());

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  return (
    <header className="sticky top-0 z-30 pt-safe">
      <div className="glass flex items-center gap-3 px-4 py-3 dark:bg-ink/70">
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            className="btn-press -ml-1 rounded-full p-2 hover:bg-stone-200/60 dark:hover:bg-white/10"
            aria-label="Back"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-700 text-white shadow-soft">
            <Leaf className="h-5 w-5" />
          </span>
          <span className="truncate font-display text-[15px] font-bold tracking-tight">
            {title}
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <AnimatePresence>
            {!online && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="mr-1"
              >
                <WifiOff className="h-4 w-4 text-gold-600" aria-label="Offline" />
              </motion.span>
            )}
          </AnimatePresence>
          <button
            onClick={toggleTheme}
            className="btn-press rounded-full p-2 text-stone-500 hover:bg-stone-200/60 dark:text-stone-400 dark:hover:bg-white/10"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </button>
        </div>
      </div>
    </header>
  );
}

/** Prompts the user to install the PWA when the browser offers it. */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem("ricepest.installDismissed") === "1",
  );

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferred || dismissed) return null;

  const install = async () => {
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      className="glass flex items-center gap-3 rounded-3xl p-4"
    >
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-700 text-white">
        <Download className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Install RicePest</p>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Works offline, straight from your home screen.
        </p>
      </div>
      <button
        onClick={install}
        className="btn-press rounded-xl bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white"
      >
        Install
      </button>
      <button
        onClick={() => {
          localStorage.setItem("ricepest.installDismissed", "1");
          setDismissed(true);
        }}
        className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200/60 dark:hover:bg-white/10"
        aria-label="Dismiss"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>
    </motion.div>
  );
}

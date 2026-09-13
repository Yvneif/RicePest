import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, BookOpen, FlaskConical, ShieldCheck, WifiOff, Sparkles } from "lucide-react";
import { Card, Chip, Stagger, staggerItem } from "../components/ui/Primitives";
import { InstallPrompt } from "../components/layout/TopBar";
import { useOnline } from "../hooks/useOnline";
import { listPendingScans } from "../lib/offlineQueue";
import { useEffect, useState } from "react";

const FEATURES = [
  {
    icon: Camera,
    title: "Scan",
    text: "Point your camera at the pest — the model does the rest.",
    to: "/identify",
  },
  {
    icon: BookOpen,
    title: "Library",
    text: "Browse the pest catalog with photos and damage signs.",
    to: "/catalog",
  },
  {
    icon: FlaskConical,
    title: "Treat",
    text: "Get the recommended eradication technique in a few taps.",
    to: "/recommend",
  },
];

export function HomePage() {
  const online = useOnline();
  const [pending, setPending] = useState(0);
  useEffect(() => {
    listPendingScans().then((items) => setPending(items.length));
  }, [online]);

  return (
    <div className="mx-auto max-w-md px-4 pb-32">
      <Stagger>
        <motion.section
          variants={staggerItem}
          className="relative mt-4 overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-6 pb-8 pt-10 text-white shadow-lift"
        >
          <svg
            className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 opacity-15"
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <path d="M50 0c20 10 40 30 40 50S70 100 50 90 10 70 10 50 30-10 50 0z" />
          </svg>
          <Chip className="bg-white/15 text-brand-50">
            <Sparkles className="h-3 w-3" /> AI rice pest identification
          </Chip>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight">
            Protect your palay,
            <br />
            scan the pest.
          </h1>
          <p className="mt-2 max-w-[30ch] text-sm text-brand-100">
            Identify rice pests in seconds and get the recommended eradication technique — kahit
            walang internet.
          </p>
          <Link
            to="/identify"
            className="btn-press mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 font-semibold text-brand-800 shadow-lift"
          >
            <Camera className="h-5 w-5" /> Scan a pest
          </Link>
        </motion.section>

        {!online && (
          <motion.div variants={staggerItem} className="mt-4">
            <Card className="flex items-center gap-3 p-4">
              <WifiOff className="h-5 w-5 shrink-0 text-gold-600" />
              <p className="text-sm text-stone-600 dark:text-stone-300">
                You are offline. Scans you take are saved and synced automatically.
                {pending > 0 && ` ${pending} scan${pending > 1 ? "s" : ""} waiting.`}
              </p>
            </Card>
          </motion.div>
        )}

        <motion.div variants={staggerItem} className="mt-4">
          <InstallPrompt />
        </motion.div>

        <motion.div variants={staggerItem} className="mt-4 grid gap-3">
          {FEATURES.map(({ icon: Icon, title, text, to }) => (
            <Link key={to} to={to} className="btn-press block">
              <Card className="flex items-center gap-4 p-4 hover:shadow-lift">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold">{title}</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">{text}</p>
                </div>
              </Card>
            </Link>
          ))}
        </motion.div>

        <motion.p
          variants={staggerItem}
          className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-stone-400 dark:text-stone-500"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Photos stay on your device unless you identify them
        </motion.p>
      </Stagger>
    </div>
  );
}

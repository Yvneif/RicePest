import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  FlaskConical,
  Leaf,
  Package,
  ShieldAlert,
  Sun,
  CloudRain,
  Bug,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "../components/ui/Button";
import { Card, Chip, EmptyState } from "../components/ui/Primitives";
import { TopBar } from "../components/layout/TopBar";
import { api } from "../api/client";

const PESTS = [
  { value: "Green Leafhopper", icon: Leaf },
  { value: "Leaf Folders", icon: Bug },
  { value: "Rice Bug", icon: Bug },
  { value: "Stem Borer", icon: Bug },
];

const DENSITY_HINTS = [
  { max: 4, label: "Maritak", hint: "only a few pests" },
  { max: 60, label: "Marakal", hint: "moderate number" },
  { max: 150, label: "Sobra Karakal", hint: "a lot of pests" },
  { max: Infinity, label: "Ali na Abilang", hint: "countless pests" },
];

function densityFor(count) {
  return DENSITY_HINTS.find((d) => count <= d.max);
}

export function RecommendPage() {
  const location = useLocation();
  const prefill = location.state?.pest;
  const [pest, setPest] = useState(prefill ?? null);
  const [season, setSeason] = useState(null);
  const [count, setCount] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const step = useMemo(() => {
    if (result) return 4;
    if (!pest) return 1;
    if (!season) return 2;
    return 3;
  }, [pest, season, result]);

  const submit = async () => {
    const parsed = Number.parseInt(count, 10);
    if (!pest || !season || Number.isNaN(parsed) || parsed < 0) {
      toast.error("Fill in all fields first.");
      return;
    }
    setBusy(true);
    try {
      const data = await api.post("/api/recommend", {
        pestType: pest,
        season,
        pestCount: parsed,
      });
      setResult(data);
    } catch (err) {
      toast.error(err.message ?? "Could not get a recommendation.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setResult(null);
  };

  return (
    <div className="pb-32">
      <TopBar title="Treatment" />
      <div className="mx-auto max-w-md px-4">
        {/* Progress */}
        <div className="mt-4 flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200/70 dark:bg-white/10"
            >
              <motion.div
                className="h-full rounded-full bg-brand-600 dark:bg-brand-400"
                initial={false}
                animate={{ width: step >= s ? "100%" : "0%" }}
                transition={{ duration: 0.35 }}
              />
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="mt-5 space-y-4"
            >
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-br from-brand-700 to-brand-600 px-6 py-6 text-white">
                  <Chip className="bg-white/15 text-brand-50">
                    {result.density} · {result.season}
                  </Chip>
                  <h2 className="mt-2 font-display text-xl font-bold leading-snug">
                    {result.technique.name}
                  </h2>
                  <p className="mt-1 text-sm text-brand-100">
                    Recommended for {result.pestType} ({result.pestCount} counted)
                  </p>
                </div>
                <div className="space-y-5 p-6">
                  <section>
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-400">
                      <FlaskConical className="h-4 w-4" /> What to do
                    </h3>
                    <ol className="mt-2 space-y-2">
                      {result.technique.steps.map((s, i) => (
                        <li
                          key={i}
                          className="flex gap-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300"
                        >
                          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-800 dark:bg-brand-600/25 dark:text-brand-200">
                            {i + 1}
                          </span>
                          {s}
                        </li>
                      ))}
                    </ol>
                  </section>
                  {result.technique.materials.length > 0 && (
                    <section>
                      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-400">
                        <Package className="h-4 w-4" /> Materials
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {result.technique.materials.map((m) => (
                          <Chip key={m} tone="neutral">
                            {m}
                          </Chip>
                        ))}
                      </div>
                    </section>
                  )}
                  {result.technique.precautions.length > 0 && (
                    <section className="rounded-2xl bg-gold-400/10 p-4 dark:bg-gold-400/5">
                      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gold-600 dark:text-gold-400">
                        <ShieldAlert className="h-4 w-4" /> Precautions
                      </h3>
                      <ul className="mt-2 space-y-1.5">
                        {result.technique.precautions.map((p, i) => (
                          <li
                            key={i}
                            className="text-sm leading-relaxed text-stone-600 dark:text-stone-300"
                          >
                            {p}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              </Card>
              <Button variant="secondary" size="lg" className="w-full" onClick={reset}>
                Start over
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="wizard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-5 space-y-6"
            >
              {/* Step 1 - pest */}
              <section>
                <h3 className="mb-2 flex items-center gap-2 font-display font-bold">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-700 text-xs text-white">
                    1
                  </span>
                  Which pest?
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {PESTS.map(({ value, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setPest(value)}
                      className={`btn-press flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left ${
                        pest === value
                          ? "border-brand-600 bg-brand-50 dark:bg-brand-600/15"
                          : "border-transparent bg-white shadow-soft dark:bg-stone-900 dark:ring-1 dark:ring-white/10"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${pest === value ? "text-brand-700 dark:text-brand-300" : "text-stone-400"}`}
                      />
                      <span className="text-sm font-semibold">{value}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Step 2 - season */}
              <section className={pest ? "" : "pointer-events-none opacity-40"}>
                <h3 className="mb-2 flex items-center gap-2 font-display font-bold">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-700 text-xs text-white">
                    2
                  </span>
                  Season
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "sunny", icon: Sun, label: "Sunny" },
                    { value: "rainy", icon: CloudRain, label: "Rainy" },
                  ].map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => setSeason(value)}
                      className={`btn-press flex items-center justify-center gap-2 rounded-2xl border-2 p-4 ${
                        season === value
                          ? "border-brand-600 bg-brand-50 font-semibold dark:bg-brand-600/15"
                          : "border-transparent bg-white shadow-soft dark:bg-stone-900 dark:ring-1 dark:ring-white/10"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${season === value ? "text-brand-700 dark:text-brand-300" : "text-stone-400"}`}
                      />
                      <span className="text-sm">{label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Step 3 - count */}
              <section className={season ? "" : "pointer-events-none opacity-40"}>
                <h3 className="mb-2 flex items-center gap-2 font-display font-bold">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-700 text-xs text-white">
                    3
                  </span>
                  How many pests did you count?
                </h3>
                <Card className="p-4">
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    placeholder="e.g. 25"
                    className="w-full rounded-xl border border-stone-200 bg-transparent px-4 py-3 text-lg font-semibold outline-none focus:border-brand-600 dark:border-white/15 dark:focus:border-brand-400"
                  />
                  {count !== "" &&
                    !Number.isNaN(Number.parseInt(count, 10)) &&
                    Number.parseInt(count, 10) >= 0 && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                        <Check className="h-3.5 w-3.5 text-brand-600" />
                        {densityFor(Number.parseInt(count, 10)).label} —{" "}
                        {densityFor(Number.parseInt(count, 10)).hint}
                      </div>
                    )}
                </Card>
              </section>

              <Button size="lg" className="w-full" onClick={submit} disabled={busy}>
                {busy ? "Getting recommendation…" : "Get recommendation"}
                {!busy && <ArrowRight className="h-5 w-5" />}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {!result && !pest && (
          <div className="mt-6">
            <EmptyState
              icon={FlaskConical}
              title="Not sure which pest?"
              subtitle="Scan it first and we'll fill this in for you."
            />
          </div>
        )}
      </div>
    </div>
  );
}

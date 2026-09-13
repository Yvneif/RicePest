import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Camera, Search, X } from "lucide-react";

import {
  Card,
  Chip,
  EmptyState,
  Skeleton,
  Stagger,
  staggerItem,
} from "../components/ui/Primitives";
import { TopBar } from "../components/layout/TopBar";
import { useApi } from "../hooks/useApi";

export function CatalogPage() {
  const { data, loading, error } = useApi("/api/catalog");
  const [query, setQuery] = useState("");
  const [openSlug, setOpenSlug] = useState(null);

  const items = useMemo(() => data?.items ?? [], [data]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.scientificName ?? "").toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  const openItem = items.find((i) => i.slug === openSlug);

  return (
    <div className="pb-32">
      <TopBar title="Pest Library" />
      <div className="mx-auto max-w-md px-4">
        <div className="glass mt-4 flex items-center gap-2 rounded-2xl px-4 py-3">
          <Search className="h-4.5 w-4.5 text-stone-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pests…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search">
              <X className="h-4 w-4 text-stone-400" />
            </button>
          )}
        </div>

        {loading && (
          <div className="mt-4 grid gap-3">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </div>
        )}
        {error && (
          <p className="mt-6 text-center text-sm text-red-500">
            Could not load the catalog: {error.message}
          </p>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="mt-4">
            <EmptyState
              icon={BookOpen}
              title={query ? "No matches" : "Catalog is empty"}
              subtitle={
                query ? "Try a different search term." : "Seed the backend to populate the library."
              }
            />
          </div>
        )}

        <Stagger className="mt-4 grid gap-3">
          {filtered.map((item) => (
            <motion.button
              variants={staggerItem}
              key={item.slug}
              onClick={() => setOpenSlug(item.slug)}
              className="btn-press text-left"
            >
              <Card className="overflow-hidden hover:shadow-lift">
                <div className="relative h-40 w-full overflow-hidden bg-brand-100 dark:bg-brand-900/40">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-brand-300">
                      <BookOpen className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute right-3 top-3">
                    <Chip tone={item.status === "available" ? "brand" : "neutral"}>
                      {item.status}
                    </Chip>
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-display text-lg font-bold">{item.title}</p>
                  {item.scientificName && (
                    <p className="text-xs italic text-stone-400">{item.scientificName}</p>
                  )}
                  <p className="mt-1.5 line-clamp-2 text-sm text-stone-500 dark:text-stone-400">
                    {item.description}
                  </p>
                </div>
              </Card>
            </motion.button>
          ))}
        </Stagger>
      </div>

      <AnimatePresence>
        {openItem && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenSlug(null)}
          >
            <motion.div
              className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-paper p-6 pb-10 dark:bg-stone-900"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-stone-300 dark:bg-white/20" />
              {openItem.imageUrl && (
                <img
                  src={openItem.imageUrl}
                  alt={openItem.title}
                  className="h-48 w-full rounded-2xl object-cover"
                />
              )}
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl font-bold">{openItem.title}</h3>
                  {openItem.scientificName && (
                    <p className="text-sm italic text-stone-400">{openItem.scientificName}</p>
                  )}
                </div>
                <Chip tone={openItem.status === "available" ? "brand" : "neutral"}>
                  {openItem.status}
                </Chip>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                {openItem.description}
              </p>
              {openItem.damageSigns && (
                <div className="mt-4 rounded-2xl bg-gold-400/10 p-4 dark:bg-gold-400/5">
                  <p className="text-xs font-bold uppercase tracking-wide text-gold-600 dark:text-gold-400">
                    Damage signs
                  </p>
                  <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                    {openItem.damageSigns}
                  </p>
                </div>
              )}
              <Link
                to="/identify"
                className="btn-press mt-5 flex items-center justify-center gap-2 rounded-2xl bg-brand-700 px-5 py-3.5 font-semibold text-white"
              >
                <Camera className="h-5 w-5" /> Identify this pest
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

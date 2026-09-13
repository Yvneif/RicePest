import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { History, Camera } from "lucide-react";

import { Button } from "../components/ui/Button";
import {
  Card,
  Chip,
  EmptyState,
  Skeleton,
  Stagger,
  staggerItem,
} from "../components/ui/Primitives";
import { TopBar } from "../components/layout/TopBar";
import { useOnline } from "../hooks/useOnline";
import { useApi } from "../hooks/useApi";
import { formatDay, formatDateTime, formatPercent } from "../lib/device";
import { listPendingScans, syncPendingScans } from "../lib/offlineQueue";
import { toast } from "sonner";

export function HistoryPage() {
  const online = useOnline();
  const { data, loading, error, refetch } = useApi("/api/scans");
  const [pending, setPending] = useState(0);

  const refreshPending = () => listPendingScans().then((items) => setPending(items.length));

  useEffect(() => {
    refreshPending();
    if (online && pending > 0) {
      syncPendingScans(async (blob) => {
        const form = new FormData();
        form.append("image", blob, "scan.jpg");
        const res = await fetch("/api/predict", {
          method: "POST",
          headers: { "X-Device-Id": localStorage.getItem("ricepest.deviceId") ?? "" },
          body: form,
        });
        if (!res.ok) throw new Error("sync failed");
        refetch();
      }).then((synced) => {
        if (synced > 0) {
          toast.success(`Synced ${synced} offline scan${synced > 1 ? "s" : ""}`);
          refreshPending();
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const scans = data?.scans ?? [];

  // Group by calendar day
  const groups = [];
  for (const scan of scans) {
    const day = formatDay(scan.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.scans.push(scan);
    else groups.push({ day, scans: [scan] });
  }

  return (
    <div className="pb-32">
      <TopBar title="Scan History" />
      <div className="mx-auto max-w-md px-4">
        {pending > 0 && (
          <Card className="mt-4 flex items-center gap-3 p-4">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-gold-500" />
            <p className="text-sm text-stone-600 dark:text-stone-300">
              {pending} offline scan{pending > 1 ? "s" : ""} waiting to sync.
            </p>
          </Card>
        )}

        {loading && (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        )}

        {error && (
          <p className="mt-6 text-center text-sm text-red-500">
            Could not load history: {error.message}
          </p>
        )}

        {!loading && !error && scans.length === 0 && (
          <div className="mt-4">
            <EmptyState
              icon={History}
              title="No scans yet"
              subtitle="Identify your first pest and it will show up here."
              action={
                <Link to="/identify">
                  <Button size="md">
                    <Camera className="h-4 w-4" /> Scan a pest
                  </Button>
                </Link>
              }
            />
          </div>
        )}

        <Stagger className="mt-4 space-y-5">
          {groups.map((group) => (
            <motion.section variants={staggerItem} key={group.day}>
              <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-stone-400">
                {group.day}
              </h3>
              <div className="space-y-3">
                {group.scans.map((scan) => (
                  <Card key={scan.id} className="flex items-center gap-4 p-3">
                    <img
                      src={scan.imageUrl}
                      alt={scan.label}
                      loading="lazy"
                      className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display font-bold">{scan.label}</p>
                      <p className="text-xs text-stone-400">{formatDateTime(scan.createdAt)}</p>
                    </div>
                    <Chip tone={scan.label === "Unrecognized" ? "neutral" : "brand"}>
                      {formatPercent(scan.confidence)}
                    </Chip>
                  </Card>
                ))}
              </div>
            </motion.section>
          ))}
        </Stagger>
      </div>
    </div>
  );
}

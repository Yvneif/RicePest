import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ScanLine, BookOpen, Users, Gauge } from "lucide-react";

import { Card, Chip, Skeleton } from "../../components/ui/Primitives";
import { AdminLayout } from "./Shared";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import { formatPercent } from "../../lib/device";

const PIE_COLORS = ["#16a34a", "#f59e0b", "#0ea5e9", "#a855f7", "#78716c"];

function Kpi({ icon: Icon, label, value }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-stone-400">{label}</p>
          <motion.p
            className="font-display text-xl font-bold"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {value ?? "—"}
          </motion.p>
        </div>
      </div>
    </Card>
  );
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error } = useApi(user ? "/api/admin/stats" : null);

  useEffect(() => {
    if (user === null) navigate("/admin/login", { replace: true });
  }, [user, navigate]);

  if (user === undefined || loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="mt-4 h-64" />
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Dashboard">
        <p className="text-sm text-red-500">Failed to load stats: {error.message}</p>
      </AdminLayout>
    );
  }

  const totals = data?.totals ?? {};
  const avg = data?.avgConfidence;
  const perDay = data?.perDay ?? [];
  const pestMix = data?.pestMix ?? [];
  const recent = data?.recentScans ?? [];

  return (
    <AdminLayout title="Dashboard">
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi icon={ScanLine} label="Total scans" value={totals.scans} />
        <Kpi icon={BookOpen} label="Catalog items" value={totals.catalogItems} />
        <Kpi icon={Users} label="Users" value={totals.users} />
      </div>

      <Card className="mt-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold">Scans per day</h3>
          <span className="text-xs text-stone-400">last 14 days</span>
        </div>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={perDay} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="scanFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                opacity={0.12}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => d.slice(5)}
                tick={{ fontSize: 11 }}
                stroke="currentColor"
                opacity={0.5}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                stroke="currentColor"
                opacity={0.5}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "none",
                  boxShadow: "0 8px 30px rgb(0 0 0 / 0.12)",
                }}
                labelFormatter={(d) => `Date: ${d}`}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#16a34a"
                strokeWidth={2.5}
                fill="url(#scanFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-display font-bold">Pest mix</h3>
          {pestMix.length === 0 ? (
            <p className="mt-6 text-center text-sm text-stone-400">No scans yet.</p>
          ) : (
            <div className="mt-2 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pestMix}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {pestMix.map((entry, i) => (
                      <Cell key={entry.label} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {pestMix.map((entry, i) => (
              <Chip key={entry.label} tone="neutral">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                {entry.label} ({entry.count})
              </Chip>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="flex items-center gap-2 font-display font-bold">
            <Gauge className="h-4 w-4 text-brand-600" /> Avg confidence
          </h3>
          <p className="mt-3 font-display text-4xl font-bold text-brand-700 dark:text-brand-300">
            {avg != null ? formatPercent(avg) : "—"}
          </p>
          <h3 className="mt-6 font-display font-bold">Recent scans</h3>
          <div className="mt-2 space-y-2">
            {recent.slice(0, 5).map((scan) => (
              <div key={scan.id} className="flex items-center gap-3">
                <img src={scan.imageUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
                <span className="min-w-0 flex-1 truncate text-sm">{scan.label}</span>
                <span className="text-xs tabular-nums text-stone-400">
                  {formatPercent(scan.confidence)}
                </span>
              </div>
            ))}
            {recent.length === 0 && <p className="text-sm text-stone-400">Nothing yet.</p>}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

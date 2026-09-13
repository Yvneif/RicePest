import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Leaf, LogOut, LayoutDashboard, BookOpen, Users, ArrowLeft } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const TABS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/catalog", label: "Catalog", icon: BookOpen },
  { to: "/admin/users", label: "Users", icon: Users },
];

export function AdminLayout({ title, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh">
      <header className="glass sticky top-0 z-30 pt-safe dark:bg-ink/70">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            to="/"
            className="btn-press -ml-1 rounded-full p-2 hover:bg-stone-200/60 dark:hover:bg-white/10"
            aria-label="Back to app"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 text-white">
            <Leaf className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-[15px] font-bold">{title ?? "Admin"}</p>
            {user && <p className="text-xs text-stone-400">{user.username}</p>}
          </div>
          <button
            onClick={async () => {
              await logout();
              navigate("/admin/login");
            }}
            className="btn-press ml-auto rounded-xl p-2.5 text-stone-500 hover:bg-stone-200/60 dark:text-stone-400 dark:hover:bg-white/10"
            aria-label="Log out"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 px-4 pb-2">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold ${
                  isActive
                    ? "bg-brand-700 text-white shadow-soft"
                    : "text-stone-500 hover:bg-stone-200/60 dark:text-stone-400 dark:hover:bg-white/10"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}

export function AdminLoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate("/admin", { replace: true });
  }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-[2rem] bg-white p-7 shadow-lift dark:bg-stone-900 dark:ring-1 dark:ring-white/10"
      >
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-700 text-white">
          <Leaf className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-center font-display text-xl font-bold">Admin sign in</h1>
        <p className="mt-1 text-center text-sm text-stone-500 dark:text-stone-400">
          Rice Pest Identifier dashboard
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            className="w-full rounded-xl border border-stone-200 bg-transparent px-4 py-3 text-sm outline-none focus:border-brand-600 dark:border-white/15 dark:focus:border-brand-400"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="w-full rounded-xl border border-stone-200 bg-transparent px-4 py-3 text-sm outline-none focus:border-brand-600 dark:border-white/15 dark:focus:border-brand-400"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="btn-press w-full rounded-xl bg-brand-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

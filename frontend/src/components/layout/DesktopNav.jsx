import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, Home, BookOpen, History, FlaskConical, Leaf, WifiOff } from "lucide-react";
import { useOnline } from "../../hooks/useOnline";

const TABS = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/identify", label: "Identify", icon: Camera },
  { to: "/catalog", label: "Library", icon: BookOpen },
  { to: "/recommend", label: "Treat", icon: FlaskConical },
  { to: "/history", label: "History", icon: History },
];

/** Top navigation bar for laptops and desktops; replaces the phone bottom tabs. */
export function DesktopNav() {
  const location = useLocation();
  const online = useOnline();
  return (
    <header className="glass sticky top-0 z-30 hidden lg:block">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-8 py-3">
        <NavLink to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 text-white shadow-soft">
            <Leaf className="h-5 w-5" />
          </span>
          <span className="font-display text-[15px] font-bold tracking-tight">
            Rice Pest Identifier
          </span>
        </NavLink>
        <nav className="ml-auto flex items-center gap-1">
          {TABS.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? location.pathname === to : location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                className="relative flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-semibold"
              >
                {active && (
                  <motion.span
                    layoutId="desktop-tab-pill"
                    className="absolute inset-0 rounded-2xl bg-brand-600/10"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon
                  className={`relative h-4 w-4 ${active ? "text-brand-700" : "text-stone-400"}`}
                />
                <span className={`relative ${active ? "text-brand-700" : "text-stone-500"}`}>
                  {label}
                </span>
              </NavLink>
            );
          })}
        </nav>
        {!online && <WifiOff className="h-4 w-4 shrink-0 text-gold-600" aria-label="Offline" />}
      </div>
    </header>
  );
}

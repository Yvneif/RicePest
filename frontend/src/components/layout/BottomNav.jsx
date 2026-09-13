import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, Home, BookOpen, History, FlaskConical } from "lucide-react";

const TABS = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/identify", label: "Identify", icon: Camera },
  { to: "/catalog", label: "Library", icon: BookOpen },
  { to: "/recommend", label: "Treat", icon: FlaskConical },
  { to: "/history", label: "History", icon: History },
];

/** App-style bottom tab bar for phones; a floating pill on desktop. */
export function BottomNav() {
  const location = useLocation();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-safe">
      <div className="glass mx-auto mb-3 flex max-w-md items-center justify-between rounded-3xl px-2 py-1.5 shadow-lift">
        {TABS.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? location.pathname === to : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className="relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-2"
            >
              {active && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-2xl bg-brand-600/10 dark:bg-brand-400/15"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon
                className={`relative h-5 w-5 ${active ? "text-brand-700 dark:text-brand-300" : "text-stone-400 dark:text-stone-500"}`}
              />
              <span
                className={`relative text-[10px] font-semibold ${
                  active
                    ? "text-brand-700 dark:text-brand-300"
                    : "text-stone-400 dark:text-stone-500"
                }`}
              >
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

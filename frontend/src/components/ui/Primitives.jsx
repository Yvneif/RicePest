import { motion } from "framer-motion";

export function Card({ className = "", children, ...props }) {
  return (
    <div className={`card-base ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Chip({ tone = "brand", className = "", children }) {
  const tones = {
    brand: "bg-brand-100 text-brand-800 dark:bg-brand-600/20 dark:text-brand-200",
    gold: "bg-gold-400/20 text-gold-600 dark:text-gold-400",
    neutral: "bg-stone-200/70 text-stone-600 dark:bg-white/10 dark:text-stone-300",
    red: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className = "" }) {
  return (
    <div className={`animate-pulse rounded-2xl bg-stone-200/80 dark:bg-white/10 ${className}`} />
  );
}

export function Spinner({ className = "h-5 w-5" }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}

export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <Card className="flex flex-col items-center gap-3 px-8 py-14 text-center">
      {Icon && (
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {subtitle && (
        <p className="max-w-xs text-sm text-stone-500 dark:text-stone-400">{subtitle}</p>
      )}
      {action}
    </Card>
  );
}

/** Animated SVG confidence ring used on the identification result. */
export function ConfidenceRing({ value = 0, size = 148, label }) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-stone-200 dark:stroke-white/10"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-brand-600 dark:stroke-brand-400"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - value) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <motion.div
            className="font-display text-2xl font-bold"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45 }}
          >
            {(value * 100).toFixed(1)}%
          </motion.div>
          {label && <div className="text-xs text-stone-500 dark:text-stone-400">{label}</div>}
        </div>
      </div>
    </div>
  );
}

/** Staggered list animation wrapper. */
export function Stagger({ children, className = "" }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

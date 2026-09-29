import { motion } from "framer-motion";

const VARIANTS = {
  primary: "bg-brand-700 text-white shadow-soft hover:bg-brand-800 disabled:bg-brand-700/50",
  secondary: "glass text-brand-900 hover:bg-white/90 disabled:opacity-50",
  ghost: "text-stone-600 hover:bg-stone-200/60",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50",
};

const SIZES = {
  sm: "px-3.5 py-2 text-sm rounded-xl gap-1.5",
  md: "px-5 py-2.5 text-[15px] rounded-2xl gap-2",
  lg: "px-6 py-3.5 text-base rounded-2xl gap-2.5",
};

export function Button({ variant = "primary", size = "md", className = "", children, ...props }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      className={`btn-press inline-flex items-center justify-center font-semibold disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}

import { Trophy, Star, Zap } from "lucide-react";
import { motion } from "framer-motion";

const badges = [
  { icon: Trophy, label: "Excel Pro", earned: true },
  { icon: Star, label: "Perfect Attendance", earned: true },
  { icon: Zap, label: "Fast Learner", earned: true },
  { icon: Trophy, label: "Power BI Master", earned: false },
];

export function Gamification() {
  return (
    <div className="bg-card p-6 rounded-xl border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">Achievements</h3>
        <div className="flex items-center gap-1.5 text-accent">
          <Zap size={14} className="fill-accent" />
          <span className="text-sm font-bold tabular-nums">840 pts</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {badges.map((badge, i) => (
          <motion.div
            key={badge.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            className={`flex items-center gap-2 p-2.5 rounded-lg border ${
              badge.earned
                ? "bg-vahani-gold-light border-vahani-gold-border"
                : "bg-secondary border-border opacity-50"
            }`}
          >
            <badge.icon size={14} className={badge.earned ? "text-accent" : "text-muted-foreground"} />
            <span className="text-xs font-semibold">{badge.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

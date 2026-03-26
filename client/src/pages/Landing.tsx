import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, ClipboardList, CalendarCheck, Award, BarChart3, Users,
  ChevronRight, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import vahaniLogo from "@/assets/vahani-logo.png";

const features = [
  { icon: BookOpen, title: "Track Courses & Progress", desc: "Monitor your learning journey with real-time progress tracking across all enrolled courses." },
  { icon: ClipboardList, title: "Assignment Management", desc: "Submit, track, and get graded on assignments with clear deadlines and status updates." },
  { icon: CalendarCheck, title: "Attendance Monitoring", desc: "Stay on top of your attendance with automated tracking and trend analysis." },
  { icon: Award, title: "Certificates & Reports", desc: "Earn certificates on course completion and download detailed performance reports." },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "Visualize your growth with skill radar charts, streaks, and gamification." },
  { icon: Users, title: "Community & Support", desc: "Connect with fellow scholars, access resources, and get AI-powered learning assistance." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={vahaniLogo} alt="Vahani" className="w-9 h-9 rounded-lg" />
            <span className="font-bold text-lg tracking-tight text-foreground">Vahani LMS</span>
          </div>
          <Button asChild className="bg-vahani-blue hover:bg-vahani-blue/90">
            <Link to="/login">Login <ChevronRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-vahani-blue via-primary to-vahani-blue opacity-95" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--vahani-gold)/0.15),transparent_60%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />

        <div className="relative max-w-7xl mx-auto px-6 py-28 md:py-36 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-8">
              <Sparkles size={14} className="text-accent" />
              <span className="text-sm font-medium text-white/90">Vahani Scholarship Trust</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight tracking-tight max-w-3xl mx-auto">
              Welcome to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-yellow-300">
                Vahani LMS
              </span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
              Empowering Scholars. Tracking Growth. Building Futures.
            </p>
            <div className="mt-10">
              <Button size="lg" asChild className="bg-accent text-accent-foreground hover:bg-accent/90 h-12 px-8 text-base font-semibold shadow-lg">
                <Link to="/login">Login to Your Account <ChevronRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-accent uppercase tracking-widest mb-2">Platform Features</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Everything You Need to Succeed</h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              A comprehensive learning management system designed specifically for Vahani scholars.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp}
                className="group p-6 rounded-xl border border-border bg-card hover:shadow-lg hover:border-accent/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <f.icon size={22} className="text-accent" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-vahani-blue to-primary rounded-2xl p-12 md:p-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,hsl(var(--vahani-gold)/0.1),transparent_50%)]" />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Continue Learning?</h2>
            <p className="text-white/70 mb-8 max-w-lg mx-auto">
              Sign in to access your courses, track your progress, and achieve your goals.
            </p>
            <Button size="lg" asChild className="bg-accent text-accent-foreground hover:bg-accent/90 h-12 px-8 text-base font-semibold">
              <Link to="/login">Sign In Now <ChevronRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={vahaniLogo} alt="Vahani" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-foreground">Vahani Scholarship Trust</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Vahani Scholarship Trust. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <span className="hover:text-foreground cursor-pointer transition-colors">Support</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

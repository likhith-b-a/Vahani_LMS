import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  BellRing,
  BookOpenCheck,
  ChartNoAxesCombined,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "../components/ui/button";
import vahaniLogo from "../assets/vahani-logo.png";

const stats = [
  { value: "185+", label: "Scholars supported" },
  { value: "31", label: "States and UTs reached" },
  { value: "106+", label: "Alumni network" },
  { value: "90.4%", label: "Average grades" },
];

const cards = [
  {
    icon: GraduationCap,
    title: "Scholar journeys",
    description:
      "Give scholars one calm space for marks, attendance, enrolments, progress, and certificates.",
    style: {
      background: "linear-gradient(145deg, #0f2660 0%, #1a4fa7 100%)",
      color: "#ffffff",
    },
    iconBg: "rgba(255,255,255,0.16)",
    bodyColor: "rgba(255,255,255,0.78)",
  },
  {
    icon: BookOpenCheck,
    title: "Programme execution",
    description:
      "Run assignments, interactive sessions, evaluation, results, and completion from one workspace.",
    style: {
      background: "linear-gradient(145deg, #fff2c5 0%, #ffd777 100%)",
      color: "#10254d",
    },
    iconBg: "rgba(255,255,255,0.55)",
    bodyColor: "#4b5563",
  },
  {
    icon: ShieldCheck,
    title: "Institutional control",
    description:
      "Track users, reports, analytics, certificates, and programme outcomes with confidence.",
    style: {
      background: "linear-gradient(145deg, #173b88 0%, #0f2660 100%)",
      color: "#ffffff",
    },
    iconBg: "rgba(255,255,255,0.16)",
    bodyColor: "rgba(255,255,255,0.78)",
  },
];

const capabilities = [
  {
    icon: BellRing,
    title: "Notifications",
    blurb: "Enrolments, attendance, marks, and operational updates.",
  },
  {
    icon: Award,
    title: "Certificates",
    blurb: "Credential IDs and QR-based verification.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Analytics",
    blurb: "Scholar, programme, and operations visibility.",
  },
  {
    icon: Users,
    title: "Role workflows",
    blurb: "Built separately for scholars, managers, and admins.",
  },
];

export default function Landing() {
  return (
    <div
      className="min-h-screen text-slate-900"
      style={{
        background:
          "linear-gradient(180deg, #fbf3e5 0%, #f7efde 46%, #eef4fb 100%)",
      }}
    >
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-xl"
        style={{
          background: "rgba(248, 242, 231, 0.94)",
          borderColor: "#e8dcc7",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-4">
            <img src={vahaniLogo} alt="Vahani" className="h-11 w-auto" />
            <div className="hidden sm:block">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#163c8d]">
                Vahani LMS
              </p>
              <p className="text-sm text-slate-600">
                Learning and programme operations
              </p>
            </div>
          </Link>

          <Button
            asChild
            className="rounded-full px-5 text-sm font-semibold text-white hover:opacity-95"
            style={{ backgroundColor: "#163c8d" }}
          >
            <Link to="/login">
              Sign in
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="px-5 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
          <div className="mx-auto grid max-w-7xl items-stretch gap-8 lg:grid-cols-[1.06fr_0.94fr]">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="relative overflow-hidden rounded-[2.75rem] px-7 py-8 shadow-[0_35px_90px_-40px_rgba(15,23,42,0.72)] sm:px-9 sm:py-10"
              style={{
                background:
                  "linear-gradient(140deg, #0d2153 0%, #12316e 38%, #1d4ca1 100%)",
                minHeight: "38rem",
              }}
            >
              <div
                className="absolute right-0 top-0 h-44 w-44 rounded-bl-[4rem]"
                style={{ backgroundColor: "#ffd57a" }}
              />
              <div
                className="absolute -left-12 top-14 h-44 w-44 rounded-full blur-2xl"
                style={{ backgroundColor: "rgba(255, 213, 122, 0.18)" }}
              />
              <div
                className="absolute -right-10 bottom-12 h-60 w-60 rounded-full blur-3xl"
                style={{ backgroundColor: "rgba(255, 213, 122, 0.16)" }}
              />

              <div className="relative z-10 flex h-full flex-col text-white">
                <div
                  className="inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
                  style={{
                    borderColor: "rgba(255,255,255,0.14)",
                    backgroundColor: "rgba(255,255,255,0.10)",
                  }}
                >
                  <Sparkles className="h-4 w-4" style={{ color: "#ffd57a" }} />
                  Inspired by the Vahani way
                </div>

                <h1 className="mt-8 max-w-3xl text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl lg:text-[4.4rem]">
                  Built to make scholar growth feel visible, elegant, and real.
                </h1>

                <p
                  className="mt-6 max-w-2xl text-base leading-8 sm:text-lg"
                  style={{ color: "rgba(255,255,255,0.78)" }}
                >
                  A mission-led platform for scholars, programme managers, and admins to
                  run education, evaluation, reporting, and certificates from one place.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 rounded-full px-7 text-base font-semibold text-[#10254d] hover:opacity-95"
                    style={{ backgroundColor: "#ffd57a" }}
                  >
                    <Link to="/login">
                      Enter platform
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    className="h-12 rounded-full border px-7 text-base font-semibold text-white hover:opacity-95"
                    variant="outline"
                    style={{
                      borderColor: "rgba(255,255,255,0.18)",
                      backgroundColor: "rgba(255,255,255,0.08)",
                    }}
                  >
                    <Link to="/login">Open sign in</Link>
                  </Button>
                </div>

                <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {stats.map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.42, delay: 0.08 + index * 0.08 }}
                      className="rounded-[1.6rem] border p-4"
                      style={{
                        borderColor: "rgba(255,255,255,0.12)",
                        backgroundColor: "rgba(255,255,255,0.08)",
                      }}
                    >
                      <p className="text-2xl font-bold" style={{ color: "#ffd57a" }}>
                        {stat.value}
                      </p>
                      <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.72)" }}>
                        {stat.label}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.58, delay: 0.08 }}
              className="grid gap-5"
            >
              <div
                className="relative overflow-hidden rounded-[2.4rem] p-7 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.45)]"
                style={{
                  background: "linear-gradient(150deg, #fff6dc 0%, #ffe69f 100%)",
                }}
              >
                <div
                  className="absolute -right-8 -top-10 h-40 w-40 rounded-full"
                  style={{ backgroundColor: "rgba(255,255,255,0.35)" }}
                />
                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8d6200]">
                    What this platform does
                  </p>
                  <h2 className="mt-3 max-w-md text-3xl font-bold leading-tight text-[#10254d]">
                    Moves Vahani from scattered operations to one beautiful system of record.
                  </h2>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {cards.map((card, index) => (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.42, delay: 0.12 + index * 0.08 }}
                    className={`rounded-[2rem] p-6 shadow-[0_22px_55px_-38px_rgba(15,23,42,0.45)] ${
                      index === 2 ? "sm:col-span-2" : ""
                    }`}
                    style={card.style}
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-[1.2rem]"
                      style={{ backgroundColor: card.iconBg }}
                    >
                      <card.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-2xl font-semibold">{card.title}</h3>
                    <p className="mt-3 text-sm leading-7" style={{ color: card.bodyColor }}>
                      {card.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="px-5 py-8 sm:px-6 lg:px-8">
          <div
            className="mx-auto max-w-7xl rounded-[2.5rem] border p-6 shadow-[0_26px_70px_-50px_rgba(15,23,42,0.45)] sm:p-7 lg:p-8"
            style={{
              borderColor: "#e5d7c0",
              backgroundColor: "rgba(255,255,255,0.82)",
            }}
          >
            <div className="grid gap-4 md:grid-cols-4">
              {capabilities.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.42, delay: index * 0.07 }}
                  className="rounded-[1.8rem] p-5"
                  style={{
                    background: "linear-gradient(180deg, #f9fbff 0%, #fef5df 100%)",
                  }}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-[1.15rem] text-white"
                    style={{ backgroundColor: "#163c8d" }}
                  >
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[#10254d]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.blurb}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <motion.div
              initial={{ opacity: 0, x: -18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
              className="rounded-[2.6rem] p-8 shadow-[0_28px_70px_-48px_rgba(15,23,42,0.45)]"
              style={{
                background: "linear-gradient(160deg, #fff8e6 0%, #f4ead2 100%)",
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8d6200]">
                The Vahani Way
              </p>
              <h2 className="mt-4 text-3xl font-bold leading-tight text-[#10254d] sm:text-4xl">
                Education, mentorship, opportunity, and measurable progress.
              </h2>
              <p className="mt-5 text-sm leading-8 text-slate-600 sm:text-base">
                This page is built to feel warmer, stronger, and more mission-led than a
                generic software homepage while still giving the platform a polished product feel.
              </p>
            </motion.div>

            <div className="grid gap-6 sm:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.45 }}
                className="rounded-[2.2rem] p-7 text-white"
                style={{ background: "linear-gradient(145deg, #0f2660 0%, #173b88 100%)" }}
              >
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#ffd57a]">
                  Scholar side
                </p>
                <p className="mt-4 text-2xl font-semibold leading-tight">
                  Make progress, marks, attendance, and certificates instantly legible.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.45, delay: 0.08 }}
                className="rounded-[2.2rem] p-7 text-white"
                style={{ background: "linear-gradient(145deg, #1d4ca1 0%, #163c8d 100%)" }}
              >
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#ffd57a]">
                  Manager side
                </p>
                <p className="mt-4 text-2xl font-semibold leading-tight">
                  Run programme delivery, evaluation, attendance, and results without friction.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.45, delay: 0.14 }}
                className="rounded-[2.2rem] p-7"
                style={{ background: "linear-gradient(145deg, #fff1c5 0%, #ffd777 100%)" }}
              >
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8d6200]">
                  Admin side
                </p>
                <p className="mt-4 text-2xl font-semibold leading-tight text-[#10254d]">
                  Oversee the institution with reports, authenticity, and operational control.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.45, delay: 0.2 }}
                className="rounded-[2.2rem] bg-white p-7 shadow-[0_24px_55px_-40px_rgba(15,23,42,0.35)]"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#163c8d]">
                  Outcome
                </p>
                <p className="mt-4 text-2xl font-semibold leading-tight text-[#10254d]">
                  A platform that feels worthy of the mission, not just functional.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-6 lg:px-8">
          <div
            className="mx-auto max-w-7xl rounded-[2.7rem] px-7 py-12 text-white shadow-[0_38px_95px_-50px_rgba(15,23,42,0.75)] sm:px-8 lg:px-12"
            style={{
              background: "linear-gradient(135deg, #10254d 0%, #153980 58%, #2051aa 100%)",
            }}
          >
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#ffd57a]">
                  Ready to continue
                </p>
                <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                  Step into the platform and continue the work.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/76 sm:text-base">
                  Sign in to access scholar learning, programme management, analytics,
                  reports, notifications, and certificate workflows.
                </p>
              </div>

              <Button
                asChild
                size="lg"
                className="h-12 rounded-full px-8 text-base font-semibold text-[#10254d] hover:opacity-95"
                style={{ backgroundColor: "#ffd57a" }}
              >
                <Link to="/login">
                  Sign in now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer
        className="border-t px-5 py-8 sm:px-6 lg:px-8"
        style={{ borderColor: "#e5d7c0", backgroundColor: "#f4ebdc" }}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img src={vahaniLogo} alt="Vahani" className="h-10 w-auto" />
            <div>
              <p className="font-semibold text-[#10254d]">Vahani Scholarship Trust</p>
              <p className="text-sm text-slate-600">
                {new Date().getFullYear()} Vahani LMS. All rights reserved.
              </p>
            </div>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-right">
            A learning and programme operations platform shaped around education,
            mentorship, opportunity, and long-term scholar growth.
          </p>
        </div>
      </footer>
    </div>
  );
}

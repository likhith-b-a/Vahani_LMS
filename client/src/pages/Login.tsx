import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, GraduationCap, Shield, Mail, ArrowLeft, BookOpen } from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { useAuth, type UserRole } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";
import vahaniLogo from "@/assets/vahani-logo.png";
import {
  loginUser,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
} from "../api/auth";

export default function Login() {
  const { setAuthData } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [role, setRole] = useState<UserRole>("scholar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotStep, setForgotStep] = useState<"request" | "verify">("request");
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const isFormValid = email.trim().length > 0 && password.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) return;

    try {
      setLoading(true);
      setError("");

      console.log("🔐 Logging in with email:", email);
      const res = await loginUser(email, password);

      console.log("✅ Login response received:", res);
      const userData = res.data.user;

      if (role !== userData.role) {
        throw new Error(
          `This account belongs to the ${String(userData.role).replaceAll("_", " ")} role. Switch the selected role and try again.`,
        );
      }

      console.log("📦 Extracted user data:", userData);

      // Save to context and localStorage
      setAuthData(userData);
      console.log("💾 Data saved to context and localStorage");

      const redirectMap: Record<string, string> = {
        admin: "/admin",
        tutor: "/programme-manager",
        programme_manager: "/programme-manager",
        scholar: "/dashboard",
        user: "/dashboard",
      };

      toast({
        title: "Success",
        description: `Welcome back, ${userData.name}!`,
      });

      console.log("🚀 Redirecting to:", redirectMap[userData.role] || "/dashboard");
      navigate(redirectMap[userData.role] || "/dashboard");
    } catch (err) {
      console.error("❌ Login error:", err);
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setForgotError("");

    try {
      if (forgotStep === "request") {
        await requestPasswordResetOtp(forgotEmail.trim());
        setForgotStep("verify");
        toast({
          title: "OTP Sent",
          description: `A reset OTP was sent to ${forgotEmail}.`,
        });
      } else {
        if (!forgotOtp.trim() || !forgotNewPassword.trim() || !forgotConfirmPassword.trim()) {
          setForgotError("Please fill in OTP and both password fields.");
          return;
        }
        if (forgotNewPassword.length < 8) {
          setForgotError("New password must be at least 8 characters.");
          return;
        }
        if (forgotNewPassword !== forgotConfirmPassword) {
          setForgotError("Passwords do not match.");
          return;
        }

        await verifyPasswordResetOtp(
          forgotEmail.trim(),
          forgotOtp.trim(),
          forgotNewPassword,
        );

        toast({
          title: "Password Reset Successful",
          description: "You can now sign in with your new password.",
        });
        setForgotMode(false);
        setForgotEmail("");
        setForgotOtp("");
        setForgotNewPassword("");
        setForgotConfirmPassword("");
        setForgotStep("request");
      }
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setForgotLoading(false);
    }
  };

  if (forgotMode) {
    return (
      <div className="min-h-screen flex">
        {/* Left panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-vahani-blue via-primary to-vahani-blue relative items-center justify-center p-12">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--vahani-gold)/0.12),transparent_60%)]" />
          <div className="relative text-center max-w-md">
            <img src={vahaniLogo} alt="Vahani" className="w-16 h-16 rounded-xl mx-auto mb-8" />
            <h2 className="text-3xl font-bold text-white mb-4">Reset Your Password</h2>
            <p className="text-white/60 leading-relaxed">
              Enter your registered email and we'll send you a one-time password to reset your password.
            </p>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-background">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
            <button onClick={() => {
              setForgotMode(false);
              setForgotStep("request");
              setForgotError("");
              setForgotOtp("");
              setForgotNewPassword("");
              setForgotConfirmPassword("");
            }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
              <ArrowLeft size={16} /> Back to Sign In
            </button>

            <div className="w-12 h-12 rounded-lg bg-vahani-blue/10 flex items-center justify-center mb-6">
              <Mail size={22} className="text-vahani-blue" />
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-1">Forgot Password</h1>
            <p className="text-muted-foreground mb-8">
              {forgotStep === "request"
                ? "Enter your registered email address"
                : "Enter the OTP from your email and choose a new password"}
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-5">
              {forgotError && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg px-4 py-3">
                  {forgotError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email Address</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="you@vahani.org"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  autoComplete="email"
                  disabled={forgotStep === "verify"}
                />
              </div>

              {forgotStep === "verify" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="forgot-otp">OTP</Label>
                    <Input
                      id="forgot-otp"
                      placeholder="Enter 6-digit OTP"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      autoComplete="one-time-code"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="forgot-new-password">New Password</Label>
                    <Input
                      id="forgot-new-password"
                      type="password"
                      placeholder="Minimum 8 characters"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="forgot-confirm-password">Confirm New Password</Label>
                    <Input
                      id="forgot-confirm-password"
                      type="password"
                      placeholder="Re-enter new password"
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => void requestPasswordResetOtp(forgotEmail.trim()).then(() => {
                      toast({
                        title: "OTP Resent",
                        description: `A fresh OTP was sent to ${forgotEmail}.`,
                      });
                    }).catch((err) => {
                      setForgotError(err instanceof Error ? err.message : "Failed to resend OTP.");
                    })}
                    className="text-sm text-vahani-blue hover:underline"
                  >
                    Resend OTP
                  </button>
                </>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-vahani-blue hover:bg-vahani-blue/90 text-base font-semibold"
                disabled={forgotLoading || !forgotEmail.trim()}
              >
                {forgotLoading
                  ? forgotStep === "request"
                    ? "Sending..."
                    : "Resetting..."
                  : forgotStep === "request"
                    ? "Send OTP"
                    : "Verify OTP & Reset Password"}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-vahani-blue via-primary to-vahani-blue relative items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--vahani-gold)/0.12),transparent_60%)]" />
        <div className="relative text-center max-w-md">
          <img src={vahaniLogo} alt="Vahani" className="w-16 h-16 rounded-xl mx-auto mb-8" />
          <h2 className="text-3xl font-bold text-white mb-4">Welcome Back</h2>
          <p className="text-white/60 leading-relaxed">
            Sign in to access your personalized learning dashboard, track progress, and continue your growth journey.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-background">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src={vahaniLogo} alt="Vahani" className="w-9 h-9 rounded-lg" />
            <span className="font-bold text-lg text-foreground">Vahani LMS</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-1">Sign In</h1>
          <p className="text-muted-foreground mb-8">Choose your role and enter your credentials</p>

          {/* Role toggle */}
          <div className="grid grid-cols-3 gap-3 mb-8">
              {([
                { value: "scholar" as const, icon: GraduationCap, label: "Scholar" },
                { value: "programme_manager" as const, icon: BookOpen, label: "Programme Manager" },
                { value: "admin" as const, icon: Shield, label: "Admin" },
              ]).map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-all ${
                  role === r.value
                    ? "border-vahani-blue bg-vahani-blue/5 text-vahani-blue shadow-sm"
                    : "border-border text-muted-foreground hover:border-muted-foreground/30"
                }`}
              >
                <r.icon size={18} />
                {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@vahani.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">Remember me</Label>
              </div>
              <button
                type="button"
                onClick={() => setForgotMode(true)}
                className="text-sm text-vahani-blue hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-vahani-blue hover:bg-vahani-blue/90 text-base font-semibold"
              disabled={loading || !isFormValid}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Demo mode notice */}
          <div className="mt-8 p-4 rounded-lg bg-accent/10 border border-accent/20">
            <p className="text-xs font-medium text-accent-foreground mb-1">🔓 Demo Mode</p>
            <p className="text-xs text-muted-foreground">
              This is a demo authentication mode. Enter any email and password to log in. Real authentication will be implemented later.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

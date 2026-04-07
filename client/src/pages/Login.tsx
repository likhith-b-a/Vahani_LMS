import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Mail } from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { useAuth } from "../contexts/AuthContext";
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

      const res = await loginUser(email, password);
      const userData = res.data.user;

      setAuthData(userData);

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

      navigate(redirectMap[userData.role] || "/dashboard");
    } catch (err) {
      console.error("Login error:", err);
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
        <div className="relative hidden items-center justify-center bg-gradient-to-br from-vahani-blue via-primary to-vahani-blue p-12 lg:flex lg:w-1/2">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--vahani-gold)/0.12),transparent_60%)]" />
          <div className="relative max-w-md text-center">
            <img src={vahaniLogo} alt="Vahani" className="mx-auto mb-8 h-16 w-auto" />
            <h2 className="mb-4 text-3xl font-bold text-white">Reset Your Password</h2>
            <p className="leading-relaxed text-white/65">
              Enter your registered email and we&apos;ll send you a one-time password to
              reset your account password.
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center bg-background p-6 md:p-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <button
              onClick={() => {
                setForgotMode(false);
                setForgotStep("request");
                setForgotError("");
                setForgotOtp("");
                setForgotNewPassword("");
                setForgotConfirmPassword("");
              }}
              className="mb-8 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft size={16} /> Back to Sign In
            </button>

            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-vahani-blue/10">
              <Mail size={22} className="text-vahani-blue" />
            </div>

            <h1 className="mb-1 text-2xl font-bold text-foreground">Forgot Password</h1>
            <p className="mb-8 text-muted-foreground">
              {forgotStep === "request"
                ? "Enter your registered email address"
                : "Enter the OTP from your email and choose a new password"}
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-5">
              {forgotError && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
                    onClick={() =>
                      void requestPasswordResetOtp(forgotEmail.trim())
                        .then(() => {
                          toast({
                            title: "OTP Resent",
                            description: `A fresh OTP was sent to ${forgotEmail}.`,
                          });
                        })
                        .catch((err) => {
                          setForgotError(
                            err instanceof Error ? err.message : "Failed to resend OTP.",
                          );
                        })
                    }
                    className="text-sm text-vahani-blue hover:underline"
                  >
                    Resend OTP
                  </button>
                </>
              )}

              <Button
                type="submit"
                className="h-11 w-full bg-vahani-blue text-base font-semibold hover:bg-vahani-blue/90"
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
      <div className="relative hidden items-center justify-center bg-gradient-to-br from-vahani-blue via-primary to-vahani-blue p-12 lg:flex lg:w-1/2">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--vahani-gold)/0.12),transparent_60%)]" />
        <div className="relative max-w-md text-center">
          <img src={vahaniLogo} alt="Vahani" className="mx-auto mb-8 h-16 w-auto" />
          <h2 className="mb-4 text-3xl font-bold text-white">Welcome Back</h2>
          <p className="leading-relaxed text-white/65">
            One secure sign-in automatically takes you to the right workspace for your
            account.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src={vahaniLogo} alt="Vahani" className="h-10 w-auto" />
            <span className="text-lg font-bold text-foreground">Vahani LMS</span>
          </div>

          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.26em] text-vahani-blue">
            Secure access
          </p>
          <h1 className="mb-2 text-2xl font-bold text-foreground">Sign In</h1>
          <p className="text-muted-foreground">
            Use your registered email and password to continue to your account.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                <Label htmlFor="remember" className="cursor-pointer text-sm font-normal">
                  Remember me
                </Label>
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
              className="h-11 w-full bg-vahani-blue text-base font-semibold hover:bg-vahani-blue/90"
              disabled={loading || !isFormValid}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-8 rounded-2xl border border-border bg-card/70 p-4">
            <p className="text-sm font-semibold text-foreground">Need help signing in?</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Use your registered account credentials. If you cannot access your account,
              use the forgot password flow to request an OTP.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

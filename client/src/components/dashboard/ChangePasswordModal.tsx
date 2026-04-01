import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { requestChangePasswordOtp, verifyChangePasswordOtp } from "@/api/auth";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordModal({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const isValid = current.trim().length > 0 && newPass.trim().length >= 8 && newPass === confirm;

  const resetForm = () => {
    setCurrent("");
    setNewPass("");
    setConfirm("");
    setOtp("");
    setOtpSent(false);
    setError("");
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!current.trim() || !newPass.trim() || !confirm.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPass.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPass !== confirm) {
      setError("New passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await requestChangePasswordOtp(current, newPass);
      setOtpSent(true);
      toast({ title: "OTP Sent", description: "A verification OTP has been sent to your email." });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otp.trim()) {
      setError("Please enter the OTP sent to your email.");
      return;
    }

    try {
      setLoading(true);
      await verifyChangePasswordOtp(current, newPass, otp);
      toast({ title: "Password Updated", description: "Your password has been updated successfully." });
      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetForm();
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-vahani-blue/10 flex items-center justify-center">
              <Lock size={20} className="text-vahani-blue" />
            </div>
            <DialogTitle className="text-lg">Change Password</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4 mt-2">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="current-pw">Current Password</Label>
            <div className="relative">
              <Input
                id="current-pw"
                type={showCurrent ? "text" : "password"}
                placeholder="••••••••"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-pw">New Password</Label>
            <div className="relative">
              <Input
                id="new-pw"
                type={showNew ? "text" : "password"}
                placeholder="••••••••"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {newPass && newPass.length < 8 && (
              <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-pw">Confirm New Password</Label>
            <Input
              id="confirm-pw"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {confirm && newPass !== confirm && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>

          {otpSent && (
            <div className="space-y-2">
              <Label htmlFor="change-password-otp">OTP</Label>
              <Input
                id="change-password-otp"
                inputMode="numeric"
                placeholder="Enter the 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the OTP sent to your registered email to complete the password change.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => {
              resetForm();
              onOpenChange(false);
            }}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-vahani-blue hover:bg-vahani-blue/90" disabled={loading || !isValid || (otpSent && !otp.trim())}>
              {loading ? (otpSent ? "Verifying..." : "Sending OTP...") : otpSent ? "Verify & Update" : "Send OTP"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

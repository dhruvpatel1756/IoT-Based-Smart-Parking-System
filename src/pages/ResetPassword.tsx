import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Car, Loader2, Lock, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Check hash for recovery token
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are the same.", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    } else {
      setSuccess(true);
      toast({ title: "Password updated!", description: "You can now sign in with your new password." });
      setTimeout(() => navigate("/dashboard"), 2000);
    }
  };

  const fieldAnim = (delay: number) => ({
    initial: { opacity: 0, y: 12 } as const,
    animate: { opacity: 1, y: 0 } as const,
    transition: { delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 pt-20 overflow-hidden relative">
      <motion.div
        className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none"
        animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-10 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none"
        animate={{ x: [0, -20, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <motion.div
            className="flex items-center justify-center gap-2 mb-2"
            whileHover={{ scale: 1.05 }}
          >
            <Car className="h-8 w-8 text-primary" />
            <span className="font-display font-bold text-2xl">ParkEase</span>
          </motion.div>
          <p className="text-muted-foreground text-sm">Set your new password</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card className="shadow-elevated backdrop-blur-sm">
            <CardHeader className="text-center">
              <motion.div
                className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2"
                animate={success ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.5 }}
              >
                {success ? (
                  <CheckCircle className="h-6 w-6 text-primary" />
                ) : (
                  <Lock className="h-6 w-6 text-primary" />
                )}
              </motion.div>
              <CardTitle className="text-lg">
                {success ? "Password Updated!" : "Reset Password"}
              </CardTitle>
              <CardDescription>
                {success
                  ? "Redirecting you to your dashboard..."
                  : isRecovery
                  ? "Enter your new password below."
                  : "Waiting for recovery link verification..."}
              </CardDescription>
            </CardHeader>

            {!success && isRecovery && (
              <form onSubmit={handleReset}>
                <CardContent className="space-y-4">
                  <motion.div className="space-y-2" {...fieldAnim(0.1)}>
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Min 6 characters"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </motion.div>
                  <motion.div className="space-y-2" {...fieldAnim(0.2)}>
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Repeat your password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </motion.div>
                  <motion.div {...fieldAnim(0.3)}>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update Password
                      </Button>
                    </motion.div>
                  </motion.div>
                </CardContent>
              </form>
            )}

            {!success && !isRecovery && (
              <CardContent>
                <motion.div {...fieldAnim(0.1)} className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    If you arrived here from a reset email, please wait a moment while we verify your link.
                  </p>
                  <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                </motion.div>
              </CardContent>
            )}
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}

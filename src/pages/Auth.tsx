import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Car, Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { lovable } from "@/integrations/lovable/index";
import { Separator } from "@/components/ui/separator";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function Auth() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") === "signup" ? "signup" : "signin";
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [signUpData, setSignUpData] = useState({ email: "", password: "", fullName: "" });

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const isCustomDomain =
        !window.location.hostname.includes("lovable.app") &&
        !window.location.hostname.includes("lovableproject.com");

      if (isCustomDomain) {
        // Bypass auth-bridge on custom domains — use Supabase OAuth directly
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/dashboard`,
            skipBrowserRedirect: true,
          },
        });
        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
        }
      } else {
        const { error } = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: window.location.origin,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      toast({ title: "Google sign in failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: signInData.email,
      password: signInData.password,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Welcome back!" });
      navigate("/dashboard");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signUpData.email,
      password: signUpData.password,
      options: {
        data: { full_name: signUpData.fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account created!", description: "You can now sign in." });
      navigate("/dashboard");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent you a password reset link." });
      setShowForgot(false);
    }
  };

  const fieldAnim = (delay: number) => ({
    initial: { opacity: 0, y: 12 } as const,
    animate: { opacity: 1, y: 0 } as const,
    transition: { delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 pt-20 overflow-hidden relative">
      {/* Floating background blobs */}
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
        {/* Logo */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <motion.div
            className="flex items-center justify-center gap-2 mb-2"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Car className="h-8 w-8 text-primary" />
            </motion.div>
            <span className="font-display font-bold text-2xl">ParkEase</span>
            <motion.div
              animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
            >
              <Sparkles className="h-4 w-4 text-primary/60" />
            </motion.div>
          </motion.div>
          <motion.p
            className="text-muted-foreground text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Your smart parking companion
          </motion.p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card className="shadow-elevated backdrop-blur-sm">
            <AnimatePresence mode="wait">
              {showForgot ? (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <CardHeader className="pb-4 text-center">
                    <p className="text-lg font-semibold">Forgot Password</p>
                    <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
                  </CardHeader>
                  <form onSubmit={handleForgotPassword}>
                    <CardContent className="space-y-4">
                      <motion.div className="space-y-2" {...fieldAnim(0.1)}>
                        <Label htmlFor="forgot-email">Email</Label>
                        <Input
                          id="forgot-email"
                          type="email"
                          placeholder="you@example.com"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                        />
                      </motion.div>
                      <motion.div {...fieldAnim(0.2)}>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Reset Link
                          </Button>
                        </motion.div>
                      </motion.div>
                      <motion.div {...fieldAnim(0.3)} className="text-center">
                        <button
                          type="button"
                          onClick={() => setShowForgot(false)}
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <ArrowLeft className="h-3 w-3" />
                          Back to Sign In
                        </button>
                      </motion.div>
                    </CardContent>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="auth"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Tabs defaultValue={defaultTab}>
                    <CardHeader className="pb-4">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="signin">Sign In</TabsTrigger>
                        <TabsTrigger value="signup">Sign Up</TabsTrigger>
                      </TabsList>
                    </CardHeader>

                    <TabsContent value="signin">
                      <motion.form
                        onSubmit={handleSignIn}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <CardContent className="space-y-4">
                          <motion.div className="space-y-2" {...fieldAnim(0.1)}>
                            <Label htmlFor="signin-email">Email</Label>
                            <Input id="signin-email" type="email" placeholder="you@example.com" required
                              value={signInData.email} onChange={e => setSignInData(p => ({ ...p, email: e.target.value }))} />
                          </motion.div>
                          <motion.div className="space-y-2" {...fieldAnim(0.2)}>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="signin-password">Password</Label>
                              <button
                                type="button"
                                onClick={() => setShowForgot(true)}
                                className="text-xs text-primary hover:underline"
                              >
                                Forgot password?
                              </button>
                            </div>
                            <Input id="signin-password" type="password" placeholder="••••••••" required
                              value={signInData.password} onChange={e => setSignInData(p => ({ ...p, password: e.target.value }))} />
                          </motion.div>
                          <motion.div {...fieldAnim(0.3)}>
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sign In
                              </Button>
                            </motion.div>
                          </motion.div>
                          <motion.div {...fieldAnim(0.4)} className="space-y-4">
                            <div className="flex items-center gap-3">
                              <Separator className="flex-1" />
                              <span className="text-xs text-muted-foreground">or</span>
                              <Separator className="flex-1" />
                            </div>
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={handleGoogleSignIn}>
                                <GoogleIcon />
                                Continue with Google
                              </Button>
                            </motion.div>
                          </motion.div>
                        </CardContent>
                      </motion.form>
                    </TabsContent>

                    <TabsContent value="signup">
                      <motion.form
                        onSubmit={handleSignUp}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <CardContent className="space-y-4">
                          <motion.div className="space-y-2" {...fieldAnim(0.1)}>
                            <Label htmlFor="signup-name">Full Name</Label>
                            <Input id="signup-name" placeholder="Bhagya Patel" required
                              value={signUpData.fullName} onChange={e => setSignUpData(p => ({ ...p, fullName: e.target.value }))} />
                          </motion.div>
                          <motion.div className="space-y-2" {...fieldAnim(0.2)}>
                            <Label htmlFor="signup-email">Email</Label>
                            <Input id="signup-email" type="email" placeholder="you@example.com" required
                              value={signUpData.email} onChange={e => setSignUpData(p => ({ ...p, email: e.target.value }))} />
                          </motion.div>
                          <motion.div className="space-y-2" {...fieldAnim(0.3)}>
                            <Label htmlFor="signup-password">Password</Label>
                            <Input id="signup-password" type="password" placeholder="Min 6 characters" required minLength={6}
                              value={signUpData.password} onChange={e => setSignUpData(p => ({ ...p, password: e.target.value }))} />
                          </motion.div>
                          <motion.div {...fieldAnim(0.4)}>
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Account
                              </Button>
                            </motion.div>
                          </motion.div>
                          <motion.div {...fieldAnim(0.5)} className="space-y-4">
                            <div className="flex items-center gap-3">
                              <Separator className="flex-1" />
                              <span className="text-xs text-muted-foreground">or</span>
                              <Separator className="flex-1" />
                            </div>
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={handleGoogleSignIn}>
                                <GoogleIcon />
                                Continue with Google
                              </Button>
                            </motion.div>
                          </motion.div>
                        </CardContent>
                      </motion.form>
                    </TabsContent>
                  </Tabs>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}

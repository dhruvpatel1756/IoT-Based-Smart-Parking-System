import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Car, Menu, X, LogOut, User, QrCode } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const { user, role, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const dashboardPath = role === "admin" ? "/admin" : role === "parking_owner" ? "/owner" : "/dashboard";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl">
          <Car className="h-6 w-6 text-primary" />
          <span>ParkEase</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/search" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Find Parking
          </Link>
          {user ? (
            <>
              <Link to={dashboardPath} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <Link to="/bookings" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                My Bookings
              </Link>
              {(role === "parking_owner" || role === "admin") && (
                <Link to="/scan-qr" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <QrCode className="h-4 w-4 inline mr-1" /> Scan QR
                </Link>
              )}
              <Link to="/profile" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <User className="h-4 w-4 inline mr-1" /> Profile
              </Link>
              <NotificationBell />
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1" /> Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link to="/auth?tab=signup">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-border"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
              <Link to="/search" className="py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Find Parking</Link>
              {user ? (
                <>
                  <Link to={dashboardPath} className="py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                   <Link to="/bookings" className="py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>My Bookings</Link>
                   {(role === "parking_owner" || role === "admin") && (
                     <Link to="/scan-qr" className="py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Scan QR</Link>
                   )}
                   <Link to="/profile" className="py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Profile</Link>
                   <Button variant="ghost" size="sm" onClick={handleSignOut}>Sign Out</Button>
                </>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full">Sign In</Button>
                  </Link>
                  <Link to="/auth?tab=signup" onClick={() => setMobileOpen(false)}>
                    <Button size="sm" className="w-full">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

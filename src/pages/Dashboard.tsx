import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Search, Calendar, User, Car } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { user, role } = useAuth();

  const quickLinks = [
    { icon: Search, label: "Find Parking", href: "/search", desc: "Search for available spots" },
    { icon: Calendar, label: "My Bookings", href: "/bookings", desc: "View your booking history" },
    { icon: User, label: "Profile", href: "/profile", desc: "Manage your account" },
  ];

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold mb-2">
            Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}
          </h1>
          <p className="text-muted-foreground mb-8">Here's your parking overview</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {quickLinks.map((link, i) => (
            <motion.div key={link.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Link to={link.href}>
                <Card className="hover:shadow-elevated hover:border-primary/30 transition-all duration-300 cursor-pointer group h-full">
                  <CardContent className="p-6 flex flex-col items-start">
                    <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                      <link.icon className="h-6 w-6 text-accent-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="font-display font-semibold text-lg mb-1">{link.label}</h3>
                    <p className="text-sm text-muted-foreground">{link.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {role === "parking_owner" && (
          <div className="mt-8">
            <Link to="/owner">
              <Button size="lg" className="shadow-glow">
                <Car className="mr-2 h-5 w-5" /> Go to Owner Dashboard
              </Button>
            </Link>
          </div>
        )}

        {role === "admin" && (
          <div className="mt-8">
            <Link to="/admin">
              <Button size="lg" className="shadow-glow">
                <Car className="mr-2 h-5 w-5" /> Go to Admin Dashboard
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

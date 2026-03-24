import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Search, Shield, Zap, Clock, MapPin, CreditCard, Star, Sparkles, Car } from "lucide-react";
import heroImage from "@/assets/hero-parking.jpg";

const features = [
  { icon: Search, title: "Smart Search", desc: "Find parking by location, price, and availability in real-time." },
  { icon: Shield, title: "Secure Booking", desc: "Encrypted payments and QR-code verified entry." },
  { icon: Zap, title: "Instant Confirmation", desc: "Book a slot in seconds with real-time availability." },
  { icon: Clock, title: "Flexible Hours", desc: "Hourly bookings with dynamic pricing for best deals." },
  { icon: MapPin, title: "City-Wide Coverage", desc: "Parking spots across all major city centers." },
  { icon: CreditCard, title: "Easy Payments", desc: "Pay securely with cards, UPI, or digital wallets." },
];

const stats = [
  { value: "10K+", label: "Parking Spots" },
  { value: "50K+", label: "Happy Users" },
  { value: "25+", label: "Cities" },
  { value: "99.9%", label: "Uptime" },
];

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <motion.img
          src={heroImage}
          alt="Smart parking lot"
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <div className="absolute inset-0 bg-hero-overlay" />

        {/* Floating blobs */}
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none"
          animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none"
          animate={{ x: [0, -20, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 text-primary text-sm font-medium mb-6 border border-primary/30"
            >
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Sparkles className="h-4 w-4" />
              </motion.div>
              Smart Parking for Smart Cities
            </motion.span>

            <motion.h1
              variants={fadeUp}
              className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-primary-foreground mb-6 leading-tight"
            >
              Park Smarter,
              <br />
              <span className="text-gradient">Not Harder</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-lg md:text-xl text-primary-foreground/70 max-w-2xl mx-auto mb-8"
            >
              Find, book, and pay for parking spots in seconds. Real-time availability,
              dynamic pricing, and hassle-free entry with QR codes.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/search">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                  <Button size="lg" className="text-base px-8 py-6 shadow-glow animate-pulse-glow">
                    <Search className="mr-2 h-5 w-5" />
                    Find Parking Now
                  </Button>
                </motion.div>
              </Link>
              <Link to="/auth?tab=signup">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                  <Button size="lg" className="text-base px-8 py-6 bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-glow">
                    Create Free Account
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-primary-foreground/30 flex items-start justify-center p-1.5">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-primary-foreground/50"
              animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                className="text-center group"
              >
                <motion.div
                  className="text-3xl md:text-4xl font-display font-bold text-gradient"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {stat.value}
                </motion.div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-background relative overflow-hidden">
        {/* Background blob */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl pointer-events-none"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Everything You Need to <span className="text-gradient">Park Easy</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A complete parking solution with real-time updates, secure payments, and smart features.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="group p-6 rounded-xl bg-card shadow-card border border-border hover:shadow-elevated hover:border-primary/30 transition-colors duration-300"
              >
                <motion.div
                  className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors"
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <f.icon className="h-6 w-6 text-accent-foreground group-hover:text-primary transition-colors" />
                </motion.div>
                <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-card border-t border-border relative overflow-hidden">
        <motion.div
          className="absolute -top-20 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none"
          animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          >
            <motion.div
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
              className="inline-block mb-4"
            >
              <Car className="h-10 w-10 text-primary mx-auto" />
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Ready to <span className="text-gradient">Park Smarter</span>?
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">
              Join thousands of drivers saving time and money on parking every day.
            </p>
            <Link to="/auth?tab=signup">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block">
                <Button size="lg" className="px-8 py-6 text-base shadow-glow">
                  <Star className="mr-2 h-5 w-5" />
                  Get Started Free
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <motion.footer
        className="py-12 bg-background border-t border-border"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <motion.div
              className="flex items-center gap-2 font-display font-bold text-lg"
              whileHover={{ scale: 1.05 }}
            >
              <span className="text-gradient">ParkEase</span>
            </motion.div>
            <p className="text-sm text-muted-foreground">
              © 2026 ParkEase. All rights reserved.
            </p>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}

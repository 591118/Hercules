import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import WorkoutsSection from "@/components/WorkoutsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Dumbbell } from "lucide-react";
import { isNativeApp } from "@/lib/capacitor";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();
  const native = isNativeApp();

  if (native) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm flex flex-col items-center gap-8">
          <Link to="/" className="flex items-center gap-2 text-gold hover:opacity-90">
            <Dumbbell className="h-12 w-12" />
            <span className="font-display text-3xl font-bold">HERCULES</span>
          </Link>
          <p className="text-muted-foreground text-center text-sm">
            Logg inn med kontoen du opprettet på nettsiden.
          </p>
          {user ? (
            <Button variant="hero" asChild>
              <Link to="/dashboard">Åpne appen</Link>
            </Button>
          ) : (
            <Button variant="hero" size="lg" asChild>
              <Link to="/login">Logg inn</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <WorkoutsSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;

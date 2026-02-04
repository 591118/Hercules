import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Zap, Crown } from "lucide-react";

const CTASection = () => {
  return (
    <section id="pricing" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card to-background" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Main CTA Card */}
          <div className="text-center p-8 md:p-12 lg:p-16 rounded-3xl bg-gradient-card border border-gold/20 shadow-gold">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold/30 bg-gold/5 mb-8">
              <Crown className="w-4 h-4 text-gold" />
              <span className="text-sm text-gold font-medium">
                Limited Time Offer
              </span>
            </div>

            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-foreground">Begin Your </span>
              <span className="text-gradient-gold">Transformation</span>
            </h2>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Join the ranks of legends. Start your 7-day free trial and unlock 
              your potential with unlimited access to all workouts and features.
            </p>

            {/* Price */}
            <div className="flex items-center justify-center gap-4 mb-10">
              <span className="text-4xl md:text-5xl font-display font-bold text-foreground">
                $9.99
              </span>
              <span className="text-muted-foreground">
                /month after trial
              </span>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button variant="hero" size="xl" className="w-full sm:w-auto">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="heroOutline" size="xl" className="w-full sm:w-auto">
                View Plans
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-gold" />
                Cancel Anytime
              </span>
              <span className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-gold" />
                No Credit Card Required
              </span>
              <span className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-gold" />
                Premium Support
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;

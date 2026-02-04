import { Dumbbell, Target, Trophy, Users, Zap, Calendar } from "lucide-react";

const features = [
  {
    icon: Dumbbell,
    title: "Personalized Workouts",
    description: "AI-powered training plans that adapt to your strength, goals, and schedule.",
  },
  {
    icon: Target,
    title: "Progress Tracking",
    description: "Detailed analytics and insights to monitor every rep, set, and personal record.",
  },
  {
    icon: Trophy,
    title: "Achievement System",
    description: "Earn badges and rewards as you conquer your 12 Labors of fitness greatness.",
  },
  {
    icon: Users,
    title: "Community Challenges",
    description: "Compete with fellow warriors in weekly challenges and leaderboards.",
  },
  {
    icon: Zap,
    title: "Quick Workouts",
    description: "Efficient 15-30 minute sessions for busy schedules without sacrificing results.",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "Intelligent rest day suggestions and optimal workout timing based on recovery.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 lg:py-32 bg-gradient-to-b from-background to-card">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-gold text-sm font-semibold uppercase tracking-wider">
            Features
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-4 mb-6">
            <span className="text-foreground">Forge Your </span>
            <span className="text-gradient-gold">Legend</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Everything you need to transform from mortal to myth. Our tools 
            are designed for those who refuse to settle for ordinary.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-8 rounded-2xl bg-gradient-card border border-border/50 hover:border-gold/30 transition-all duration-500 hover:shadow-gold"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-xl bg-gold/10 flex items-center justify-center mb-6 group-hover:bg-gold/20 transition-colors">
                <feature.icon className="w-7 h-7 text-gold" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-3 text-foreground group-hover:text-gold transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

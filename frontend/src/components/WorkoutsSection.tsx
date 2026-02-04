import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, Flame } from "lucide-react";

const workouts = [
  {
    title: "Olympian Strength",
    category: "Strength Training",
    duration: "45 min",
    intensity: "High",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=400&fit=crop",
  },
  {
    title: "Spartan HIIT",
    category: "Cardio",
    duration: "30 min",
    intensity: "Extreme",
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=400&fit=crop",
  },
  {
    title: "Titan Core",
    category: "Core & Abs",
    duration: "25 min",
    intensity: "Medium",
    image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop",
  },
  {
    title: "Atlas Endurance",
    category: "Full Body",
    duration: "60 min",
    intensity: "High",
    image: "https://images.unsplash.com/photo-1605296867424-35fc25c9212a?w=600&h=400&fit=crop",
  },
];

const WorkoutsSection = () => {
  return (
    <section id="workouts" className="py-24 lg:py-32">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <span className="text-gold text-sm font-semibold uppercase tracking-wider">
              Workouts
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-bold mt-4">
              <span className="text-foreground">Legendary </span>
              <span className="text-gradient-gold">Programs</span>
            </h2>
          </div>
          <Button variant="heroOutline" className="w-fit">
            View All Workouts
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Workouts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {workouts.map((workout) => (
            <div
              key={workout.title}
              className="group relative rounded-2xl overflow-hidden cursor-pointer"
            >
              {/* Image */}
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={workout.image}
                  alt={workout.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <span className="text-gold text-xs font-semibold uppercase tracking-wider">
                  {workout.category}
                </span>
                <h3 className="font-display text-xl font-bold text-foreground mt-2 mb-3 group-hover:text-gold transition-colors">
                  {workout.title}
                </h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {workout.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="w-4 h-4 text-accent" />
                    {workout.intensity}
                  </span>
                </div>
              </div>

              {/* Hover Border */}
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-gold/50 rounded-2xl transition-colors" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WorkoutsSection;

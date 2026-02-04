import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Marcus Reid",
    role: "Lost 50 lbs in 6 months",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    content: "Hercules transformed my approach to fitness. The structured programs and tracking made all the difference. I've never felt stronger or more confident.",
    rating: 5,
  },
  {
    name: "Sarah Chen",
    role: "Marathon Runner",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    content: "The personalized workouts adapt perfectly to my marathon training schedule. It's like having a world-class coach in my pocket 24/7.",
    rating: 5,
  },
  {
    name: "David Okonkwo",
    role: "Gained 25 lbs muscle",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    content: "I tried countless apps before Hercules. None of them understood the science of hypertrophy like this. My gains have been legendary.",
    rating: 5,
  },
];

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-24 lg:py-32 bg-gradient-to-b from-card to-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-gold text-sm font-semibold uppercase tracking-wider">
            Testimonials
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-4 mb-6">
            <span className="text-foreground">Warriors </span>
            <span className="text-gradient-gold">Speak</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Join thousands who have already transformed their lives with Hercules.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className="relative p-8 rounded-2xl bg-gradient-card border border-border/50 hover:border-gold/30 transition-all duration-500"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Quote Icon */}
              <Quote className="absolute top-6 right-6 w-10 h-10 text-gold/20" />

              {/* Rating */}
              <div className="flex gap-1 mb-6">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-gold text-gold" />
                ))}
              </div>

              {/* Content */}
              <p className="text-foreground/90 leading-relaxed mb-8">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gold/30"
                />
                <div>
                  <div className="font-semibold text-foreground">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-gold">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

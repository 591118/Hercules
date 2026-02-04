import { Dumbbell, Instagram, Twitter, Youtube, Facebook } from "lucide-react";

const footerLinks = {
  Product: ["Features", "Workouts", "Pricing", "Download App"],
  Company: ["About Us", "Careers", "Press", "Blog"],
  Support: ["Help Center", "Contact Us", "Privacy Policy", "Terms of Service"],
  Community: ["Challenges", "Leaderboard", "Success Stories", "Forum"],
};

const socialLinks = [
  { icon: Instagram, href: "#" },
  { icon: Twitter, href: "#" },
  { icon: Youtube, href: "#" },
  { icon: Facebook, href: "#" },
];

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-6 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center gap-2 mb-6">
              <Dumbbell className="h-8 w-8 text-gold" />
              <span className="font-display text-2xl font-bold text-gradient-gold">
                HERCULES
              </span>
            </a>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Transform your body, conquer your limits, and become the legend 
              you were born to be.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-gold hover:text-primary-foreground transition-colors"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-display font-semibold text-foreground mb-4">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-muted-foreground hover:text-gold transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 Hercules. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Forged with strength. Built for warriors.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Menu, X, Dumbbell, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { isNativeApp } from "@/lib/capacitor";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, login, logout } = useAuth();
  const location = useLocation();

  const isAdmin = user?.rolle === "admin";
  const isCoach = user?.rolle === "admin" || user?.rolle === "kunde_og_coach";
  const hasMultipleViews = isAdmin || isCoach;
  const isKundeView = location.pathname === "/dashboard" || location.pathname === "/dashboard/";
  const isCoachView = location.pathname === "/dashboard/coach";
  const isAdminView = location.pathname === "/dashboard/admin";
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const navLinks = [
    { name: "Workouts", href: "#workouts" },
    { name: "Features", href: "#features" },
    { name: "Testimonials", href: "#testimonials" },
    { name: "Pricing", href: "#pricing" },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      await login(loginEmail.trim(), loginPassword);
      setLoginEmail("");
      setLoginPassword("");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Innlogging feilet");
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link to="/" className="flex items-center gap-2 group">
            <Dumbbell className="h-8 w-8 text-gold transition-transform group-hover:rotate-12" />
            <span className="font-display text-2xl font-bold text-gradient-gold">
              HERCULES
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-muted-foreground hover:text-gold transition-colors font-medium"
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-foreground hover:text-gold gap-2">
                    <User className="h-4 w-4" />
                    {user.navn || user.email}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-2 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{user.navn || user.email}</p>
                    <p className="text-xs">{user.email}</p>
                    <p className="text-xs mt-1">Rolle: {user.rolle}</p>
                  </div>
                  {hasMultipleViews && (
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t border-border mt-1">
                      Bytt view
                    </div>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className={`cursor-pointer ${isKundeView ? "bg-accent font-medium" : ""}`}>
                      Kunde
                    </Link>
                  </DropdownMenuItem>
                  {isCoach && (
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/coach" className={`cursor-pointer ${isCoachView ? "bg-accent font-medium" : ""}`}>
                        Coach
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/admin" className={`cursor-pointer ${isAdminView ? "bg-accent font-medium" : ""}`}>
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => logout()} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logg ut
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="text-foreground hover:text-gold">
                      Sign In
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 p-0" onCloseAutoFocus={(e) => e.preventDefault()}>
                    <form onSubmit={handleLogin} className="p-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">E-post</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="din@epost.no"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                          autoComplete="email"
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Passord</Label>
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                          autoComplete="current-password"
                          className="bg-background"
                        />
                      </div>
                      {loginError && (
                        <p className="text-sm text-destructive">{loginError}</p>
                      )}
                      <Button type="submit" variant="hero" className="w-full" disabled={loginLoading}>
                        {loginLoading ? "Logger inn…" : "Logg inn"}
                      </Button>
                    </form>
                  </DropdownMenuContent>
                </DropdownMenu>
                {!isNativeApp() && (
                  <Button variant="hero" size="default" asChild>
                    <Link to="/signup">Start Free</Link>
                  </Button>
                )}
              </>
            )}
          </div>

          <button
            className="lg:hidden text-foreground p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {isOpen && (
          <div className="lg:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-muted-foreground hover:text-gold transition-colors font-medium py-2"
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                {user ? (
                  <>
                    <p className="text-sm text-muted-foreground">{user.navn || user.email}</p>
                    {hasMultipleViews && <p className="text-xs text-muted-foreground pt-2">Bytt view</p>}
                    <Link to="/dashboard" onClick={() => setIsOpen(false)} className="text-sm py-2 block">Kunde</Link>
                    {isCoach && <Link to="/dashboard/coach" onClick={() => setIsOpen(false)} className="text-sm py-2 block">Coach</Link>}
                    {isAdmin && <Link to="/dashboard/admin" onClick={() => setIsOpen(false)} className="text-sm py-2 block">Admin</Link>}
                    <Button variant="ghost" className="justify-start mt-2" onClick={() => { logout(); setIsOpen(false); }}>
                      Logg ut
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" className="justify-start" asChild>
                      <Link to="/login" onClick={() => setIsOpen(false)}>Sign In</Link>
                    </Button>
                    {!isNativeApp() && (
                      <Button variant="hero" asChild>
                        <Link to="/signup" onClick={() => setIsOpen(false)}>Start Free</Link>
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Dumbbell } from "lucide-react";

const Signup = () => {
  const navigate = useNavigate();
  const { signup, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [navn, setNavn] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Allerede innlogget -> redirect til forsiden
  if (user) {
    navigate("/", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signup(email.trim().toLowerCase(), password, navn.trim() || undefined);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registrering feilet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <Link to="/" className="flex items-center justify-center gap-2 text-gold hover:opacity-90">
          <Dumbbell className="h-10 w-10" />
          <span className="font-display text-2xl font-bold">HERCULES</span>
        </Link>

        <div className="rounded-xl border bg-card p-6 shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-2">Start Free</h1>
          <p className="text-muted-foreground text-center text-sm mb-6">
            Gratis prøveperiode – sett opp konto og kom i gang.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-navn">Navn (valgfritt)</Label>
              <Input
                id="signup-navn"
                type="text"
                placeholder="Ditt navn"
                value={navn}
                onChange={(e) => setNavn(e.target.value)}
                autoComplete="name"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">E-post</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="din@epost.no"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Passord</Label>
              <Input
                id="signup-password"
                type="password"
                placeholder="Minst 6 tegn"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="bg-background"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" variant="hero" className="w-full" disabled={loading}>
              {loading ? "Oppretter konto…" : "Opprett konto – gratis prøve"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Standard rolle er <strong>kunde</strong>. Coach må godkjennes av admin.
          </p>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Har du konto?{" "}
          <Link to="/" className="text-gold hover:underline">
            Logg inn her
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;

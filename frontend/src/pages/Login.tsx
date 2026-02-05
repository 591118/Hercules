import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Dumbbell } from "lucide-react";
import { isNativeApp } from "@/lib/capacitor";

const Login = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate("/", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Innlogging feilet");
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
          <h1 className="text-2xl font-bold text-center mb-2">Sign In</h1>
          <p className="text-muted-foreground text-center text-sm mb-6">
            Logg inn med e-post og passord.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">E-post</Label>
              <Input
                id="login-email"
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
              <Label htmlFor="login-password">Passord</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-background"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" variant="hero" className="w-full" disabled={loading}>
              {loading ? "Logger inn…" : "Logg inn"}
            </Button>
          </form>
        </div>

        {!isNativeApp() && (
          <p className="text-center text-sm text-muted-foreground">
            Har du ikke konto?{" "}
            <Link to="/signup" className="text-gold hover:underline">
              Start Free
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;

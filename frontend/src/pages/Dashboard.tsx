import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { Dumbbell, User, LogOut } from "lucide-react";

const Dashboard = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Du må logge inn for å se dashboard.</p>
        <Button variant="hero" asChild>
          <Link to="/login">Logg inn</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Dumbbell className="h-8 w-8 text-gold" />
            Dashboard
          </h1>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Du er logget inn
              </CardTitle>
              <CardDescription>
                Her kommer oversikt og innhold. Vi bygger ut denne siden i morgen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><span className="text-muted-foreground">Navn:</span> {user.navn || "—"}</p>
              <p><span className="text-muted-foreground">E-post:</span> {user.email}</p>
              <p><span className="text-muted-foreground">Rolle:</span> {user.rolle}</p>
              <Button variant="outline" className="mt-4" onClick={() => logout()} asChild>
                <Link to="/">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logg ut
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

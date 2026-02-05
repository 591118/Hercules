import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Plug, Smartphone, Watch } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";

const INTEGRATIONS = [
  {
    id: "apple-health",
    name: "Apple Health",
    description: "Skritt, aktivitet og treningsdata fra iPhone og Apple Watch.",
    icon: Smartphone,
    comingSoon: true,
  },
  {
    id: "polar",
    name: "Polar",
    description: "Skritt og treningsdata fra Polar Flow og Polar ure.",
    icon: Watch,
    comingSoon: true,
  },
  {
    id: "garmin",
    name: "Garmin",
    description: "Skritt og aktivitet fra Garmin Connect og Garmin-klokker.",
    icon: Watch,
    comingSoon: true,
  },
];

export default function Integrations() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Du må logge inn for å se Integrasjoner.</p>
        <Button variant="hero" asChild>
          <Link to="/login">Logg inn</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 lg:py-12 pt-24 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-2">
              <Plug className="h-8 w-8 text-gold" />
              Integrasjoner
            </h1>
            <p className="text-muted-foreground">
              Koble tjenester for å hente skritt og aktivitet automatisk
            </p>
          </div>
        </div>

        <Card className="mb-8 border-border">
          <CardHeader>
            <CardTitle>Tilgjengelige kilder</CardTitle>
            <CardDescription>
              Når du kobler til en tjeneste, hentes skritt og (ved støtte) treningsdata automatisk inn i Hercules. Dette brukes blant annet i Ernæring for estimat forbrent og i Analyse.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {INTEGRATIONS.map((int) => {
              const Icon = int.icon;
              return (
                <div
                  key={int.id}
                  className="flex items-start gap-4 rounded-lg border border-border p-4"
                >
                  <div className="rounded-lg bg-muted p-3">
                    <Icon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{int.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{int.description}</p>
                    {int.comingSoon && (
                      <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                        Kommer snart – du kan koble til her når støtten er aktiv.
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      disabled={int.comingSoon}
                    >
                      {int.comingSoon ? "Kommer snart" : "Koble til"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          Flere kilder (f.eks. Strava, Whoop) kan legges til senere. Skritt som hentes her vises i Ernæring under Aktiviteter.
        </p>
      </main>
    </div>
  );
}

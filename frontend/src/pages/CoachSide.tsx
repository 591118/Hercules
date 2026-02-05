import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, UserCircle, Loader2, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";

const getApiUrl = () => {
  if (import.meta.env.DEV) return import.meta.env.VITE_API_URL || "";
  return "";
};

type CoachInfo = {
  id: string;
  coach_id: string;
  coach_navn: string;
  coach_email: string;
  coach_beskrivelse: string;
  coach_spesialiseringer: string;
  coach_bilde?: string | null;
  start_dato: string | null;
  slutt_dato: string | null;
  har_tilgang: boolean;
};

type CoachListItem = {
  id: string;
  navn: string;
  email: string;
  coach_beskrivelse: string;
  coach_spesialiseringer: string;
  coach_bilde?: string | null;
  program_lengder?: number[];
};

const CoachSide = () => {
  const { user, token } = useAuth();
  const [myCoach, setMyCoach] = useState<CoachInfo | null | "loading">("loading");
  const [coachList, setCoachList] = useState<CoachListItem[]>([]);
  const [avslutter, setAvslutter] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyCoach = useCallback(async () => {
    if (!token) return;
    const base = getApiUrl();
    const res = await fetch(`${base}/api/me/coach`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setMyCoach(null);
      return;
    }
    const data = await res.json();
    setMyCoach(data ?? null);
  }, [token]);

  const fetchCoaches = useCallback(async () => {
    if (!token) return;
    const base = getApiUrl();
    const res = await fetch(`${base}/api/coaches`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    setCoachList(Array.isArray(data) ? data : []);
  }, [token]);

  useEffect(() => {
    if (!user || !token) return;
    fetchMyCoach().finally(() => {});
  }, [user, token, fetchMyCoach]);

  useEffect(() => {
    if (!user || !token || myCoach === "loading") return;
    if (myCoach === null) fetchCoaches();
  }, [user, token, myCoach, fetchCoaches]);

  const avsluttTilgang = async () => {
    if (!token) return;
    setError(null);
    setAvslutter(true);
    const base = getApiUrl();
    try {
      const res = await fetch(`${base}/api/me/coach/avslutt`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "Kunne ikke avslutte");
        return;
      }
      await fetchMyCoach();
      if (coachList.length === 0) await fetchCoaches();
    } finally {
      setAvslutter(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Du må logge inn for å se Coach-siden.</p>
        <Button variant="hero" asChild>
          <Link to="/login">Logg inn</Link>
        </Button>
      </div>
    );
  }

  const coach = myCoach === "loading" ? null : myCoach;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 lg:py-12 pt-28 lg:pt-32 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <UserCircle className="h-8 w-8 text-gold" />
            Coach
          </h1>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {myCoach === "loading" && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Har coach med tilgang */}
        {coach && coach.har_tilgang && (
          <Card className="mb-8 border-border overflow-hidden">
            {coach.coach_bilde && (
              <div className="aspect-[3/1] bg-muted overflow-hidden">
                <img src={coach.coach_bilde} alt={coach.coach_navn} className="w-full h-full object-cover" />
              </div>
            )}
            <CardHeader>
              <CardTitle>Min coach</CardTitle>
              <CardDescription>Full tilgang til appen med coachen du valgte</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-display text-xl font-bold text-gold">{coach.coach_navn}</p>
                <p className="text-sm text-muted-foreground">{coach.coach_email}</p>
              </div>
              {coach.coach_beskrivelse && (
                <p className="text-muted-foreground">{coach.coach_beskrivelse}</p>
              )}
              {coach.coach_spesialiseringer && (
                <p className="text-sm">
                  <span className="text-muted-foreground">God på: </span>
                  {coach.coach_spesialiseringer}
                </p>
              )}
              {coach.slutt_dato && (
                <p className="text-sm text-muted-foreground">
                  Tilgang til{" "}
                  {format(parseISO(coach.slutt_dato), "d. MMMM yyyy", { locale: nb })}
                </p>
              )}
              <p className="text-sm text-muted-foreground border-t pt-4">
                Programmet og alt du har gjort er tilgjengelig for deg – også etter at coach-tilgangen er over.
              </p>
              <Button variant="outline" onClick={avsluttTilgang} disabled={avslutter}>
                {avslutter ? <Loader2 className="h-4 w-4 animate-spin" /> : "Avslutt coach-tilgang nå"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Hadde coach, tilgang er over */}
        {coach && !coach.har_tilgang && (
          <Card className="mb-8 border-border">
            <CardHeader>
              <CardTitle>Coach-tilgang er avsluttet</CardTitle>
              <CardDescription>Du hadde tilgang til {coach.coach_navn}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Du beholder tilgang til alle program og alt du har logget. Ingen data er fjernet.
              </p>
              <p className="text-sm text-muted-foreground">
                Vil du velge en ny coach? Se listen nedenfor og prøv en coach i 12 uker.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Liste over tilgjengelige coach – vis når ingen aktiv coach eller for å velge ny */}
        {(coach === null || !coach.har_tilgang) && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle>{coach && !coach.har_tilgang ? "Velg en ny coach" : "Finn en coach"}</CardTitle>
              <CardDescription>
                Se coach og velg programlengde. Full tilgang til appen i valgt periode – program og logger beholdes etterpå.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {coachList.length === 0 && myCoach !== "loading" && (
                <p className="text-muted-foreground py-4">
                  Det er foreløpig ingen coach tilgjengelig. Sjekk senere.
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {coachList.map((c) => (
                  <Link
                    key={c.id}
                    to={`/dashboard/coach-side/coach/${c.id}`}
                    className="group block rounded-lg border border-border bg-card overflow-hidden hover:border-gold/50 transition-colors"
                  >
                    <div className="aspect-[2/1] bg-muted flex items-center justify-center overflow-hidden">
                      {c.coach_bilde ? (
                        <img
                          src={c.coach_bilde}
                          alt={c.navn}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <UserCircle className="h-16 w-16 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="p-4">
                      <p className="font-display font-semibold text-lg group-hover:text-gold transition-colors">{c.navn}</p>
                      {c.coach_beskrivelse && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{c.coach_beskrivelse}</p>
                      )}
                      {c.coach_spesialiseringer && (
                        <p className="text-xs text-muted-foreground mt-1">God på: {c.coach_spesialiseringer}</p>
                      )}
                      <span className="inline-flex items-center gap-1 text-sm text-gold font-medium mt-2">
                        Se profil og velg lengde
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-6">
          <Button variant="outline" asChild>
            <Link to="/dashboard">Tilbake til Kunde Dashboard</Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default CoachSide;

import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, UserCircle, Loader2, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";

const getApiUrl = () => {
  if (import.meta.env.DEV) return import.meta.env.VITE_API_URL || "";
  return "";
};

type CoachDetailType = {
  id: string;
  navn: string;
  email: string;
  coach_beskrivelse: string;
  coach_spesialiseringer: string;
  coach_bilde: string | null;
  program_lengder: number[];
};

const CoachDetail = () => {
  const { coachId } = useParams<{ coachId: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [coach, setCoach] = useState<CoachDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningWeeks, setAssigningWeeks] = useState<number | null>(null);

  useEffect(() => {
    if (!coachId || !token) return;
    const base = getApiUrl();
    fetch(`${base}/api/coaches/${coachId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Coach ikke funnet");
        return res.json();
      })
      .then(setCoach)
      .catch(() => setError("Kunne ikke hente coach"))
      .finally(() => setLoading(false));
  }, [coachId, token]);

  const assignCoach = async (lengde_uker: number) => {
    if (!token || !coachId) return;
    setError(null);
    setAssigningWeeks(lengde_uker);
    const base = getApiUrl();
    try {
      const res = await fetch(`${base}/api/me/coach`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ coach_id: coachId, lengde_uker }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || "Kunne ikke velge coach");
        return;
      }
      navigate("/dashboard/coach-side", { replace: true });
    } finally {
      setAssigningWeeks(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Du må logge inn for å se coach.</p>
        <Button variant="hero" asChild>
          <Link to="/login">Logg inn</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 lg:py-12 pt-28 lg:pt-32 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard/coach-side">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="font-display text-2xl font-bold">Coach-profil</h1>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && coach && (
          <Card className="border-border overflow-hidden">
            <div className="aspect-[2/1] bg-muted flex items-center justify-center overflow-hidden">
              {coach.coach_bilde ? (
                <img
                  src={coach.coach_bilde}
                  alt={coach.navn}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserCircle className="h-24 w-24 text-muted-foreground/50" />
              )}
            </div>
            <CardHeader>
              <CardTitle className="font-display text-2xl text-gold">{coach.navn}</CardTitle>
              <CardDescription>{coach.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {coach.coach_beskrivelse && (
                <p className="text-muted-foreground">{coach.coach_beskrivelse}</p>
              )}
              {coach.coach_spesialiseringer && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">God på</p>
                  <p className="text-foreground">{coach.coach_spesialiseringer}</p>
                </div>
              )}

              <div className="border-t pt-6">
                <p className="text-sm font-medium mb-2">Velg programlengde</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Full tilgang til appen med denne coachen i valgt periode. Program og logger beholdes etterpå.
                </p>
                <div className="flex flex-wrap gap-3">
                  {(coach.program_lengder.length ? coach.program_lengder : [12]).map((uker) => (
                    <Button
                      key={uker}
                      variant="hero"
                      onClick={() => assignCoach(uker)}
                      disabled={assigningWeeks !== null}
                    >
                      {assigningWeeks === uker ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          {uker} uker
                        </>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !coach && !error && (
          <p className="text-muted-foreground">Coach ikke funnet.</p>
        )}

        <div className="mt-6">
          <Button variant="outline" asChild>
            <Link to="/dashboard/coach-side">Tilbake til coach-listen</Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default CoachDetail;

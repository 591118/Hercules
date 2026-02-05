import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell, Flame, CalendarDays, BarChart3, UserCircle, LogOut, Plug } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

const KundeDashboard = () => {
  const { user, logout } = useAuth();
  const displayName = user?.navn || user?.email || "Kunde";
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Du må logge inn for å se Kunde Dashboard.</p>
        <Button variant="hero" asChild>
          <Link to="/login">Logg inn</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 group">
              <Dumbbell className="h-8 w-8 text-gold transition-transform group-hover:rotate-12" />
              <span className="font-display text-2xl font-bold text-gradient-gold">
                HERCULES
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => logout()}
              title="Logg ut"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 lg:py-12">
        {/* Kunde Dashboard – det kunden ser */}
        <div className="mb-10">
          <h1 className="font-display text-3xl lg:text-4xl font-bold mb-2">
            Kunde Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Velkommen tilbake, <span className="text-gradient-gold">{displayName}</span>. Hva vil du fokusere på i dag?
          </p>
        </div>
        {/* Main Options Grid */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl">
          <Link to="/dashboard/calories">
            <Card className="group cursor-pointer border-2 border-border hover:border-gold/50 transition-all duration-300 hover:shadow-gold bg-card/50 backdrop-blur h-full">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Flame className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="font-display text-2xl group-hover:text-gold transition-colors">
                  Kaloritelling
                </CardTitle>
                <CardDescription className="text-base">
                  Spor daglig kosthold og kaloriinntak
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                    Logg måltider og småspiser
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                    Spor makronæringsstoffer
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                    Sett daglige mål
                  </li>
                </ul>
                <Button variant="hero" className="w-full mt-6 group-hover:shadow-gold">
                  Åpne kalorier
                </Button>
              </CardContent>
            </Card>
          </Link>
          <Link to="/dashboard/workouts">
            <Card className="group cursor-pointer border-2 border-border hover:border-gold/50 transition-all duration-300 hover:shadow-gold bg-card/50 backdrop-blur h-full">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gold to-bronze flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Dumbbell className="h-8 w-8 text-primary-foreground" />
                </div>
                <CardTitle className="font-display text-2xl group-hover:text-gold transition-colors">
                  Trening
                </CardTitle>
                <CardDescription className="text-base">
                  Tilgang til treningsprogram og øvelser
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                    Se treningsplaner
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                    Spor fremgang
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                    Øvelsesbibliotek
                  </li>
                </ul>
                <Button variant="hero" className="w-full mt-6 group-hover:shadow-gold">
                  Åpne trening
                </Button>
              </CardContent>
            </Card>
          </Link>
          <Link to="/dashboard/analyse">
            <Card className="group cursor-pointer border-2 border-border hover:border-gold/50 transition-all duration-300 hover:shadow-gold bg-card/50 backdrop-blur h-full">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="font-display text-2xl group-hover:text-gold transition-colors">
                  Analyse
                </CardTitle>
                <CardDescription className="text-base">
                  Vektgraf og utvikling over tid
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                    Vektgraf
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                    Se historikk
                  </li>
                </ul>
                <Button variant="hero" className="w-full mt-6 group-hover:shadow-gold">
                  Åpne Analyse
                </Button>
              </CardContent>
            </Card>
          </Link>
          <Link to="/dashboard/integrations">
            <Card className="group cursor-pointer border-2 border-border hover:border-gold/50 transition-all duration-300 hover:shadow-gold bg-card/50 backdrop-blur h-full">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Plug className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="font-display text-2xl group-hover:text-gold transition-colors">
                  Integrasjoner
                </CardTitle>
                <CardDescription className="text-base">
                  Apple Health, Polar, Garmin – skritt og aktivitet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                    Koble til kilder
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                    Skritt hentes automatisk
                  </li>
                </ul>
                <Button variant="hero" className="w-full mt-6 group-hover:shadow-gold">
                  Åpne Integrasjoner
                </Button>
              </CardContent>
            </Card>
          </Link>
          <Link to="/dashboard/coach-side">
            <Card className="group cursor-pointer border-2 border-border hover:border-gold/50 transition-all duration-300 hover:shadow-gold bg-card/50 backdrop-blur h-full">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <UserCircle className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="font-display text-2xl group-hover:text-gold transition-colors">
                  Coach
                </CardTitle>
                <CardDescription className="text-base">
                  Min coach eller finn en coach – prøv i 12 uker
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                    Se din coach eller liste over coach
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                    Prøv en coach i 12 uker
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                    Program og logger beholdes alltid
                  </li>
                </ul>
                <Button variant="hero" className="w-full mt-6 group-hover:shadow-gold">
                  Åpne Coach
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Kalender – velg dag og se */}
        <div className="mt-12 max-w-4xl">
          <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-gold" />
            Kalender
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg">Velg dag</CardTitle>
                <CardDescription>Klikk på en dato for å se oversikt for den dagen</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={nb}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg">Valgt dag</CardTitle>
                <CardDescription>
                  {selectedDate
                    ? format(selectedDate, "d. MMMM yyyy", { locale: nb })
                    : "Velg en dato i kalenderen"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedDate && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Kalorier</span>
                      <span className="font-medium">— / 2 000</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Trening</span>
                      <span className="font-medium">—</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Vekt</span>
                      <span className="font-medium">—</span>
                    </div>
                    <p className="text-xs text-muted-foreground pt-2">
                      Data for denne dagen vises når du har logget aktivitet.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Analyse – siste dager, uker, måneder */}
        <div className="mt-12 max-w-4xl">
          <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gold" />
            Analyse
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            Se hvordan du har gjort det over tid
          </p>
          <Tabs defaultValue="dager" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="dager">Siste 7 dager</TabsTrigger>
              <TabsTrigger value="uker">Siste 4 uker</TabsTrigger>
              <TabsTrigger value="maneder">Siste 3 mnd</TabsTrigger>
            </TabsList>
            <TabsContent value="dager" className="mt-4">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Siste 7 dager</CardTitle>
                  <CardDescription>Gjennomsnitt og totalt per dag</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-muted-foreground text-sm">Kalorier (snitt)</p>
                      <p className="font-display text-xl font-bold text-gold">—</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">Treninger</p>
                      <p className="font-display text-xl font-bold text-gold">—</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">Dager på mål</p>
                      <p className="font-display text-xl font-bold text-gold">—</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">Aktive dager</p>
                      <p className="font-display text-xl font-bold text-gold">—</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Data fylles ut når du logger kosthold og trening.</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="uker" className="mt-4">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Siste 4 uker</CardTitle>
                  <CardDescription>Ukentlig oversikt og trender</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-muted-foreground text-sm">Kalorier (uke snitt)</p>
                      <p className="font-display text-xl font-bold text-gold">—</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">Treninger totalt</p>
                      <p className="font-display text-xl font-bold text-gold">—</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">Best uke</p>
                      <p className="font-display text-xl font-bold text-gold">—</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">Konsistens</p>
                      <p className="font-display text-xl font-bold text-gold">—</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Ukentlig analyse vises her når du har nok data.</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="maneder" className="mt-4">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Siste 3 måneder</CardTitle>
                  <CardDescription>Månedlig fremgang og mål</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-muted-foreground text-sm">Kalorier (mnd snitt)</p>
                      <p className="font-display text-xl font-bold text-gold">—</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">Treninger totalt</p>
                      <p className="font-display text-xl font-bold text-gold">—</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">Vektutvikling</p>
                      <p className="font-display text-xl font-bold text-gold">—</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">Mål oppnådd</p>
                      <p className="font-display text-xl font-bold text-gold">—</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Langtidsanalyse over flere måneder.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Quick Stats */}
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl">
          <Card className="bg-card/30 border-border">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">Dagens kalorier</p>
              <p className="font-display text-2xl font-bold text-gold">1 450</p>
              <p className="text-xs text-muted-foreground">/ 2 000 mål</p>
            </CardContent>
          </Card>
          <Card className="bg-card/30 border-border">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">Treninger denne uken</p>
              <p className="font-display text-2xl font-bold text-gold">4</p>
              <p className="text-xs text-muted-foreground">/ 5 mål</p>
            </CardContent>
          </Card>
          <Card className="bg-card/30 border-border">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">Rekke (dager)</p>
              <p className="font-display text-2xl font-bold text-gold">12</p>
              <p className="text-xs text-muted-foreground">dager</p>
            </CardContent>
          </Card>
          <Card className="bg-card/30 border-border">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">Totalt treninger</p>
              <p className="font-display text-2xl font-bold text-gold">87</p>
              <p className="text-xs text-muted-foreground">fullført</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default KundeDashboard;

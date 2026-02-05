import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { format, subDays } from "date-fns";
import { nb } from "date-fns/locale";

const getApiUrl = () => (import.meta.env.DEV ? import.meta.env.VITE_API_URL || "" : "");

export default function Analyse() {
  const { user, token } = useAuth();
  const [history, setHistory] = useState<{ date: string; weight_kg: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"30" | "90" | "365">("90");

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const days = range === "30" ? 30 : range === "90" ? 90 : 365;
    const to = format(new Date(), "yyyy-MM-dd");
    const from = format(subDays(new Date(), days), "yyyy-MM-dd");
    try {
      const res = await fetch(
        `${getApiUrl()}/api/weight/history?from_date=${from}&to_date=${to}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      } else setHistory([]);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [token, range]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const chartData = history.map((h) => ({
    ...h,
    displayDate: format(new Date(h.date), "d. MMM", { locale: nb }),
  }));

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Du må logge inn for å se Analyse.</p>
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
            <h1 className="font-display text-3xl font-bold">Analyse</h1>
            <p className="text-muted-foreground">Vekt og utvikling over tid</p>
          </div>
        </div>

        <Card className="mb-8 border-border">
          <CardHeader>
            <CardTitle>Vektgraf</CardTitle>
            <CardDescription>
              Vekten du har registrert dag for dag. Registrer vekt på Ernæring-siden.
            </CardDescription>
            <div className="flex gap-2 mt-2">
              {(["30", "90", "365"] as const).map((r) => (
                <Button
                  key={r}
                  variant={range === r ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRange(r)}
                >
                  {r === "30" ? "30 dager" : r === "90" ? "90 dager" : "1 år"}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground py-8">Laster…</p>
            ) : chartData.length === 0 ? (
              <p className="text-muted-foreground py-8">
                Ingen vektregistreringer i denne perioden. Registrer vekt under Ernæring for å se graf.
              </p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="displayDate"
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={["dataMin - 2", "dataMax + 2"]}
                      tick={{ fontSize: 12 }}
                      unit=" kg"
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.date
                          ? format(new Date(payload[0].payload.date), "d. MMMM yyyy", { locale: nb })
                          : ""
                      }
                      formatter={(value: number) => [`${value} kg`, "Vekt"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight_kg"
                      stroke="hsl(43, 74%, 49%)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Vekt"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          <Link to="/dashboard/calories" className="underline hover:text-foreground">
            Gå til Ernæring
          </Link>
          {" "}
          for å registrere vekt for en gitt dag.
        </p>
      </main>
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dumbbell,
  ChevronLeft,
  ChevronDown,
  Plus,
  Trash2,
  Clock,
  Calendar,
  ListChecks,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";

// —— Types ——
interface Exercise {
  id: string;
  name: string;
  description: string;
}

interface ProgramExercise {
  exerciseId: string;
  sets: number;
  suggestedReps?: string; // e.g. "8-10"
}

type ProgramType = "single" | "over_tid";

interface Program {
  id: string;
  name: string;
  type: ProgramType;
  description: string;
  exercises: ProgramExercise[];
  /** For over_tid: which day in the plan (e.g. uke 1 dag 1) */
  days?: { dayLabel: string; exercises: ProgramExercise[] }[];
}

interface SetLog {
  reps: number;
}

interface SessionExercise {
  id: string;
  exerciseId: string;
  sets: SetLog[];
  numSets: number; // for display/edit
}

interface LoggedSession {
  id: string;
  startedAt: string; // ISO or "HH:mm"
  mode: "fri" | "program" | "over_tid";
  programId?: string;
  exercises: SessionExercise[];
}

// —— Default data ——
const DEFAULT_EXERCISES: Exercise[] = [
  { id: "1", name: "Benkpress", description: "Ligg på benk, senk stangen til brystet og press opp. Grep litt bredere enn skulderbredde. God core-stramming." },
  { id: "2", name: "Markløft", description: "Stå med føttene skulderbredde, bøy fra hofta og hold ryggen rett. Reis deg ved å strekke hofter og knær." },
  { id: "3", name: "Squat", description: "Stå med føttene skulderbredde, bøy knær og hofter og senk til lårene er minst parallelle med gulvet. Hold ryggen rett." },
  { id: "4", name: "Pull-ups", description: "Heng i en pull-up-stang med overhåndsgrep. Trekk deg opp til haken er over stangen, senk kontrollert." },
  { id: "5", name: "Overhead press", description: "Stå eller sitt med stang eller håndvekter i skulderhøyde. Press vekten over hodet til armene er strake." },
  { id: "6", name: "Rows (barbell eller dumbbell)", description: "Bøy over med støtte, trekk vekten mot underbrystet/mage. Squeeze skulderbladene sammen." },
  { id: "7", name: "Biceps curls", description: "Stå eller sitt, hold vekter ved sidene. Bøy albuene og curl vektene mot skuldrene." },
  { id: "8", name: "Plank", description: "Ligg på underarmene og tærne, hold kroppen i en rett linje. Hold core stram." },
];

const DEFAULT_PROGRAMS: Program[] = [
  {
    id: "p1",
    name: "Push / Pull / Bein (enkelt)",
    type: "single",
    description: "Én runde: push-dag med benk, overhead press og triceps.",
    exercises: [
      { exerciseId: "1", sets: 4, suggestedReps: "8-10" },
      { exerciseId: "5", sets: 3, suggestedReps: "10" },
    ],
    days: undefined,
  },
  {
    id: "p2",
    name: "Styrke 12 uker",
    type: "over_tid",
    description: "12 ukers program med planlagte dager. Alt er ferdig planlagt – du følger uke og dag.",
    exercises: [],
    days: [
      { dayLabel: "Uke 1 – Dag 1 (Push)", exercises: [{ exerciseId: "1", sets: 4, suggestedReps: "8" }, { exerciseId: "5", sets: 3, suggestedReps: "10" }] },
      { dayLabel: "Uke 1 – Dag 2 (Pull)", exercises: [{ exerciseId: "4", sets: 3, suggestedReps: "6-8" }, { exerciseId: "6", sets: 4, suggestedReps: "8" }] },
      { dayLabel: "Uke 1 – Dag 3 (Ben)", exercises: [{ exerciseId: "3", sets: 4, suggestedReps: "8" }, { exerciseId: "2", sets: 3, suggestedReps: "6" }] },
    ],
  },
];

const Trening = () => {
  const { user } = useAuth();
  const [exercises] = useState<Exercise[]>(DEFAULT_EXERCISES);
  const [programs] = useState<Program[]>(DEFAULT_PROGRAMS);
  const [sessions, setSessions] = useState<LoggedSession[]>([]);

  // Logg økt state
  const [logMode, setLogMode] = useState<"fri" | "program" | "over_tid">("fri");
  const [sessionStart, setSessionStart] = useState<string>("");
  const [freeExercises, setFreeExercises] = useState<SessionExercise[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [programReps, setProgramReps] = useState<Record<string, Record<number, number>>>({});
  const [overTidProgramId, setOverTidProgramId] = useState<string>("");
  const [overTidDayIndex, setOverTidDayIndex] = useState<number>(0);
  const [overTidReps, setOverTidReps] = useState<Record<string, Record<number, number>>>({});

  const getExerciseById = (id: string) => exercises.find((e) => e.id === id) ?? { id: "", name: "?", description: "" };

  const addFreeExercise = () => {
    const numSets = 3;
    setFreeExercises((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        exerciseId: exercises[0]?.id ?? "",
        sets: Array.from({ length: numSets }, () => ({ reps: 0 })),
        numSets,
      },
    ]);
  };

  const updateFreeExercise = (id: string, patch: Partial<SessionExercise>) => {
    setFreeExercises((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const setFreeExerciseSets = (id: string, numSets: number) => {
    setFreeExercises((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const sets = Array.from({ length: numSets }, (_, i) => e.sets[i] ?? { reps: 0 });
        return { ...e, numSets, sets };
      })
    );
  };

  const setFreeExerciseReps = (exerciseRowId: string, setIndex: number, reps: number) => {
    setFreeExercises((prev) =>
      prev.map((e) => {
        if (e.id !== exerciseRowId) return e;
        const sets = [...e.sets];
        sets[setIndex] = { reps };
        return { ...e, sets };
      })
    );
  };

  const removeFreeExercise = (id: string) => setFreeExercises((prev) => prev.filter((e) => e.id !== id));

  const saveSession = () => {
    if (logMode === "fri" && freeExercises.length > 0) {
      const session: LoggedSession = {
        id: crypto.randomUUID(),
        startedAt: sessionStart || new Date().toTimeString().slice(0, 5),
        mode: "fri",
        exercises: freeExercises.map((e) => ({ ...e, sets: e.sets.slice(0, e.numSets) })),
      };
      setSessions((prev) => [session, ...prev]);
      setSessionStart("");
      setFreeExercises([]);
    }
    if (logMode === "program" && selectedProgramId) {
      const program = programs.find((p) => p.id === selectedProgramId);
      if (!program) return;
      const session: LoggedSession = {
        id: crypto.randomUUID(),
        startedAt: sessionStart || new Date().toTimeString().slice(0, 5),
        mode: "program",
        programId: selectedProgramId,
        exercises: program.exercises.map((pe, ei) => ({
          id: `e-${ei}`,
          exerciseId: pe.exerciseId,
          numSets: pe.sets,
          sets: Array.from({ length: pe.sets }, (_, si) => ({
            reps: programReps[pe.exerciseId]?.[si] ?? 0,
          })),
        })),
      };
      setSessions((prev) => [session, ...prev]);
      setSelectedProgramId("");
      setProgramReps({});
      setSessionStart("");
    }
    if (logMode === "over_tid" && overTidProgramId) {
      const program = programs.find((p) => p.id === overTidProgramId && p.days?.length);
      const dayPlan = program?.days?.[overTidDayIndex];
      if (!dayPlan) return;
      const session: LoggedSession = {
        id: crypto.randomUUID(),
        startedAt: sessionStart || new Date().toTimeString().slice(0, 5),
        mode: "over_tid",
        programId: overTidProgramId,
        exercises: dayPlan.exercises.map((pe, ei) => ({
          id: `e-${ei}`,
          exerciseId: pe.exerciseId,
          numSets: pe.sets,
          sets: Array.from({ length: pe.sets }, (_, si) => ({
            reps: overTidReps[pe.exerciseId]?.[si] ?? 0,
          })),
        })),
      };
      setSessions((prev) => [session, ...prev]);
      setOverTidProgramId("");
      setOverTidDayIndex(0);
      setOverTidReps({});
      setSessionStart("");
    }
  };

  const selectedProgram = programs.find((p) => p.id === selectedProgramId);
  const overTidProgram = programs.find((p) => p.id === overTidProgramId);
  const overTidDay = overTidProgram?.days?.[overTidDayIndex];

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Du må logge inn for å se Trening.</p>
        <Button variant="hero" asChild>
          <Link to="/login">Logg inn</Link>
        </Button>
      </div>
    );
  }

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
            <Dumbbell className="h-8 w-8 text-gold" />
            Treningsdashboard
          </h1>
        </div>

        {/* Treningsprogram */}
        <Card className="mb-8 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gold" />
              Treningsprogram
            </CardTitle>
            <CardDescription>Program over tid og enkeltprogram – velg og følg</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="over_tid" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="over_tid">Program over tid</TabsTrigger>
                <TabsTrigger value="enkelt">Enkeltprogram</TabsTrigger>
              </TabsList>
              <TabsContent value="over_tid" className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">Program som strekker seg over uker – alt er ferdig planlagt.</p>
                {programs.filter((p) => p.type === "over_tid").map((p) => (
                  <div key={p.id} className="rounded-lg border border-border p-4">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{p.days?.length ?? 0} dager i planen</p>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="enkelt" className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">Enkeltprogram – én økt med faste øvelser og set, du logger reps.</p>
                {programs.filter((p) => p.type === "single").map((p) => (
                  <div key={p.id} className="rounded-lg border border-border p-4">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{p.exercises.length} øvelser</p>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Øvelser */}
        <Card className="mb-8 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-gold" />
              Øvelser
            </CardTitle>
            <CardDescription>Enkeltøvelser med forklaring – bruk i fri logging eller i program</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {exercises.map((ex) => (
                <Collapsible key={ex.id}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left hover:bg-muted/50">
                    <span className="font-medium">{ex.name}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <p className="rounded-b-lg border border-t-0 border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                      {ex.description}
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Logg økt */}
        <Card className="mb-8 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gold" />
              Logg økt
            </CardTitle>
            <CardDescription>Fri logging med egne øvelser, eller velg ferdig program og bare fyll inn reps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={logMode === "fri" ? "default" : "outline"}
                size="sm"
                onClick={() => setLogMode("fri")}
              >
                Fri logging
              </Button>
              <Button
                variant={logMode === "program" ? "default" : "outline"}
                size="sm"
                onClick={() => setLogMode("program")}
              >
                Velg ferdig program
              </Button>
              <Button
                variant={logMode === "over_tid" ? "default" : "outline"}
                size="sm"
                onClick={() => setLogMode("over_tid")}
              >
                Program over tid
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Tidspunkt for økten</Label>
              <Input
                type="time"
                value={sessionStart}
                onChange={(e) => setSessionStart(e.target.value)}
                className="w-36"
              />
            </div>

            {/* Fri logging */}
            {logMode === "fri" && (
              <>
                <p className="text-sm text-muted-foreground">Legg inn øvelser selv. Velg øvelse, antall sett og reps per sett.</p>
                <Button type="button" variant="outline" size="sm" onClick={addFreeExercise} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Legg til øvelse
                </Button>
                <div className="space-y-4">
                  {freeExercises.map((row) => {
                    const ex = getExerciseById(row.exerciseId);
                    const sets = row.sets.length < row.numSets
                      ? [...row.sets, ...Array(row.numSets - row.sets.length).fill({ reps: 0 })].slice(0, row.numSets) as SetLog[]
                      : row.sets;
                    return (
                      <div key={row.id} className="rounded-lg border border-border p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <Select
                            value={row.exerciseId}
                            onValueChange={(v) => updateFreeExercise(row.id, { exerciseId: v })}
                          >
                            <SelectTrigger className="w-56">
                              <SelectValue placeholder="Velg øvelse" />
                            </SelectTrigger>
                            <SelectContent>
                              {exercises.map((e) => (
                                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Sett</Label>
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              value={row.numSets}
                              onChange={(e) => setFreeExerciseSets(row.id, Math.max(1, Number(e.target.value) || 1))}
                              className="w-14"
                            />
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeFreeExercise(row.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {Array.from({ length: row.numSets }).map((_, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <Label className="text-xs">Sett {i + 1}</Label>
                              <Input
                                type="number"
                                min={0}
                                value={sets[i]?.reps ?? ""}
                                onChange={(e) => setFreeExerciseReps(row.id, i, Number(e.target.value) || 0)}
                                className="w-16"
                                placeholder="Reps"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Velg ferdig program – bare reps */}
            {logMode === "program" && (
              <>
                <div className="space-y-2">
                  <Label>Velg program</Label>
                  <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue placeholder="Velg enkeltprogram" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.filter((p) => p.type === "single").map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedProgram && (
                  <div className="space-y-4 pt-2">
                    <p className="text-sm text-muted-foreground">Settene er ferdig – fyll inn reps for hver sett.</p>
                    {selectedProgram.exercises.map((pe) => {
                      const ex = getExerciseById(pe.exerciseId);
                      return (
                        <div key={pe.exerciseId} className="rounded-lg border border-border p-4">
                          <p className="font-medium mb-2">{ex.name}</p>
                          <div className="flex flex-wrap gap-3">
                            {Array.from({ length: pe.sets }).map((_, i) => (
                              <div key={i} className="flex items-center gap-1">
                                <Label className="text-xs">Sett {i + 1}</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={programReps[pe.exerciseId]?.[i] ?? ""}
                                  onChange={(e) => {
                                    const v = Number(e.target.value) || 0;
                                    setProgramReps((prev) => ({
                                      ...prev,
                                      [pe.exerciseId]: { ...prev[pe.exerciseId], [i]: v },
                                    }));
                                  }}
                                  className="w-16"
                                  placeholder="Reps"
                                />
                              </div>
                            ))}
                          </div>
                          {pe.suggestedReps && (
                            <p className="text-xs text-muted-foreground mt-1">Forslag: {pe.suggestedReps} reps</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Program over tid – alt ferdig planlagt */}
            {logMode === "over_tid" && (
              <>
                <div className="space-y-2">
                  <Label>Velg program over tid</Label>
                  <Select value={overTidProgramId} onValueChange={(v) => { setOverTidProgramId(v); setOverTidDayIndex(0); setOverTidReps({}); }}>
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue placeholder="Velg program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.filter((p) => p.type === "over_tid").map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {overTidProgram?.days && overTidProgram.days.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <Label>Velg dag i planen</Label>
                      <Select value={String(overTidDayIndex)} onValueChange={(v) => { setOverTidDayIndex(Number(v)); setOverTidReps({}); }}>
                        <SelectTrigger className="w-full max-w-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {overTidProgram.days.map((d, i) => (
                            <SelectItem key={i} value={String(i)}>{d.dayLabel}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {overTidDay && (
                      <div className="space-y-4 pt-2">
                        <p className="text-sm text-muted-foreground">Alt er ferdig planlagt – fyll inn reps.</p>
                        {overTidDay.exercises.map((pe) => {
                          const ex = getExerciseById(pe.exerciseId);
                          return (
                            <div key={pe.exerciseId} className="rounded-lg border border-border p-4">
                              <p className="font-medium mb-2">{ex.name}</p>
                              <div className="flex flex-wrap gap-3">
                                {Array.from({ length: pe.sets }).map((_, i) => (
                                  <div key={i} className="flex items-center gap-1">
                                    <Label className="text-xs">Sett {i + 1}</Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={overTidReps[pe.exerciseId]?.[i] ?? ""}
                                      onChange={(e) => {
                                        const v = Number(e.target.value) || 0;
                                        setOverTidReps((prev) => ({
                                          ...prev,
                                          [pe.exerciseId]: { ...prev[pe.exerciseId], [i]: v },
                                        }));
                                      }}
                                      className="w-16"
                                      placeholder="Reps"
                                    />
                                  </div>
                                ))}
                              </div>
                              {pe.suggestedReps && (
                                <p className="text-xs text-muted-foreground mt-1">Forslag: {pe.suggestedReps} reps</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            <Button onClick={saveSession} variant="hero">
              Lagre økt
            </Button>
          </CardContent>
        </Card>

        {/* Siste økter (kort oversikt) */}
        {sessions.length > 0 && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Siste økter</CardTitle>
              <CardDescription>Økter du har logget</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {sessions.slice(0, 5).map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{s.startedAt}</span>
                    <span className="text-muted-foreground">–</span>
                    <span>{s.exercises.length} øvelser</span>
                    {s.mode === "program" && <span className="text-muted-foreground">(program)</span>}
                    {s.mode === "over_tid" && <span className="text-muted-foreground">(plan)</span>}
                  </li>
                ))}
              </ul>
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

export default Trening;

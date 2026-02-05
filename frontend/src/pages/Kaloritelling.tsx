import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Flame,
  ChevronLeft,
  Plus,
  Trash2,
  Clock,
  Droplets,
  Scale,
  Footprints,
  BookOpen,
  Search,
  Barcode,
  ImagePlus,
  HelpCircle,
  BarChart3,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { isNativeApp } from "@/lib/capacitor";
import Navbar from "@/components/Navbar";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

const CALORIE_GOAL = 2000;
const ACTIVITY_TYPES = [
  "Styrketrening",
  "Gåing",
  "Ski",
  "Langrenn",
  "Løpetur",
  "Sykkel",
  "Svømming",
  "Annet",
] as const;
type ActivityType = (typeof ACTIVITY_TYPES)[number];

const getApiUrl = () => (import.meta.env.DEV ? import.meta.env.VITE_API_URL || "" : "");

interface FoodProduct {
  id: string;
  name: string;
  barcode?: string | null;
  source?: string | null;
  brand?: string | null;
  image_url?: string | null;
  user_id?: string | null;
  kcal_per_100: number;
  protein_per_100: number;
  carbs_per_100: number;
  fat_per_100: number;
}

interface Recipe {
  id: string;
  name: string;
  description?: string;
  totals: { kcal: number; protein: number; carbs: number; fat: number };
}

interface MealEntry {
  id: string;
  type: "product" | "recipe";
  name: string;
  amount_gram?: number;
  portions?: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Meal {
  id: string;
  log_date: string;
  name: string | null;
  time_slot: string | null;
  entries: MealEntry[];
  totals: { kcal: number; protein: number; carbs: number; fat: number };
}

interface ActivityEntry {
  id: string;
  type: ActivityType;
  durationMinutes: number;
}

const Kaloritelling = () => {
  const { user, token } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [weight, setWeight] = useState("");
  const [weightSaving, setWeightSaving] = useState(false);
  const [steps, setSteps] = useState("");
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [burnedEstimate, setBurnedEstimate] = useState(0);

  const fetchWeight = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${getApiUrl()}/api/weight?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setWeight(d.weight_kg != null ? String(d.weight_kg) : "");
      } else setWeight("");
    } catch {
      setWeight("");
    }
  }, [token, selectedDate]);

  const saveWeight = useCallback(async () => {
    const val = weight.trim();
    if (!token || !val) return;
    const num = parseFloat(val.replace(",", "."));
    if (Number.isNaN(num) || num <= 0 || num > 500) return;
    setWeightSaving(true);
    try {
      await fetch(`${getApiUrl()}/api/weight`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: selectedDate, weight_kg: num }),
      });
    } finally {
      setWeightSaving(false);
    }
  }, [token, selectedDate, weight]);

  const fetchMeals = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/meals?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setMeals(await res.json());
      else setMeals([]);
    } catch {
      setMeals([]);
    } finally {
      setLoading(false);
    }
  }, [token, selectedDate]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  useEffect(() => {
    fetchWeight();
  }, [fetchWeight]);

  const dayTotals = meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.totals.kcal,
      protein: acc.protein + m.totals.protein,
      carbs: acc.carbs + m.totals.carbs,
      fat: acc.fat + m.totals.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const remaining = Math.max(0, CALORIE_GOAL - dayTotals.kcal + burnedEstimate);

  const handleDeleteMeal = async (mealId: string) => {
    if (!token) return;
    try {
      await fetch(`${getApiUrl()}/api/meals/${mealId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchMeals();
    } catch {}
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Du må logge inn for å bruke Kaloritelling.</p>
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
              <Flame className="h-8 w-8 text-orange-500" />
              Ernæring
            </h1>
            <p className="text-muted-foreground">
              {format(new Date(selectedDate), "d. MMMM yyyy", { locale: nb })}
            </p>
          </div>
        </div>

        <div className="flex gap-2 items-center mb-6">
          <Label className="text-sm text-muted-foreground">Dato</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
        </div>

        {/* Oppsummering */}
        <Card className="mb-8 border-border relative">
          <CardHeader className="pr-12">
            <div className="absolute top-4 right-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
                    <HelpCircle className="h-5 w-5" aria-label="Info" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 sm:w-80" align="end">
                  <p className="text-sm mb-2">
                    Vekten lagres dag for dag. Hver dag du registrerer vekt, lagres den – også i går og alle andre dager du har logget.
                  </p>
                  <p className="text-sm mb-3">
                    Du kan se historikk og vektgraf under Analyse.
                  </p>
                  <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                    <Link to="/dashboard/analyse">
                      <BarChart3 className="h-4 w-4" />
                      Åpne Analyse
                    </Link>
                  </Button>
                </PopoverContent>
              </Popover>
            </div>
            <CardTitle>Oppsummering</CardTitle>
            <CardDescription>Dagens tall</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">Spist</p>
                <p className="font-display text-2xl font-bold text-gold">{Math.round(dayTotals.kcal)}</p>
                <p className="text-xs text-muted-foreground">kcal</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">Gjenstående</p>
                <p className="font-display text-2xl font-bold text-gold">{remaining}</p>
                <p className="text-xs text-muted-foreground">kcal</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">Forbrent</p>
                <p className="font-display text-2xl font-bold text-gold">{burnedEstimate}</p>
                <p className="text-xs text-muted-foreground">kcal</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4">
              <div>
                <p className="text-sm text-muted-foreground">Karbohydrater</p>
                <p className="font-display text-xl font-bold">{Math.round(dayTotals.carbs)} g</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Protein</p>
                <p className="font-display text-xl font-bold">{Math.round(dayTotals.protein)} g</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fett</p>
                <p className="font-display text-xl font-bold">{Math.round(dayTotals.fat)} g</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Måltider – én liste, valgfri tid og navn */}
        <Card className="mb-8 border-border">
          <CardHeader>
            <CardTitle>Måltider</CardTitle>
            <CardDescription>
              Et måltid er en samling ingredienser. Legg til oppskrifter eller produkter fra matdatabasen – alt beregnes automatisk.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <p className="text-muted-foreground">Laster…</p>
            ) : (
              <>
                {meals.map((meal) => (
                  <div
                    key={meal.id}
                    className="rounded-lg border border-border bg-card p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {meal.time_slot && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {meal.time_slot}
                          </span>
                        )}
                        <span className="font-medium">
                          {meal.name || "Måltid"}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteMeal(meal.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {meal.entries.map((e) => (
                        <li key={e.id}>
                          {e.name}
                          {e.amount_gram != null && ` – ${e.amount_gram} g`}
                          {e.portions != null && e.portions !== 1 && ` – ${e.portions} porsjoner`}
                          {" "}
                          <span className="text-foreground">{Math.round(e.kcal)} kcal</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm font-medium pt-1 border-t border-border">
                      Totalt: {Math.round(meal.totals.kcal)} kcal · P {Math.round(meal.totals.protein)} g · K {Math.round(meal.totals.carbs)} g · F {Math.round(meal.totals.fat)} g
                    </p>
                  </div>
                ))}
                <AddMealForm
                  logDate={selectedDate}
                  token={token}
                  onSaved={fetchMeals}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Vanntracker */}
        <Card className="mb-8 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              Vanntracker
            </CardTitle>
            <CardDescription>Antall glass (ca. 2,5 dl) i dag</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setWaterGlasses((g) => Math.max(0, g - 1))}>−</Button>
              <span className="font-display text-2xl font-bold w-12 text-center">{waterGlasses}</span>
              <Button variant="outline" size="icon" onClick={() => setWaterGlasses((g) => g + 1)}>+</Button>
            </div>
            <p className="text-sm text-muted-foreground">glass</p>
          </CardContent>
        </Card>

        {/* Vekt – lagres per valgt dag */}
        <Card className="mb-8 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-gold" />
              Vekt
            </CardTitle>
            <CardDescription>Registrer vekt for valgt dag. Lagres dag for dag.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              step="0.1"
              min={1}
              max={500}
              placeholder="kg"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-32"
            />
            <Button type="button" variant="outline" size="sm" onClick={saveWeight} disabled={weightSaving || !weight.trim()}>
              {weightSaving ? "Lagrer…" : "Lagre vekt"}
            </Button>
          </CardContent>
        </Card>

        {/* Aktiviteter – skritt fra integrasjoner */}
        <Card className="mb-8 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Footprints className="h-5 w-5 text-gold" />
              Aktiviteter
            </CardTitle>
            <CardDescription>Skritt hentes automatisk fra tilkoblede tjenester</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Koble til Apple Health, Polar, Garmin eller andre kilder under Integrasjoner – da fylles skritt og aktiviteter inn automatisk for estimat forbrent.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/integrations">Åpne Integrasjoner</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Kaloritelling;

function AddMealForm({
  logDate,
  token,
  onSaved,
}: {
  logDate: string;
  token: string | null;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [foodProducts, setFoodProducts] = useState<FoodProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingProduct, setPendingProduct] = useState<{ product: FoodProduct; grams: string } | null>(null);
  const [pendingRecipe, setPendingRecipe] = useState<{ recipe: Recipe; portions: string } | null>(null);
  const [entriesProduct, setEntriesProduct] = useState<{ product: FoodProduct; grams: number }[]>([]);
  const [entriesRecipe, setEntriesRecipe] = useState<{ recipe: Recipe; portions: number }[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeNotFound, setBarcodeNotFound] = useState(false);
  const [showCustomFoodForm, setShowCustomFoodForm] = useState(false);
  const [customFood, setCustomFood] = useState({
    name: "",
    barcode: "",
    brand: "",
    kcal_per_100: 0,
    protein_per_100: 0,
    carbs_per_100: 0,
    fat_per_100: 0,
  });

  useEffect(() => {
    if (!open || !token) return;
    fetch(`${getApiUrl()}/api/recipes`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : [])
      .then(setRecipes)
      .catch(() => setRecipes([]));
    fetch(`${getApiUrl()}/api/food-products`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : [])
      .then(setFoodProducts)
      .catch(() => setFoodProducts([]));
  }, [open, token]);

  const searchProducts = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${getApiUrl()}/api/food-products?q=${encodeURIComponent(searchQuery)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setFoodProducts(await res.json());
  }, [token, searchQuery]);

  const searchByBarcode = useCallback(async () => {
    const code = barcodeInput.trim();
    if (!token || !code) return;
    setBarcodeNotFound(false);
    setBarcodeLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/food/by-barcode?barcode=${encodeURIComponent(code)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const product: FoodProduct = await res.json();
        setPendingProduct({ product, grams: "100" });
        setBarcodeInput("");
      } else {
        setBarcodeNotFound(true);
      }
    } catch {
      setBarcodeNotFound(true);
    } finally {
      setBarcodeLoading(false);
    }
  }, [token, barcodeInput]);

  const handleAddCustomFood = useCallback(async () => {
    if (!token || !customFood.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${getApiUrl()}/api/food`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: customFood.name.trim(),
          barcode: customFood.barcode.trim() || null,
          brand: customFood.brand.trim() || null,
          kcal_per_100: Number(customFood.kcal_per_100) || 0,
          protein_per_100: Number(customFood.protein_per_100) || 0,
          carbs_per_100: Number(customFood.carbs_per_100) || 0,
          fat_per_100: Number(customFood.fat_per_100) || 0,
        }),
      });
      if (!res.ok) throw new Error("Kunne ikke lagre");
      const product: FoodProduct = await res.json();
      setEntriesProduct((prev) => [...prev, { product, grams: 100 }]);
      setShowCustomFoodForm(false);
      setCustomFood({ name: "", barcode: "", brand: "", kcal_per_100: 0, protein_per_100: 0, carbs_per_100: 0, fat_per_100: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Feil");
    } finally {
      setSaving(false);
    }
  }, [token, customFood]);

  const handleSave = async () => {
    if (!token) return;
    const productEntries = entriesProduct.map((e) => ({ food_product_id: e.product.id, amount_gram: e.grams }));
    const recipeEntries = entriesRecipe.map((e) => ({ recipe_id: e.recipe.id, portions: e.portions }));
    if (productEntries.length === 0 && recipeEntries.length === 0) {
      setError("Legg til minst én oppskrift eller ett produkt.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${getApiUrl()}/api/meals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          log_date: logDate,
          name: name.trim() || null,
          time_slot: timeSlot.trim() || null,
          entries: [...productEntries, ...recipeEntries],
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Kunne ikke lagre");
      }
      setOpen(false);
      setName("");
      setTimeSlot("");
      setEntriesProduct([]);
      setEntriesRecipe([]);
      setPendingProduct(null);
      setPendingRecipe(null);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Feil ved lagring");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Legg til måltid
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-medium">Nytt måltid</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Avbryt</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Navn (valgfritt)</Label>
          <Input placeholder="F.eks. Lunsj" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Tid (valgfritt)</Label>
          <Input type="time" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} />
        </div>
      </div>

      {isNativeApp() && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Barcode className="h-4 w-4" />
            Søk med strekkode (EAN)
          </Label>
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Skriv eller skann strekkode"
              value={barcodeInput}
              onChange={(e) => { setBarcodeInput(e.target.value); setBarcodeNotFound(false); }}
              onKeyDown={(e) => e.key === "Enter" && searchByBarcode()}
              className="flex-1 min-w-[160px]"
            />
            <Button type="button" variant="outline" onClick={searchByBarcode} disabled={barcodeLoading || !barcodeInput.trim()}>
              {barcodeLoading ? "Søker…" : "Søk"}
            </Button>
          </div>
          {barcodeNotFound && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Produkt ikke funnet. Legg til manuelt under «Legg til eget produkt» nedenfor.
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Legg til oppskrift
        </Label>
        <div className="flex gap-2 flex-wrap">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm flex-1 min-w-[180px]"
            value={pendingRecipe?.recipe.id ?? ""}
            onChange={(e) => {
              const r = recipes.find((x) => x.id === e.target.value);
              setPendingRecipe(r ? { recipe: r, portions: "1" } : null);
            }}
          >
            <option value="">Velg oppskrift</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>{r.name} ({Math.round(r.totals.kcal)} kcal)</option>
            ))}
          </select>
          {pendingRecipe && (
            <>
              <Input
                type="number"
                step="0.5"
                min="0.1"
                placeholder="Porsjoner"
                value={pendingRecipe.portions}
                onChange={(e) => setPendingRecipe({ ...pendingRecipe, portions: e.target.value })}
                className="w-24"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setEntriesRecipe((prev) => [...prev, { recipe: pendingRecipe.recipe, portions: Number(pendingRecipe.portions) || 1 }]);
                  setPendingRecipe(null);
                }}
              >
                Legg til
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Legg til produkter fra matdatabasen
        </Label>
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Søk matvare"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchProducts()}
            className="flex-1 min-w-[140px]"
          />
          <Button type="button" variant="outline" size="sm" onClick={searchProducts}>Søk</Button>
        </div>
        <div className="flex gap-2 flex-wrap items-end">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm flex-1 min-w-[180px]"
            value={pendingProduct?.product.id ?? ""}
            onChange={(e) => {
              const p = foodProducts.find((x) => x.id === e.target.value);
              setPendingProduct(p ? { product: p, grams: "100" } : null);
            }}
          >
            <option value="">Velg produkt</option>
            {foodProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} – {p.kcal_per_100} kcal/100g
              </option>
            ))}
          </select>
          {pendingProduct && (
            <>
              {pendingProduct.product.image_url && (
                <img src={pendingProduct.product.image_url} alt="" className="h-12 w-12 rounded object-cover" />
              )}
              <Input
                type="number"
                min="1"
                placeholder="Gram"
                value={pendingProduct.grams}
                onChange={(e) => setPendingProduct({ ...pendingProduct, grams: e.target.value })}
                className="w-24"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setEntriesProduct((prev) => [...prev, { product: pendingProduct.product, grams: Number(pendingProduct.grams) || 0 }]);
                  setPendingProduct(null);
                }}
              >
                Legg til
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground"
          onClick={() => setShowCustomFoodForm((v) => !v)}
        >
          <ImagePlus className="h-4 w-4" />
          {showCustomFoodForm ? "Skjul eget produkt" : "Legg til eget produkt (manuelt)"}
        </Button>
        {showCustomFoodForm && (
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <Label>Navn *</Label>
            <Input
              placeholder="F.eks. Hjemmelaget smoothie"
              value={customFood.name}
              onChange={(e) => setCustomFood((c) => ({ ...c, name: e.target.value }))}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-muted-foreground">Strekkode (valgfritt)</Label>
                <Input
                  placeholder="EAN"
                  value={customFood.barcode}
                  onChange={(e) => setCustomFood((c) => ({ ...c, barcode: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-muted-foreground">Merke (valgfritt)</Label>
                <Input
                  placeholder="Merke"
                  value={customFood.brand}
                  onChange={(e) => setCustomFood((c) => ({ ...c, brand: e.target.value }))}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Næring per 100 g</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <Label className="text-xs">Kcal</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={customFood.kcal_per_100 || ""}
                  onChange={(e) => setCustomFood((c) => ({ ...c, kcal_per_100: Number(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label className="text-xs">Protein (g)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={customFood.protein_per_100 || ""}
                  onChange={(e) => setCustomFood((c) => ({ ...c, protein_per_100: Number(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label className="text-xs">Karboh. (g)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={customFood.carbs_per_100 || ""}
                  onChange={(e) => setCustomFood((c) => ({ ...c, carbs_per_100: Number(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label className="text-xs">Fett (g)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={customFood.fat_per_100 || ""}
                  onChange={(e) => setCustomFood((c) => ({ ...c, fat_per_100: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <Button type="button" size="sm" onClick={handleAddCustomFood} disabled={saving || !customFood.name.trim()}>
              {saving ? "Lagrer…" : "Lagre og legg til i måltid (100 g)"}
            </Button>
          </div>
        )}
      </div>

      {(entriesProduct.length > 0 || entriesRecipe.length > 0) && (
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Lagt til:</p>
          <ul className="space-y-0.5">
            {entriesRecipe.map((e, i) => (
              <li key={`r-${i}`}>{e.recipe.name} – {e.portions} porsj. ({Math.round(e.recipe.totals.kcal * e.portions)} kcal)</li>
            ))}
            {entriesProduct.map((e, i) => (
              <li key={`p-${i}`}>{e.product.name} – {e.grams} g ({Math.round((e.product.kcal_per_100 * e.grams) / 100)} kcal)</li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Plus className="h-4 w-4" />
          {saving ? "Lagrer…" : "Lagre måltid"}
        </Button>
      </div>
    </div>
  );
}

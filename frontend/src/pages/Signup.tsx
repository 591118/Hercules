import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe, StripeElements } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Dumbbell, CreditCard, Smartphone, Wallet } from "lucide-react";

const getApiUrl = () => (import.meta.env.DEV ? import.meta.env.VITE_API_URL || "" : "");

const PRIS_PER_MANED = 100;
const PRIS_HALV_MANED = 50;

function getFirstPaymentAmount(): number {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeftInMonth = daysInMonth - now.getDate();
  const currentMonthPrice = daysLeftInMonth <= 15 ? PRIS_HALV_MANED : PRIS_PER_MANED;
  return currentMonthPrice + PRIS_PER_MANED;
}

const stripePk = typeof import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY === "string"
  ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY.trim()
  : "";
const stripePromise = stripePk ? loadStripe(stripePk) : null;

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "16px",
      color: "#e4e4e7",
      "::placeholder": { color: "#71717a" },
    },
    invalid: {
      color: "#f87171",
    },
  },
};

type StripeContext = { stripe: Stripe | null; elements: StripeElements | null };

function SignupFormBody({ stripe, elements }: StripeContext) {
  const navigate = useNavigate();
  const { signup, user } = useAuth();
  const [navn, setNavn] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"kort" | "vipps" | "paypal">("kort");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const firstPayment = useMemo(getFirstPaymentAmount, []);

  if (user) {
    navigate("/", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== passwordConfirm) {
      setError("Passord og bekreft passord må være like.");
      return;
    }
    if (password.length < 6) {
      setError("Passord må være minst 6 tegn.");
      return;
    }
    if (!navn.trim()) {
      setError("Navn er påkrevd.");
      return;
    }

    const emailTrim = email.trim().toLowerCase();
    setLoading(true);

    try {
      let paymentMethodId: string | undefined;

      if (paymentMethod === "kort" && stripe && elements && stripePk) {
        const cardEl = elements.getElement(CardElement);
        if (!cardEl) {
          setError("Fyll inn kortdetaljer.");
          setLoading(false);
          return;
        }
        const { error: pmError, paymentMethod: pm } = await stripe.createPaymentMethod({
          type: "card",
          card: cardEl,
        });
        if (pmError) {
          setError(pmError.message || "Kortet ble avvist. Sjekk kortdetaljer.");
          setLoading(false);
          return;
        }
        if (pm?.id) paymentMethodId = pm.id;
      }

      if (stripePk && paymentMethod === "kort" && !paymentMethodId) {
        setError("Registrer kort for 1 uke gratis.");
        setLoading(false);
        return;
      }

      await signup(
        emailTrim,
        password,
        navn.trim(),
        paymentMethod === "kort" ? paymentMethodId : undefined,
        paymentMethod
      );
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registrering feilet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form id="signup-form" onSubmit={handleSubmit} className="space-y-4 text-zinc-100">
      <div className="space-y-2">
        <Label htmlFor="signup-navn" className="text-zinc-200">Navn</Label>
        <Input
          id="signup-navn"
          type="text"
          placeholder="Ditt fulle navn"
          value={navn}
          onChange={(e) => setNavn(e.target.value)}
          autoComplete="name"
          className="bg-zinc-700 border-zinc-600 text-zinc-100 placeholder:text-zinc-500"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email" className="text-zinc-200">E-post</Label>
        <Input
          id="signup-email"
          type="email"
          placeholder="din@epost.no"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="bg-zinc-700 border-zinc-600 text-zinc-100 placeholder:text-zinc-500"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password" className="text-zinc-200">Passord</Label>
        <Input
          id="signup-password"
          type="password"
          placeholder="Minst 6 tegn"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className="bg-zinc-700 border-zinc-600 text-zinc-100 placeholder:text-zinc-500"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password-confirm" className="text-zinc-200">Bekreft passord</Label>
        <Input
          id="signup-password-confirm"
          type="password"
          placeholder="Gjenta passord"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className="bg-zinc-700 border-zinc-600 text-zinc-100 placeholder:text-zinc-500"
        />
      </div>

      <div className="rounded-lg border border-zinc-600 bg-zinc-700/50 p-4 space-y-2">
        <p className="text-sm font-medium text-zinc-200">Kort, Vipps og PayPal aksepteres – betaling forut for tilgang</p>
        <ul className="text-sm text-zinc-400 space-y-1">
          <li>• 1 uke gratis prøveperiode</li>
          <li>• Etter uken: første betaling ({firstPayment} kr) – deretter 100 kr/mnd (50 kr hvis &lt;15 dager igjen)</li>
          <li>• Du kan si opp når som helst; tilgang så lenge du har betalt for perioden</li>
        </ul>
      </div>

      <div className="space-y-3">
        <Label className="text-zinc-200">Betalingsmetode</Label>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-zinc-200">
            <input
              type="radio"
              name="payment"
              checked={paymentMethod === "kort"}
              onChange={() => setPaymentMethod("kort")}
              className="rounded-full border-amber-400 text-amber-400 focus:ring-amber-400"
            />
            <CreditCard className="h-5 w-5 text-zinc-400" />
            <span>Kort</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-zinc-200">
            <input
              type="radio"
              name="payment"
              checked={paymentMethod === "vipps"}
              onChange={() => setPaymentMethod("vipps")}
              className="rounded-full border-amber-400 text-amber-400 focus:ring-amber-400"
            />
            <Smartphone className="h-5 w-5 text-zinc-400" />
            <span>Vipps</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-zinc-200">
            <input
              type="radio"
              name="payment"
              checked={paymentMethod === "paypal"}
              onChange={() => setPaymentMethod("paypal")}
              className="rounded-full border-amber-400 text-amber-400 focus:ring-amber-400"
            />
            <Wallet className="h-5 w-5 text-zinc-400" />
            <span>PayPal</span>
          </label>
        </div>
      </div>

      {paymentMethod === "kort" && stripePk && (
        <div className="space-y-2">
          <Label className="text-zinc-200">Kortdetaljer (Visa / Mastercard)</Label>
          <div className="rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2.5">
            <CardElement options={CARD_ELEMENT_OPTIONS} />
          </div>
          <p className="text-xs text-zinc-400">
            1 uke gratis. Etter prøveuken trekkes første betaling automatisk. Kortet lagres sikkert hos Stripe.
          </p>
        </div>
      )}

      {paymentMethod === "kort" && !stripePk && (
        <p className="text-sm text-amber-400">
          Kortbetaling er ikke konfigurert i dette miljøet. Velg Vipps eller PayPal, eller sett VITE_STRIPE_PUBLISHABLE_KEY.
        </p>
      )}

      {(paymentMethod === "vipps" || paymentMethod === "paypal") && (
        <p className="text-sm text-zinc-400">
          Ved Vipps/PayPal får du tilgang etter at betaling er bekreftet. Du kan si opp når som helst.
        </p>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button
        type="submit"
        className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold"
        disabled={loading}
      >
        {loading ? "Oppretter konto…" : "Start 1 uke gratis"}
      </Button>
    </form>
  );
}

function SignupFormWithStripe() {
  const stripe = useStripe();
  const elements = useElements();
  return <SignupFormBody stripe={stripe} elements={elements} />;
}

const Signup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (user) {
    navigate("/", { replace: true });
    return (
      <div style={{ minHeight: "100vh", background: "#27272a", color: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Redirecting…
      </div>
    );
  }

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    backgroundColor: "#27272a",
    color: "#fafafa",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "1.5rem",
  };
  const cardStyle: React.CSSProperties = {
    backgroundColor: "#3f3f46",
    border: "1px solid #52525b",
    borderRadius: "0.75rem",
    padding: "1.5rem",
    width: "100%",
    maxWidth: "32rem",
  };

  const content = (
    <div style={cardStyle}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>Opprett konto</h1>
        <p style={{ fontSize: "0.875rem", color: "#a1a1aa" }}>
          Fyll inn detaljer og registrer kort. Du får 1 uke gratis – deretter trekkes første betaling automatisk.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {stripePromise ? (
          <Elements stripe={stripePromise}>
            <SignupFormWithStripe />
          </Elements>
        ) : (
          <SignupFormBody stripe={null} elements={null} />
        )}
      </div>
    </div>
  );

  return (
    <div style={pageStyle}>
      <style>{`
        #signup-form input, #signup-form [data-slot="input"] { background: #3f3f46 !important; color: #fafafa !important; border: 1px solid #52525b !important; }
        #signup-form label { color: #e4e4e7 !important; }
        #signup-form button[type="submit"] { background: #f59e0b !important; color: #18181b !important; }
      `}</style>
      <div style={{ width: "100%", maxWidth: "32rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", color: "#fbbf24", textDecoration: "none", fontSize: "1.5rem", fontWeight: 700 }}>
          <Dumbbell size={40} />
          <span>HERCULES</span>
        </Link>
        {content}
        <p style={{ textAlign: "center", fontSize: "0.875rem", color: "#a1a1aa" }}>
          Har du konto?{" "}
          <Link to="/login" style={{ color: "#fbbf24", textDecoration: "underline" }}>
            Logg inn her
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;

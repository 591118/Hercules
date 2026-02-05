/**
 * Detecterer om appen kjører som native (iOS/Android) via Capacitor.
 * I mobilappen: kun innlogging – ingen registrering (bruker opprettes på web).
 * Capacitor injiseres av native shell; på web er window.Capacitor undefined.
 */
let _platform: string | null = null;

function getPlatform(): string {
  if (_platform !== null) return _platform;
  try {
    const w = typeof window !== "undefined" ? window : undefined;
    const cap = (w as unknown as { Capacitor?: { getPlatform: () => string } })?.Capacitor;
    _platform = cap?.getPlatform?.() ?? "web";
  } catch {
    _platform = "web";
  }
  return _platform;
}

export function isNativeApp(): boolean {
  const p = getPlatform();
  return p === "ios" || p === "android";
}

export function getCapacitorPlatform(): "ios" | "android" | "web" {
  const p = getPlatform();
  if (p === "ios" || p === "android") return p;
  return "web";
}

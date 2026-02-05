import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/index";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import KundeDashboard from "./pages/KundeDashboard";
import Kaloritelling from "./pages/Kaloritelling";
import Trening from "./pages/Trening";
import CoachSide from "./pages/CoachSide";
import CoachDetail from "./pages/CoachDetail";
import CoachDashboard from "./pages/CoachDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Analyse from "./pages/Analyse";
import Integrations from "./pages/Integrations";
import NotFound from "./pages/NotFound";
import { isNativeApp } from "@/lib/capacitor";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/signup" element={isNativeApp() ? <Navigate to="/" replace /> : <Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<KundeDashboard />} />
            <Route path="/dashboard/calories" element={<Kaloritelling />} />
            <Route path="/dashboard/analyse" element={<Analyse />} />
            <Route path="/dashboard/integrations" element={<Integrations />} />
            <Route path="/dashboard/workouts" element={<Trening />} />
            <Route path="/dashboard/coach-side" element={<CoachSide />} />
            <Route path="/dashboard/coach-side/coach/:coachId" element={<CoachDetail />} />
            <Route path="/dashboard/coach" element={<CoachDashboard />} />
            <Route path="/dashboard/admin" element={<AdminDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

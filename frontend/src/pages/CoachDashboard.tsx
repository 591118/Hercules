import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dumbbell, 
  Users, 
  Settings, 
  LogOut, 
  Calendar,
  ClipboardList,
  MessageSquare,
  TrendingUp,
  UserPlus,
  Award
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const CoachDashboard = () => {
  const { user } = useAuth();
  const canAccessCoach = user?.rolle === "admin" || user?.rolle === "kunde_og_coach";
  if (!user) return <Navigate to="/login" replace />;
  if (!canAccessCoach) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 group">
              <Dumbbell className="h-8 w-8 text-gold transition-transform group-hover:rotate-12" />
              <span className="font-display text-2xl font-bold text-gradient-gold">
                HERCULES
              </span>
              <span className="ml-2 px-2 py-1 bg-gold/20 text-gold text-xs font-semibold rounded">
                COACH
              </span>
            </Link>
            
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <MessageSquare className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 lg:py-12">
        {/* Welcome Section */}
        <div className="mb-10">
          <h1 className="font-display text-3xl lg:text-4xl font-bold mb-2">
            Coach <span className="text-gradient-gold">Portal</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your clients and training programs
          </p>
        </div>
        {/* Coach Options Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* My Clients */}
          <Card className="group cursor-pointer border-2 border-border hover:border-gold/50 transition-all duration-300 hover:shadow-gold bg-card/50 backdrop-blur">
            <CardHeader className="pb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="font-display text-xl group-hover:text-gold transition-colors">
                My Clients
              </CardTitle>
              <CardDescription>
                View and manage your assigned clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                24 active clients
              </div>
              <Button variant="hero" className="w-full">
                View Clients
              </Button>
            </CardContent>
          </Card>
          {/* Training Programs */}
          <Card className="group cursor-pointer border-2 border-border hover:border-gold/50 transition-all duration-300 hover:shadow-gold bg-card/50 backdrop-blur">
            <CardHeader className="pb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold to-bronze flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <ClipboardList className="h-7 w-7 text-primary-foreground" />
              </div>
              <CardTitle className="font-display text-xl group-hover:text-gold transition-colors">
                Training Programs
              </CardTitle>
              <CardDescription>
                Create and manage workout programs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <span className="w-2 h-2 rounded-full bg-gold" />
                12 active programs
              </div>
              <Button variant="hero" className="w-full">
                Manage Programs
              </Button>
            </CardContent>
          </Card>
          {/* Schedule */}
          <Card className="group cursor-pointer border-2 border-border hover:border-gold/50 transition-all duration-300 hover:shadow-gold bg-card/50 backdrop-blur">
            <CardHeader className="pb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Calendar className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="font-display text-xl group-hover:text-gold transition-colors">
                Schedule
              </CardTitle>
              <CardDescription>
                Manage your training sessions calendar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                8 sessions today
              </div>
              <Button variant="hero" className="w-full">
                View Schedule
              </Button>
            </CardContent>
          </Card>
          {/* Client Progress */}
          <Card className="group cursor-pointer border-2 border-border hover:border-gold/50 transition-all duration-300 hover:shadow-gold bg-card/50 backdrop-blur">
            <CardHeader className="pb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="font-display text-xl group-hover:text-gold transition-colors">
                Client Progress
              </CardTitle>
              <CardDescription>
                Track and analyze client performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="hero" className="w-full">
                View Progress
              </Button>
            </CardContent>
          </Card>
          {/* Messages */}
          <Card className="group cursor-pointer border-2 border-border hover:border-gold/50 transition-all duration-300 hover:shadow-gold bg-card/50 backdrop-blur">
            <CardHeader className="pb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <MessageSquare className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="font-display text-xl group-hover:text-gold transition-colors">
                Messages
              </CardTitle>
              <CardDescription>
                Communicate with your clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                5 unread messages
              </div>
              <Button variant="hero" className="w-full">
                Open Messages
              </Button>
            </CardContent>
          </Card>
          {/* New Client */}
          <Card className="group cursor-pointer border-2 border-border hover:border-gold/50 transition-all duration-300 hover:shadow-gold bg-card/50 backdrop-blur">
            <CardHeader className="pb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <UserPlus className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="font-display text-xl group-hover:text-gold transition-colors">
                Add Client
              </CardTitle>
              <CardDescription>
                Onboard a new client to your roster
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="hero" className="w-full">
                Add New Client
              </Button>
            </CardContent>
          </Card>
        </div>
        {/* Quick Stats */}
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card/30 border-border">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">Active Clients</p>
              <p className="font-display text-2xl font-bold text-gold">24</p>
              <p className="text-xs text-green-500">+3 this month</p>
            </CardContent>
          </Card>
          <Card className="bg-card/30 border-border">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">Sessions This Week</p>
              <p className="font-display text-2xl font-bold text-gold">32</p>
              <p className="text-xs text-muted-foreground">8 remaining</p>
            </CardContent>
          </Card>
          <Card className="bg-card/30 border-border">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">Client Retention</p>
              <p className="font-display text-2xl font-bold text-gold">94%</p>
              <p className="text-xs text-green-500">+2% vs last month</p>
            </CardContent>
          </Card>
          <Card className="bg-card/30 border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-gold" />
                <p className="text-muted-foreground text-sm">Rating</p>
              </div>
              <p className="font-display text-2xl font-bold text-gold">4.9</p>
              <p className="text-xs text-muted-foreground">from 127 reviews</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};
export default CoachDashboard;
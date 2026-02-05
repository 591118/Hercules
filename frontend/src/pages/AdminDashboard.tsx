import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dumbbell, 
  Users, 
  Settings, 
  LogOut, 
  BarChart3, 
  Shield, 
  UserCog,
  FileText,
  Bell,
  Database
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const AdminDashboard = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.rolle !== "admin") return <Navigate to="/dashboard" replace />;

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
              <span className="ml-2 px-2 py-1 bg-destructive/20 text-destructive text-xs font-semibold rounded">
                ADMIN
              </span>
            </Link>
            
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
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
            Admin <span className="text-gradient-gold">Control Center</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage users, coaches, and system settings
          </p>
        </div>
        {/* Admin Options Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* User Management */}
          <Card className="group cursor-pointer border-2 border-border hover:border-gold/50 transition-all duration-300 hover:shadow-gold bg-card/50 backdrop-blur">
            <CardHeader className="pb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="font-display text-xl group-hover:text-gold transition-colors">
                User Management
              </CardTitle>
              <CardDescription>
                View, edit, and manage all registered users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="hero" className="w-full">
                Manage Users
              </Button>
            </CardContent>
          </Card>
          {/* Coach Management */}
          <Card className="group cursor-pointer border-2 border-border hover:border-gold/50 transition-all duration-300 hover:shadow-gold bg-card/50 backdrop-blur">
            <CardHeader className="pb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold to-bronze flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <UserCog className="h-7 w-7 text-primary-foreground" />
              </div>
              <CardTitle className="font-display text-xl group-hover:text-gold transition-colors">
                Coach Management
              </CardTitle>
              <CardDescription>
                Approve, manage, and monitor coaches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="hero" className="w-full">
                Manage Coaches
              </Button>
            </CardContent>
          </Card>
          {/* Analytics */}
          <Card className="group cursor-pointer border-2 border-border hover:border-gold/50 transition-all duration-300 hover:shadow-gold bg-card/50 backdrop-blur">
            <CardHeader className="pb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="font-display text-xl group-hover:text-gold transition-colors">
                Analytics
              </CardTitle>
              <CardDescription>
                View platform statistics and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="hero" className="w-full">
                View Analytics
              </Button>
            </CardContent>
          </Card>
          {/* Content Management */}
          <Card className="group cursor-pointer border-2 border-border hover:border-gold/50 transition-all duration-300 hover:shadow-gold bg-card/50 backdrop-blur">
            <CardHeader className="pb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <FileText className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="font-display text-xl group-hover:text-gold transition-colors">
                Content Management
              </CardTitle>
              <CardDescription>
                Manage workouts, exercises, and programs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="hero" className="w-full">
                Manage Content
              </Button>
            </CardContent>
          </Card>
          {/* Security */}
          <Card className="group cursor-pointer border-2 border-border hover:border-gold/50 transition-all duration-300 hover:shadow-gold bg-card/50 backdrop-blur">
            <CardHeader className="pb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="font-display text-xl group-hover:text-gold transition-colors">
                Security
              </CardTitle>
              <CardDescription>
                Manage roles, permissions, and access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="hero" className="w-full">
                Security Settings
              </Button>
            </CardContent>
          </Card>
          {/* Database */}
          <Card className="group cursor-pointer border-2 border-border hover:border-gold/50 transition-all duration-300 hover:shadow-gold bg-card/50 backdrop-blur">
            <CardHeader className="pb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Database className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="font-display text-xl group-hover:text-gold transition-colors">
                System Settings
              </CardTitle>
              <CardDescription>
                Configure platform settings and integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="hero" className="w-full">
                System Config
              </Button>
            </CardContent>
          </Card>
        </div>
        {/* Quick Stats */}
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card/30 border-border">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">Total Users</p>
              <p className="font-display text-2xl font-bold text-gold">12,847</p>
              <p className="text-xs text-green-500">+12% this month</p>
            </CardContent>
          </Card>
          <Card className="bg-card/30 border-border">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">Active Coaches</p>
              <p className="font-display text-2xl font-bold text-gold">156</p>
              <p className="text-xs text-green-500">+8 pending</p>
            </CardContent>
          </Card>
          <Card className="bg-card/30 border-border">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">Monthly Revenue</p>
              <p className="font-display text-2xl font-bold text-gold">$48.2K</p>
              <p className="text-xs text-green-500">+23% vs last month</p>
            </CardContent>
          </Card>
          <Card className="bg-card/30 border-border">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">Active Sessions</p>
              <p className="font-display text-2xl font-bold text-gold">1,234</p>
              <p className="text-xs text-muted-foreground">right now</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};
export default AdminDashboard;
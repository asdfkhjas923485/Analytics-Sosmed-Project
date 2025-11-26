import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BarChart3, LogOut, User, Plus, Bell } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Badge } from "@/components/ui/badge";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { 
    profile, 
    projects, 
    selectedProject, 
    setSelectedProject, 
    datasets, 
    activeDataset,
    setActiveDataset 
  } = useApp();
  
  const [unreadAnswersCount, setUnreadAnswersCount] = useState(0);

  // Fetch unread answered questions count
  useEffect(() => {
    if (!user || profile?.peran === "admin") return;

    const fetchUnreadCount = async () => {
      try {
        // Get all answered questions for this user
        const { data: answeredQuestions, error } = await supabase
          .from("pertanyaan")
          .select("id, updated_at, rating")
          .eq("id_pengguna", user.id)
          .eq("status", "dijawab");

        if (error) throw error;

        // Get last viewed timestamp from localStorage
        const lastViewedKey = `bantuan_last_viewed_${user.id}`;
        const lastViewed = localStorage.getItem(lastViewedKey);
        const lastViewedDate = lastViewed ? new Date(lastViewed) : new Date(0);

        // Count questions answered after last view that don't have rating yet
        const unreadCount = answeredQuestions?.filter(q => 
          new Date(q.updated_at) > lastViewedDate && !q.rating
        ).length || 0;

        setUnreadAnswersCount(unreadCount);
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    };

    fetchUnreadCount();

    // Subscribe to changes
    const channel = supabase
      .channel("answered_questions_notif")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pertanyaan",
          filter: `id_pengguna=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.new.status === "dijawab" && payload.old.status === "menunggu") {
            fetchUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile]);

  // Update last viewed when user visits Bantuan page
  useEffect(() => {
    if (location.pathname === "/bantuan" && user) {
      const lastViewedKey = `bantuan_last_viewed_${user.id}`;
      localStorage.setItem(lastViewedKey, new Date().toISOString());
      setUnreadAnswersCount(0);
    }
  }, [location.pathname, user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleCreateProject = () => {
    navigate("/projects/new");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">Analytics Sosmed</span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <NavLink to="/import" className="px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors" activeClassName="bg-muted">
                Import
              </NavLink>
              <NavLink to="/dashboard" className="px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors" activeClassName="bg-muted">
                Dashboard
              </NavLink>
              <NavLink to="/performa" className="px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors" activeClassName="bg-muted">
                Performa
              </NavLink>
              <NavLink to="/waktu-terbaik" className="px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors" activeClassName="bg-muted">
                Waktu Terbaik
              </NavLink>
              <NavLink to="/audiens" className="px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors" activeClassName="bg-muted">
                Audiens
              </NavLink>
              <NavLink to="/target-kpi" className="px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors" activeClassName="bg-muted">
                Target KPI
              </NavLink>
              <NavLink to="/kampanye" className="px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors" activeClassName="bg-muted">
                Kampanye
              </NavLink>
              <NavLink to="/caption-generator" className="px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors" activeClassName="bg-muted">
                AI Caption
              </NavLink>
              <NavLink to="/laporan" className="px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors" activeClassName="bg-muted">
                Laporan
              </NavLink>
              <NavLink to="/perbandingan" className="px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors" activeClassName="bg-muted">
                Perbandingan
              </NavLink>
              <NavLink to="/ringkasan-insight" className="px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors" activeClassName="bg-muted">
                Ringkasan Insight
              </NavLink>
              {profile?.peran !== "admin" && (
                <NavLink to="/bantuan" className="px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors relative" activeClassName="bg-muted">
                  <span className="flex items-center gap-2">
                    Bantuan
                    {unreadAnswersCount > 0 && (
                      <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center text-xs px-1">
                        {unreadAnswersCount}
                      </Badge>
                    )}
                  </span>
                </NavLink>
              )}
              {profile?.peran === "admin" && (
                <>
                  <NavLink to="/platform" className="px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors" activeClassName="bg-muted">
                    Platform
                  </NavLink>
                  <NavLink to="/bantuan-admin" className="px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors" activeClassName="bg-muted">
                    Kelola Q&A
                  </NavLink>
                </>
              )}
            </nav>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {profile?.nama_lengkap || user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Project & Dataset Selectors */}
          {user && (
            <div className="flex items-center space-x-4 py-3 border-t border-border">
              {/* Project Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-foreground">Project:</span>
                <Select
                  value={selectedProject?.id || ""}
                  onValueChange={(value) => {
                    const project = projects.find(p => p.id === value);
                    setSelectedProject(project || null);
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Pilih Project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.nama_proyek}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCreateProject}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Dataset Selector */}
              {selectedProject && datasets.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-foreground">Dataset:</span>
                  <Select
                    value={activeDataset?.id || ""}
                    onValueChange={setActiveDataset}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Pilih Dataset" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasets.map((dataset) => (
                        <SelectItem key={dataset.id} value={dataset.id}>
                          {dataset.nama_dataset}
                          {dataset.dataset_aktif && " (Aktif)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;

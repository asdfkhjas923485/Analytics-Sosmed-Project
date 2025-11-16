import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  description: string | null;
}

interface Dataset {
  id: string;
  name: string;
  source_type: string;
  is_active: boolean;
  row_count: number;
  created_at: string;
}

interface Profile {
  id: string;
  role: 'admin' | 'user';
  full_name: string | null;
}

interface AppContextType {
  profile: Profile | null;
  projects: Project[];
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  datasets: Dataset[];
  activeDataset: Dataset | null;
  setActiveDataset: (datasetId: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
  refreshDatasets: () => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeDataset, setActiveDatasetState] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile
  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
        } else {
          setProfile(data);
        }
      };

      fetchProfile();
    } else {
      setProfile(null);
    }
  }, [user]);

  // Fetch projects
  const refreshProjects = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching projects:", error);
      toast.error("Gagal memuat projects");
    } else {
      setProjects(data || []);
      
      // Auto-select first project if none selected
      if (data && data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]);
      }
    }
  };

  // Fetch datasets for selected project
  const refreshDatasets = async () => {
    if (!selectedProject) {
      setDatasets([]);
      setActiveDatasetState(null);
      return;
    }

    const { data, error } = await supabase
      .from("datasets")
      .select("*")
      .eq("project_id", selectedProject.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching datasets:", error);
      toast.error("Gagal memuat datasets");
    } else {
      setDatasets(data || []);
      
      // Find active dataset
      const active = data?.find(d => d.is_active);
      setActiveDatasetState(active || null);
    }
  };

  // Set active dataset
  const setActiveDataset = async (datasetId: string) => {
    if (!selectedProject) return;

    // First, deactivate all datasets for this project
    const { error: deactivateError } = await supabase
      .from("datasets")
      .update({ is_active: false })
      .eq("project_id", selectedProject.id);

    if (deactivateError) {
      toast.error("Gagal mengubah dataset aktif");
      return;
    }

    // Then activate the selected dataset
    const { error: activateError } = await supabase
      .from("datasets")
      .update({ is_active: true })
      .eq("id", datasetId);

    if (activateError) {
      toast.error("Gagal mengubah dataset aktif");
    } else {
      toast.success("Dataset aktif berhasil diubah");
      await refreshDatasets();
    }
  };

  // Load projects on user login
  useEffect(() => {
    if (user) {
      refreshProjects().finally(() => setLoading(false));
    } else {
      setProjects([]);
      setSelectedProject(null);
      setDatasets([]);
      setActiveDatasetState(null);
      setLoading(false);
    }
  }, [user]);

  // Load datasets when project changes
  useEffect(() => {
    if (selectedProject) {
      refreshDatasets();
    }
  }, [selectedProject]);

  return (
    <AppContext.Provider
      value={{
        profile,
        projects,
        selectedProject,
        setSelectedProject,
        datasets,
        activeDataset,
        setActiveDataset,
        refreshProjects,
        refreshDatasets,
        loading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

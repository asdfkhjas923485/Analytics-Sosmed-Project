import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";

const Platform = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Platform Management</h1>
        <p className="text-muted-foreground">Admin only - Feature in development</p>
      </div>
    </AppLayout>
  );
};

export default Platform;

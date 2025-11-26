import { useLocation, useNavigate } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

interface BreadcrumbConfig {
  label: string;
  path?: string;
  parent?: string;
}

const breadcrumbMap: Record<string, BreadcrumbConfig> = {
  "/": { label: "Home" },
  "/import": { label: "Import" },
  "/dashboard": { label: "Dashboard" },
  "/performa": { label: "Performa", parent: "Analitik" },
  "/waktu-terbaik": { label: "Waktu Terbaik", parent: "Analitik" },
  "/audiens": { label: "Audiens", parent: "Analitik" },
  "/ringkasan-insight": { label: "Ringkasan Insight", parent: "Analitik" },
  "/target-kpi": { label: "Target KPI", parent: "Perencanaan" },
  "/kampanye": { label: "Kampanye", parent: "Perencanaan" },
  "/caption-generator": { label: "AI Caption", parent: "Tools" },
  "/kompetitor-analysis": { label: "Kompetitor", parent: "Tools" },
  "/laporan": { label: "Laporan", parent: "Laporan" },
  "/perbandingan": { label: "Perbandingan", parent: "Laporan" },
  "/bantuan": { label: "Bantuan" },
  "/platform": { label: "Platform", parent: "Admin" },
  "/bantuan-admin": { label: "Kelola Q&A", parent: "Admin" },
  "/projects/new": { label: "Buat Project Baru" },
};

export const Breadcrumbs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const currentPath = location.pathname;
  const config = breadcrumbMap[currentPath];

  if (!config) return null;

  const breadcrumbs = [
    { label: "Home", path: "/dashboard", isHome: true }
  ];

  if (config.parent) {
    breadcrumbs.push({ label: config.parent, path: undefined, isHome: false });
  }

  if (currentPath !== "/dashboard") {
    breadcrumbs.push({ label: config.label, path: currentPath, isHome: false });
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.label} className="flex items-center">
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {index === breadcrumbs.length - 1 ? (
                <BreadcrumbPage className="flex items-center gap-1.5">
                  {crumb.isHome && <Home className="h-4 w-4" />}
                  {crumb.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  onClick={() => crumb.path && navigate(crumb.path)}
                  className={`flex items-center gap-1.5 ${crumb.path ? 'cursor-pointer hover:text-foreground' : 'cursor-default'}`}
                >
                  {crumb.isHome && <Home className="h-4 w-4" />}
                  {crumb.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

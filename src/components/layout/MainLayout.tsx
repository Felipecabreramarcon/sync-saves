import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TitleBar from "./TitleBar";
import { ReactNode } from "react";
import { useUIStore } from "@/stores/uiStore";

interface MainLayoutProps {
  children?: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const isSidebarCollapsed = useUIStore((state) => state.isSidebarCollapsed);

  return (
    <div className="min-h-screen bg-bg-primary font-sans text-content-primary">
      <TitleBar />
      <Sidebar />
      <main
        className={`
                    min-h-screen pt-8 pb-16 md:pb-0 ml-0 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]
                    ${isSidebarCollapsed ? "md:ml-18" : "md:ml-60"}
                `}
      >
        {children || <Outlet />}
      </main>
    </div>
  );
}

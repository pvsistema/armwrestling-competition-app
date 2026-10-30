import { createRoot } from "react-dom/client";
import "@fontsource/onest/400.css";
import "@fontsource/onest/500.css";
import "@fontsource/onest/600.css";
import "@fontsource/onest/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@/index.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import HomeEntry from "@/components/HomeEntry";

createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <HomeEntry />
  </TooltipProvider>,
);

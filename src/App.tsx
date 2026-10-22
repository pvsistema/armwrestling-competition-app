
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Board from "./pages/Board";
import NotFound from "./pages/NotFound";
import ObsOverlay from "./pages/ObsOverlay";
import Admin from "./pages/Admin";
import Cabinet from "./pages/Cabinet";

const queryClient = new QueryClient();
const isBoard = new URLSearchParams(window.location.search).has("board");
const isObs = new URLSearchParams(window.location.search).has("overlay");

const App = () => isObs ? <ObsOverlay /> : (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={isBoard ? <Board /> : <Index />} />
          <Route path="/index.html" element={isBoard ? <Board /> : <Index />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/cabinet" element={<Cabinet />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import FoodTrucks from "./pages/FoodTrucks.tsx";
import TruckProfile from "./pages/TruckProfile.tsx";
import Book from "./pages/Book.tsx";
import Auth from "./pages/Auth.tsx";
import OwnerLayout from "./pages/owner/OwnerLayout.tsx";
import OwnerHome from "./pages/owner/OwnerHome.tsx";
import ComingSoon from "./pages/owner/ComingSoon.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/food-trucks" element={<FoodTrucks />} />
            <Route path="/food-trucks/:slug" element={<TruckProfile />} />
            <Route path="/book/:truckSlug" element={<Book />} />
            <Route path="/auth" element={<Auth />} />
            {/* Legacy alias kept for any existing links */}
            <Route path="/smoke-trail-bbq" element={<Navigate to="/food-trucks/smoke-trail-bbq" replace />} />

            <Route path="/owner" element={<OwnerLayout />}>
              <Route index element={<OwnerHome />} />
              <Route path="profile" element={<ComingSoon title="Business Profile" />} />
              <Route path="menu" element={<ComingSoon title="Menu" />} />
              <Route path="calendar" element={<ComingSoon title="Calendar" />} />
              <Route path="leads" element={<ComingSoon title="Leads" />} />
              <Route path="messages" element={<ComingSoon title="Messages" />} />
            </Route>

            <Route path="/admin" element={<ComingSoon title="Admin Console" />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

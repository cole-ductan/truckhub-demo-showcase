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
import OwnerHome from "./pages/owner/OwnerHome.tsx";
import OwnerLayout from "./pages/owner/OwnerLayout.tsx";
import AdminLayout from "./pages/admin/AdminLayout.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminBusinesses from "./pages/admin/AdminBusinesses.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminCategories from "./pages/admin/AdminCategories.tsx";
import AdminLeads from "./pages/admin/AdminLeads.tsx";
import OwnerProfile from "./pages/owner/OwnerProfile.tsx";
import OwnerMenu from "./pages/owner/OwnerMenu.tsx";
import OwnerCalendar from "./pages/owner/OwnerCalendar.tsx";
import OwnerLeads from "./pages/owner/OwnerLeads.tsx";
import OwnerMessages from "./pages/owner/OwnerMessages.tsx";
import OwnerBookings from "./pages/owner/OwnerBookings.tsx";
import OwnerSettings from "./pages/owner/OwnerSettings.tsx";

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
              <Route path="profile" element={<OwnerProfile />} />
              <Route path="menu" element={<OwnerMenu />} />
              <Route path="calendar" element={<OwnerCalendar />} />
              <Route path="leads" element={<OwnerLeads />} />
              <Route path="messages" element={<OwnerMessages />} />
              <Route path="bookings" element={<OwnerBookings />} />
              <Route path="settings" element={<OwnerSettings />} />
            </Route>

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="businesses" element={<AdminBusinesses />} />
              <Route path="leads" element={<AdminLeads />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="categories" element={<AdminCategories />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

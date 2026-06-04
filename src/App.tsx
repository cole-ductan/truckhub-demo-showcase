import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import CustomerHome from "./pages/SmokeTrail.tsx";
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
import AdminBusinessEdit from "./pages/admin/AdminBusinessEdit.tsx";
import AdminImportBusinesses from "./pages/admin/AdminImportBusinesses.tsx";
import AdminListingReview from "./pages/admin/AdminListingReview.tsx";
import AdminClaimRequests from "./pages/admin/AdminClaimRequests.tsx";
import AdminOutreach from "./pages/admin/AdminOutreach.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminCategories from "./pages/admin/AdminCategories.tsx";
import AdminLeads from "./pages/admin/AdminLeads.tsx";
import AdminDemoTools from "./pages/admin/AdminDemoTools.tsx";
import OwnerProfile from "./pages/owner/OwnerProfile.tsx";
import OwnerMenu from "./pages/owner/OwnerMenu.tsx";
import OwnerCalendar from "./pages/owner/OwnerCalendar.tsx";
import OwnerMapLocations from "./pages/owner/OwnerMapLocations.tsx";
import OwnerLeads from "./pages/owner/OwnerLeads.tsx";
import OwnerMessages from "./pages/owner/OwnerMessages.tsx";
import OwnerBookings from "./pages/owner/OwnerBookings.tsx";
import OwnerSettings from "./pages/owner/OwnerSettings.tsx";
import OwnerClaims from "./pages/owner/OwnerClaims.tsx";
import ClaimListing from "./pages/ClaimListing.tsx";
import { PaymentSuccess, PaymentCancel } from "./pages/PaymentResult.tsx";
import { DemoTourProvider } from "@/components/demo/useDemoTour";
import { GuidedTour } from "@/components/demo/GuidedTour";
import { DemoLauncher } from "@/components/demo/DemoLauncher";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DemoTourProvider>
            <Routes>
            <Route path="/" element={<CustomerHome />} />
            <Route path="/for-vendors" element={<Index />} />
            <Route path="/explore" element={<Navigate to="/food-trucks" replace />} />
            <Route path="/markets" element={<Navigate to="/food-trucks" replace />} />
            <Route path="/events" element={<Navigate to="/food-trucks" replace />} />
            <Route path="/vendors" element={<Navigate to="/food-trucks" replace />} />
            <Route path="/food-trucks" element={<FoodTrucks />} />
            <Route path="/food-trucks/:slug" element={<TruckProfile />} />
            <Route path="/category/:categorySlug" element={<FoodTrucks />} />
            <Route path="/specialty/:specialtySlug" element={<FoodTrucks />} />
            <Route path="/book/:truckSlug" element={<Book />} />
            <Route path="/claim/:businessSlug" element={<ClaimListing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/owner/login" element={<Navigate to="/auth" replace />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />
            <Route path="/smoke-trail-bbq" element={<Navigate to="/food-trucks/smoke-trail-bbq" replace />} />

            <Route path="/owner" element={<OwnerLayout />}>
              <Route index element={<OwnerHome />} />
              <Route path="profile" element={<OwnerProfile />} />
              <Route path="menu" element={<OwnerMenu />} />
              <Route path="calendar" element={<OwnerCalendar />} />
              <Route path="map" element={<OwnerMapLocations />} />
              <Route path="leads" element={<OwnerLeads />} />
              <Route path="messages" element={<OwnerMessages />} />
              <Route path="bookings" element={<OwnerBookings />} />
              <Route path="settings" element={<OwnerSettings />} />
              <Route path="claims" element={<OwnerClaims />} />
            </Route>

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="businesses" element={<AdminBusinesses />} />
              <Route path="businesses/:id/edit" element={<AdminBusinessEdit />} />
              <Route path="import-businesses" element={<AdminImportBusinesses />} />
              <Route path="listing-review" element={<AdminListingReview />} />
              <Route path="claim-requests" element={<AdminClaimRequests />} />
              <Route path="outreach" element={<AdminOutreach />} />
              <Route path="leads" element={<AdminLeads />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="demo-tools" element={<AdminDemoTools />} />
            </Route>

            <Route path="*" element={<NotFound />} />
            </Routes>
            <GuidedTour />
            <DemoLauncher />
          </DemoTourProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

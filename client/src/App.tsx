import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AdminDashboard from "@/pages/admin/Dashboard";
import GroundManage from "@/pages/admin/GroundManage";
import SlotManage from "@/pages/admin/SlotManage";
import Reports from "@/pages/admin/Reports";
import Profile from "@/pages/user/Profile";
import BookSlot from "@/pages/user/BookSlot";
import Bookings from "@/pages/user/Bookings";
import Payment from "@/pages/user/Payment";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* User routes */}
      <Route path="/profile" component={Profile} />
      <Route path="/book/:groundId" component={BookSlot} />
      <Route path="/bookings" component={Bookings} />
      <Route path="/payment/:bookingId" component={Payment} />
      
      {/* Admin routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/grounds" component={GroundManage} />
      <Route path="/admin/slots" component={SlotManage} />
      <Route path="/admin/reports" component={Reports} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Layout>
          <Toaster />
          <Router />
        </Layout>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

import { ReactNode, useEffect } from "react";
import Navbar from "./Navbar";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  // Check if user is logged in
  const { data: currentUser, error, isError } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
    refetchOnWindowFocus: true,
  });
  
  // Handle authentication for protected routes
  useEffect(() => {
    const adminRoutes = ["/admin", "/admin/grounds", "/admin/slots", "/admin/reports"];
    const userRoutes = ["/profile", "/bookings", "/payment"];
    const bookRouteRegex = /^\/book\/.+$/;
    const paymentRouteRegex = /^\/payment\/.+$/;
    
    // If trying to access admin routes without admin privileges
    if (adminRoutes.includes(location) && (!currentUser || !currentUser.isAdmin)) {
      toast({
        title: "Access Denied",
        description: "You need admin privileges to access this page",
        variant: "destructive",
      });
      navigate("/login");
    }
    
    // If trying to access user routes without being logged in
    if (
      userRoutes.some(route => location.startsWith(route)) ||
      bookRouteRegex.test(location) ||
      paymentRouteRegex.test(location)
    ) {
      if (!currentUser) {
        toast({
          title: "Authentication Required",
          description: "Please login to access this page",
          variant: "destructive",
        });
        navigate("/login");
      }
    }
    
    // Redirect logged in users away from login/register pages
    if ((location === "/login" || location === "/register") && currentUser) {
      navigate("/");
    }
  }, [location, currentUser, navigate, toast]);
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-muted py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Sports Ground Management System
        </div>
      </footer>
    </div>
  );
}

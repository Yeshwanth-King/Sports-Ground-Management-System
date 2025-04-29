import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, User, LogOut, LayoutDashboard, Calendar, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { User as UserType } from "@shared/schema";

export default function Navbar() {
  const [location, navigate] = useLocation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  // Get current user
  const { data: user } = useQuery<UserType | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });
  
  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      navigate("/");
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    },
  });
  
  const handleLogout = () => {
    logoutMutation.mutate();
    setOpen(false);
  };
  
  const NavItems = () => (
    <>
      <div className="flex items-center gap-6">
        <Link href="/">
          <Button variant="link" className={location === "/" ? "font-bold" : ""}>Home</Button>
        </Link>
        
        {user ? (
          <>
            <Link href="/bookings">
              <Button variant="link" className={location === "/bookings" ? "font-bold" : ""}>My Bookings</Button>
            </Link>
            <Link href="/profile">
              <Button variant="link" className={location === "/profile" ? "font-bold" : ""}>Profile</Button>
            </Link>
            
            {(user as UserType).isAdmin && (
              <Link href="/admin">
                <Button variant="link" className={location.startsWith("/admin") ? "font-bold text-primary" : ""}>
                  Admin Dashboard
                </Button>
              </Link>
            )}
            
            <Button variant="ghost" onClick={handleLogout} disabled={logoutMutation.isPending}>
              {logoutMutation.isPending ? "Logging out..." : "Logout"}
            </Button>
          </>
        ) : (
          <>
            <Link href="/login">
              <Button variant="link" className={location === "/login" ? "font-bold" : ""}>Login</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" className={location === "/register" ? "font-bold" : ""}>Register</Button>
            </Link>
          </>
        )}
      </div>
    </>
  );
  
  const MobileNavItems = () => (
    <div className="flex flex-col space-y-4 mt-4">
      <Link href="/" onClick={() => setOpen(false)}>
        <Button variant="ghost" className="w-full justify-start">Home</Button>
      </Link>
      
      {user ? (
        <>
          <Link href="/bookings" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full justify-start">
              <Calendar className="mr-2 h-4 w-4" />
              My Bookings
            </Button>
          </Link>
          <Link href="/profile" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full justify-start">
              <User className="mr-2 h-4 w-4" />
              Profile
            </Button>
          </Link>
          
          {(user as UserType).isAdmin && (
            <>
              <div className="h-px bg-border my-2" />
              <div className="font-medium px-4 text-sm text-muted-foreground">Admin</div>
              <Link href="/admin" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/admin/grounds" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Grounds
                </Button>
              </Link>
              <Link href="/admin/slots" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Slots
                </Button>
              </Link>
              <Link href="/admin/reports" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Reports
                </Button>
              </Link>
            </>
          )}
          
          <div className="h-px bg-border my-2" />
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </>
      ) : (
        <>
          <Link href="/login" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full justify-start">Login</Button>
          </Link>
          <Link href="/register" onClick={() => setOpen(false)}>
            <Button variant="default" className="w-full">Register</Button>
          </Link>
        </>
      )}
    </div>
  );
  
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container mx-auto px-4 flex h-16 items-center">
        <div className="flex flex-1 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 font-bold text-xl">
            <span>Sports Ground</span>
          </Link>
          
          {isMobile ? (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col h-full">
                  <div className="font-bold text-xl mb-6">Sports Ground</div>
                  <MobileNavItems />
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <NavItems />
          )}
        </div>
      </div>
    </header>
  );
}

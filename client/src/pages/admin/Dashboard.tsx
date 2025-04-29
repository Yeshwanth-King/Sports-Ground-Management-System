import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Booking, Ground, Payment, User } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  CreditCard, 
  Settings, 
  PlusCircle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2
} from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  
  // Fetch all required data
  const { data: grounds, isLoading: isLoadingGrounds } = useQuery<Ground[]>({
    queryKey: ["/api/grounds"],
  });
  
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });
  
  const { data: bookings, isLoading: isLoadingBookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });
  
  const { data: payments, isLoading: isLoadingPayments } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });
  
  const isLoading = isLoadingGrounds || isLoadingUsers || isLoadingBookings || isLoadingPayments;
  
  // Calculate overview statistics
  const totalGrounds = grounds?.length || 0;
  const totalUsers = users?.filter(u => !u.isAdmin).length || 0;
  const totalBookings = bookings?.length || 0;
  
  const confirmedBookings = bookings?.filter(b => b.status === "Confirmed").length || 0;
  const cancelledBookings = bookings?.filter(b => b.status === "Cancelled").length || 0;
  const completedBookings = bookings?.filter(b => b.status === "Completed").length || 0;
  
  const totalRevenue = payments?.reduce((sum, payment) => {
    return payment.paymentStatus === "Paid" ? sum + Number(payment.amount) : sum;
  }, 0) || 0;
  
  const pendingPayments = payments?.filter(p => p.paymentStatus === "Pending").length || 0;
  
  if (!user?.isAdmin) {
    return <div>Access denied. Admin privileges required.</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/admin/grounds">
            <Button>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Manage Grounds
            </Button>
          </Link>
          <Link href="/admin/slots">
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Manage Slots
            </Button>
          </Link>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Grounds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalGrounds}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Registered Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalUsers}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalBookings}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${totalRevenue.toFixed(2)}</div>
              </CardContent>
              <CardFooter className="pt-0">
                <p className="text-xs text-muted-foreground">
                  {pendingPayments} pending payments
                </p>
              </CardFooter>
            </Card>
          </div>
          
          <Tabs defaultValue="bookings">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="grounds">Grounds</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>
            
            <TabsContent value="bookings" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-yellow-500" />
                      Confirmed Bookings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{confirmedBookings}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Completed Bookings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{completedBookings}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <XCircle className="mr-2 h-4 w-4 text-red-500" />
                      Cancelled Bookings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{cancelledBookings}</div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="flex justify-end">
                <Link href="/admin/reports">
                  <Button variant="outline">View Detailed Reports</Button>
                </Link>
              </div>
            </TabsContent>
            
            <TabsContent value="grounds" className="space-y-4 mt-4">
              <div className="flex justify-end mb-4">
                <Link href="/admin/grounds">
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Ground
                  </Button>
                </Link>
              </div>
              
              {grounds && grounds.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {grounds.slice(0, 4).map((ground) => (
                    <Card key={ground.id}>
                      <CardHeader>
                        <CardTitle>{ground.name}</CardTitle>
                        <CardDescription>{ground.location}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p>Sport: {ground.sportType}</p>
                        <p>Rating: {ground.rating || "N/A"}</p>
                      </CardContent>
                      <CardFooter>
                        <Link href={`/admin/grounds?id=${ground.id}`}>
                          <Button variant="outline" size="sm">Manage</Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No grounds available. Add a ground to get started.</p>
                  </CardContent>
                </Card>
              )}
              
              {grounds && grounds.length > 4 && (
                <div className="flex justify-center mt-4">
                  <Link href="/admin/grounds">
                    <Button variant="outline">View All Grounds</Button>
                  </Link>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="users" className="space-y-4 mt-4">
              {users && users.filter(u => !u.isAdmin).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {users.filter(u => !u.isAdmin).slice(0, 4).map((user) => (
                    <Card key={user.id}>
                      <CardHeader>
                        <CardTitle>{user.firstName} {user.lastName}</CardTitle>
                        <CardDescription>{user.email}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p>Phone: {user.phoneNumber}</p>
                        <p>Address: {user.address}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No users have registered yet.</p>
                  </CardContent>
                </Card>
              )}
              
              {users && users.filter(u => !u.isAdmin).length > 4 && (
                <div className="flex justify-center mt-4">
                  <Button variant="outline">View All Users</Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

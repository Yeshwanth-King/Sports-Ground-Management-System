import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Ground, Booking, Payment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, DollarSign, BarChart3, PieChart, Calendar } from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Define types for revenue and occupancy report data
interface RevenueReport {
  groundName: string;
  totalRevenue: number;
}

interface OccupancyReport {
  groundName: string;
  occupancyRate: number;
}

export default function Reports() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [selectedGroundId, setSelectedGroundId] = useState<number | null>(null);
  
  // Fetch all grounds
  const { data: grounds, isLoading: isLoadingGrounds } = useQuery<Ground[]>({
    queryKey: ["/api/grounds"],
  });
  
  // Fetch all bookings for statistics
  const { data: bookings, isLoading: isLoadingBookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });
  
  // Fetch all payments for statistics
  const { data: payments, isLoading: isLoadingPayments } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });
  
  // Fetch revenue report for selected ground
  const { data: revenueReport, isLoading: isLoadingRevenue } = useQuery<RevenueReport>({
    queryKey: ["/api/reports/grounds", selectedGroundId, "revenue"],
    queryFn: async () => {
      if (!selectedGroundId) return null;
      const res = await fetch(`/api/reports/grounds/${selectedGroundId}/revenue`);
      if (!res.ok) throw new Error("Failed to fetch revenue report");
      return res.json();
    },
    enabled: !!selectedGroundId,
  });
  
  // Fetch occupancy report for selected ground
  const { data: occupancyReport, isLoading: isLoadingOccupancy } = useQuery<OccupancyReport>({
    queryKey: ["/api/reports/grounds", selectedGroundId, "occupancy"],
    queryFn: async () => {
      if (!selectedGroundId) return null;
      const res = await fetch(`/api/reports/grounds/${selectedGroundId}/occupancy`);
      if (!res.ok) throw new Error("Failed to fetch occupancy report");
      return res.json();
    },
    enabled: !!selectedGroundId,
  });
  
  // Calculate overall statistics
  const totalRevenue = payments?.reduce((sum, payment) => {
    return payment.paymentStatus === "Paid" ? sum + Number(payment.amount) : sum;
  }, 0) || 0;
  
  const bookingStatuses = bookings?.reduce((acc, booking) => {
    acc[booking.status] = (acc[booking.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
  
  const paymentStatuses = payments?.reduce((acc, payment) => {
    acc[payment.paymentStatus] = (acc[payment.paymentStatus] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
  
  const paymentMethods = payments?.reduce((acc, payment) => {
    acc[payment.paymentMethod] = (acc[payment.paymentMethod] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
  
  // Format data for charts
  const bookingStatusData = Object.entries(bookingStatuses).map(([name, value]) => ({ name, value }));
  const paymentStatusData = Object.entries(paymentStatuses).map(([name, value]) => ({ name, value }));
  const paymentMethodData = Object.entries(paymentMethods).map(([name, value]) => ({ name, value }));
  
  // Colors for pie charts
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];
  
  // Check if all data is loading
  const isLoading = isLoadingGrounds || isLoadingBookings || isLoadingPayments;
  
  if (!user?.isAdmin) {
    return <div>Access denied. Admin privileges required.</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <DollarSign className="mr-2 h-4 w-4 text-green-500" />
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${totalRevenue.toFixed(2)}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Calendar className="mr-2 h-4 w-4 text-blue-500" />
                  Total Bookings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{bookings?.length || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <BarChart3 className="mr-2 h-4 w-4 text-purple-500" />
                  Average Ground Occupancy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {grounds && grounds.length > 0 && selectedGroundId === null
                    ? "Select a ground"
                    : occupancyReport
                      ? `${occupancyReport.occupancyRate.toFixed(1)}%`
                      : "0%"
                  }
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Ground Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Ground-Specific Reports</CardTitle>
              <CardDescription>
                Select a ground to view detailed reports and statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <Select
                    value={selectedGroundId?.toString() || ""}
                    onValueChange={(value) => setSelectedGroundId(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a ground" />
                    </SelectTrigger>
                    <SelectContent>
                      {grounds && grounds.map((ground) => (
                        <SelectItem key={ground.id} value={ground.id.toString()}>
                          {ground.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="md:col-span-3">
                  {selectedGroundId ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {isLoadingRevenue ? (
                            <div className="flex justify-center py-6">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                          ) : (
                            <div className="text-3xl font-bold">
                              ${revenueReport?.totalRevenue.toFixed(2) || "0.00"}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {isLoadingOccupancy ? (
                            <div className="flex justify-center py-6">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                          ) : (
                            <div className="text-3xl font-bold">
                              {occupancyReport?.occupancyRate.toFixed(1) || "0"}%
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      Select a ground to view detailed reports
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Statistics Charts */}
          <Tabs defaultValue="bookings">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="bookings">Booking Statistics</TabsTrigger>
              <TabsTrigger value="payments">Payment Statistics</TabsTrigger>
              <TabsTrigger value="methods">Payment Methods</TabsTrigger>
            </TabsList>
            
            <TabsContent value="bookings" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Booking Status Distribution</CardTitle>
                  <CardDescription>
                    Distribution of bookings by status
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {bookingStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={bookingStatusData}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {bookingStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-full text-muted-foreground">
                      No booking data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="payments" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Status Distribution</CardTitle>
                  <CardDescription>
                    Distribution of payments by status
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {paymentStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={paymentStatusData}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {paymentStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-full text-muted-foreground">
                      No payment data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="methods" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods Used</CardTitle>
                  <CardDescription>
                    Distribution of payments by method
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {paymentMethodData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={paymentMethodData}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-full text-muted-foreground">
                      No payment method data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

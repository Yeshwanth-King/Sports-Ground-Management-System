import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Booking, Ground, Slot, Payment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Calendar, 
  Clock, 
  MapPin, 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  DollarSign 
} from "lucide-react";

// Helper type for joined booking data
type BookingWithDetails = Booking & {
  slot: Slot;
  ground: Ground;
  payment?: Payment;
};

export default function Bookings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  
  // Fetch user bookings
  const { data: bookings, isLoading: isLoadingBookings } = useQuery<Booking[]>({
    queryKey: ["/api/users", user?.id, "bookings"],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/users/${user.id}/bookings`);
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
    enabled: !!user?.id,
  });
  
  // Fetch all grounds (for joining with bookings)
  const { data: grounds, isLoading: isLoadingGrounds } = useQuery<Ground[]>({
    queryKey: ["/api/grounds"],
  });
  
  // Fetch all slots (for joining with bookings)
  const { data: slots, isLoading: isLoadingSlots } = useQuery<Slot[]>({
    queryKey: ["/api/slots"],
  });
  
  // Fetch payments for each booking
  const { data: paymentsMap, isLoading: isLoadingPayments } = useQuery<Record<number, Payment>>({
    queryKey: ["/api/users", user?.id, "payments"],
    queryFn: async () => {
      if (!bookings || bookings.length === 0) return {};
      
      const payments: Record<number, Payment> = {};
      
      for (const booking of bookings) {
        try {
          const res = await fetch(`/api/bookings/${booking.id}/payment`);
          if (res.ok) {
            const payment = await res.json();
            payments[booking.id] = payment;
          }
        } catch (error) {
          // Payment might not exist yet for this booking
          console.log(`No payment found for booking ${booking.id}`);
        }
      }
      
      return payments;
    },
    enabled: !!bookings && bookings.length > 0,
  });
  
  // Cancel booking mutation
  const cancelMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      return apiRequest("PUT", `/api/bookings/${bookingId}/status`, { status: "Cancelled" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "bookings"] });
      toast({
        title: "Booking Cancelled",
        description: "Your booking has been cancelled successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel booking",
        variant: "destructive",
      });
    },
  });
  
  // Check if all data is loading
  const isLoading = isLoadingBookings || isLoadingGrounds || isLoadingSlots || isLoadingPayments;
  
  // Join booking data with slot and ground details
  const bookingsWithDetails: BookingWithDetails[] = bookings && slots && grounds ? bookings.map(booking => {
    const slot = slots.find(s => s.id === booking.slotId);
    const ground = slot ? grounds.find(g => g.id === slot.groundId) : undefined;
    const payment = paymentsMap?.[booking.id];
    
    return {
      ...booking,
      slot: slot!,
      ground: ground!,
      payment
    };
  }).filter(b => b.slot && b.ground) : [];
  
  // Filter bookings by status
  const upcomingBookings = bookingsWithDetails.filter(b => b.status === "Confirmed");
  const completedBookings = bookingsWithDetails.filter(b => b.status === "Completed");
  const cancelledBookings = bookingsWithDetails.filter(b => b.status === "Cancelled");
  
  // Handle booking cancellation
  const handleCancelBooking = (bookingId: number) => {
    if (confirm("Are you sure you want to cancel this booking?")) {
      cancelMutation.mutate(bookingId);
    }
  };
  
  if (!user) {
    navigate("/login");
    return null;
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">My Bookings</h1>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : bookingsWithDetails.length > 0 ? (
        <Tabs defaultValue="upcoming">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedBookings.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled ({cancelledBookings.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming" className="mt-6 space-y-6">
            {upcomingBookings.length > 0 ? (
              upcomingBookings.map(booking => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onCancel={handleCancelBooking}
                />
              ))
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">You have no upcoming bookings</p>
                  <Button className="mt-4" onClick={() => navigate("/")}>
                    Book a Ground
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="completed" className="mt-6 space-y-6">
            {completedBookings.length > 0 ? (
              completedBookings.map(booking => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  showCancel={false}
                />
              ))
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">You have no completed bookings</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="cancelled" className="mt-6 space-y-6">
            {cancelledBookings.length > 0 ? (
              cancelledBookings.map(booking => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  showCancel={false}
                />
              ))
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">You have no cancelled bookings</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">You haven't made any bookings yet</p>
            <Button onClick={() => navigate("/")}>
              Book a Ground
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Booking Card Component
interface BookingCardProps {
  booking: BookingWithDetails;
  showCancel?: boolean;
  onCancel?: (bookingId: number) => void;
}

function BookingCard({ booking, showCancel = true, onCancel }: BookingCardProps) {
  const [_, navigate] = useLocation();
  
  const statusColors = {
    Confirmed: "bg-green-500",
    Completed: "bg-blue-500",
    Cancelled: "bg-red-500",
  } as const;
  
  const statusIcons = {
    Confirmed: <CheckCircle className="h-4 w-4 mr-1" />,
    Completed: <CheckCircle className="h-4 w-4 mr-1" />,
    Cancelled: <XCircle className="h-4 w-4 mr-1" />,
  } as const;
  
  const paymentStatusColors = {
    Paid: "bg-green-500",
    Pending: "bg-yellow-500",
    Failed: "bg-red-500",
  } as const;
  
  return (
    <Card className="overflow-hidden">
      <div className={`h-2 ${statusColors[booking.status as keyof typeof statusColors]}`} />
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{booking.ground.name}</CardTitle>
            <CardDescription className="flex items-center mt-1">
              <MapPin className="h-4 w-4 mr-1" />
              {booking.ground.location}
            </CardDescription>
          </div>
          <Badge className="flex items-center">
            {statusIcons[booking.status as keyof typeof statusIcons]}
            {booking.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-1">Date & Time</h4>
            <div className="flex items-center text-sm">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              {booking.slot.date.toString()}
            </div>
            <div className="flex items-center text-sm mt-1">
              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
              {booking.slot.startTime.toString()} - {booking.slot.endTime.toString()}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-1">Payment Details</h4>
            <div className="flex items-center text-sm">
              <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
              Amount: ${Number(booking.slot.pricePerSlot).toFixed(2)}
            </div>
            <div className="flex items-center text-sm mt-1">
              <AlertCircle className="h-4 w-4 mr-2 text-muted-foreground" />
              Status: {booking.payment ? (
                <Badge variant="secondary" className={`ml-1 ${paymentStatusColors[booking.payment.paymentStatus as keyof typeof paymentStatusColors]}`}>
                  {booking.payment.paymentStatus}
                </Badge>
              ) : (
                <Badge variant="secondary" className="ml-1 bg-yellow-500">
                  Not Paid
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-3">
        {booking.status === "Confirmed" && !booking.payment && (
          <Button 
            variant="outline" 
            onClick={() => navigate(`/payment/${booking.id}`)}
          >
            Pay Now
          </Button>
        )}
        
        {showCancel && booking.status === "Confirmed" && onCancel && (
          <Button 
            variant="destructive" 
            onClick={() => onCancel(booking.id)}
          >
            Cancel Booking
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Ground, Slot, InsertBooking } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Calendar, Clock, ArrowLeft, Loader2, CheckCircle } from "lucide-react";

export default function BookSlot() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { groundId } = useParams();
  const [_, navigate] = useLocation();
  
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [isBookingConfirmed, setIsBookingConfirmed] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);
  
  // Fetch ground details
  const { data: ground, isLoading: isLoadingGround } = useQuery<Ground>({
    queryKey: ["/api/grounds", groundId],
    queryFn: async () => {
      const res = await fetch(`/api/grounds/${groundId}`);
      if (!res.ok) throw new Error("Failed to fetch ground details");
      return res.json();
    },
  });
  
  // Fetch available slots for selected date
  const { data: availableSlots, isLoading: isLoadingSlots, refetch: refetchSlots } = useQuery<Slot[]>({
    queryKey: ["/api/grounds", groundId, "slots", "available", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/grounds/${groundId}/slots/available?date=${selectedDate}`);
      if (!res.ok) throw new Error("Failed to fetch available slots");
      return res.json();
    },
  });
  
  // Reset selected slot when date changes
  useEffect(() => {
    setSelectedSlot(null);
    refetchSlots();
  }, [selectedDate, refetchSlots]);
  
  // Book slot mutation
  const bookMutation = useMutation({
    mutationFn: async (data: InsertBooking) => {
      const response = await apiRequest("POST", "/api/bookings", data);
      return response.json();
    },
    onSuccess: (data) => {
      setIsBookingConfirmed(true);
      setBookingId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/grounds", groundId, "slots", "available", selectedDate] });
      toast({
        title: "Booking Successful",
        description: "Your slot has been booked successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "Could not complete your booking",
        variant: "destructive",
      });
    },
  });
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };
  
  const handleSlotSelect = (slotId: string) => {
    const slot = availableSlots?.find(s => s.id === parseInt(slotId)) || null;
    setSelectedSlot(slot);
  };
  
  const handleBooking = () => {
    if (!user || !selectedSlot) return;
    
    bookMutation.mutate({
      slotId: selectedSlot.id,
      userId: user.id,
      status: "Confirmed"
    });
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
        <h1 className="text-3xl font-bold">Book a Slot</h1>
      </div>
      
      {isLoadingGround ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : ground ? (
        <div className="space-y-6">
          {/* Ground Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>{ground.name}</CardTitle>
              <CardDescription>{ground.location}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <p><strong>Sport:</strong> {ground.sportType}</p>
                  {ground.description && <p className="mt-2">{ground.description}</p>}
                </div>
                <div className="text-right">
                  <p><strong>Rating:</strong> {ground.rating || "New"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {isBookingConfirmed ? (
            <Card className="border-green-500">
              <CardHeader>
                <CardTitle className="flex items-center text-green-600">
                  <CheckCircle className="h-6 w-6 mr-2" />
                  Booking Confirmed!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Your booking has been confirmed successfully.</p>
                <div className="bg-muted p-4 rounded-md">
                  <p><strong>Ground:</strong> {ground.name}</p>
                  <p><strong>Date:</strong> {selectedSlot?.date.toString()}</p>
                  <p><strong>Time:</strong> {selectedSlot?.startTime.toString()} - {selectedSlot?.endTime.toString()}</p>
                  <p><strong>Price:</strong> ${Number(selectedSlot?.pricePerSlot).toFixed(2)}</p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => navigate("/bookings")}>
                  View All Bookings
                </Button>
                <Button onClick={() => navigate(`/payment/${bookingId}`)}>
                  Proceed to Payment
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <>
              {/* Slot Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Select Date & Time</CardTitle>
                  <CardDescription>
                    Choose an available slot for your booking
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Date Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="date" className="block text-sm font-medium mb-1">Select Date</label>
                      <Input 
                        id="date" 
                        type="date" 
                        value={selectedDate} 
                        onChange={handleDateChange}
                        min={format(new Date(), "yyyy-MM-dd")}
                      />
                    </div>
                  </div>
                  
                  {/* Available Slots */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Available Slots</label>
                    {isLoadingSlots ? (
                      <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : availableSlots && availableSlots.length > 0 ? (
                      <div className="space-y-4">
                        <Select value={selectedSlot?.id.toString() || ""} onValueChange={handleSlotSelect}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a time slot" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSlots.map((slot) => (
                              <SelectItem key={slot.id} value={slot.id.toString()}>
                                {slot.startTime.toString()} - {slot.endTime.toString()} (${Number(slot.pricePerSlot).toFixed(2)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {selectedSlot && (
                          <Card className="bg-muted/40 mt-4">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-center">
                                <div className="space-y-1">
                                  <div className="flex items-center text-sm">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    <span>{selectedSlot.date.toString()}</span>
                                  </div>
                                  <div className="flex items-center text-sm">
                                    <Clock className="mr-2 h-4 w-4" />
                                    <span>{selectedSlot.startTime.toString()} - {selectedSlot.endTime.toString()}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold">${Number(selectedSlot.pricePerSlot).toFixed(2)}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="mb-2">No slots available for this date</p>
                        <p>Please select another date or check back later</p>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    disabled={!selectedSlot || bookMutation.isPending}
                    onClick={handleBooking}
                  >
                    {bookMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Book Now
                  </Button>
                </CardFooter>
              </Card>
            </>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Ground not found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper Input component for date selection
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input 
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      {...props}
    />
  );
}

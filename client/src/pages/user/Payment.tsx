import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPaymentSchema, Booking, Ground, Slot, Payment as PaymentType, PaymentMethods } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, CheckCircle, Calendar, Clock, CreditCard, Building, Smartphone } from "lucide-react";

export default function Payment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { bookingId } = useParams();
  const [_, navigate] = useLocation();
  
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);
  
  // Fetch booking details
  const { data: booking, isLoading: isLoadingBooking } = useQuery<Booking>({
    queryKey: ["/api/bookings", bookingId],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${bookingId}`);
      if (!res.ok) throw new Error("Failed to fetch booking details");
      return res.json();
    },
  });
  
  // Fetch slot details for the booking
  const { data: slot, isLoading: isLoadingSlot } = useQuery<Slot>({
    queryKey: ["/api/slots", booking?.slotId],
    queryFn: async () => {
      if (!booking) return null;
      const res = await fetch(`/api/slots/${booking.slotId}`);
      if (!res.ok) throw new Error("Failed to fetch slot details");
      return res.json();
    },
    enabled: !!booking,
  });
  
  // Fetch ground details for the slot
  const { data: ground, isLoading: isLoadingGround } = useQuery<Ground>({
    queryKey: ["/api/grounds", slot?.groundId],
    queryFn: async () => {
      if (!slot) return null;
      const res = await fetch(`/api/grounds/${slot.groundId}`);
      if (!res.ok) throw new Error("Failed to fetch ground details");
      return res.json();
    },
    enabled: !!slot,
  });
  
  // Check if payment already exists
  const { data: existingPayment, isLoading: isLoadingPayment } = useQuery<PaymentType>({
    queryKey: ["/api/bookings", bookingId, "payment"],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${bookingId}/payment`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to check payment status");
      return res.json();
    },
  });
  
  // Form setup
  const form = useForm<typeof insertPaymentSchema._type>({
    resolver: zodResolver(insertPaymentSchema),
    defaultValues: {
      bookingId: parseInt(bookingId || "0"),
      amount: "0",
      paymentMethod: "Card",
      paymentStatus: "Paid",
    },
  });
  
  // Update form when slot is loaded
  useEffect(() => {
    if (slot) {
      form.setValue("amount", slot.pricePerSlot.toString());
    }
  }, [slot, form]);
  
  // Create payment mutation
  const paymentMutation = useMutation({
    mutationFn: async (data: typeof insertPaymentSchema._type) => {
      return apiRequest("POST", "/api/payments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings", bookingId, "payment"] });
      setIsPaymentComplete(true);
      toast({
        title: "Payment Successful",
        description: "Your payment has been processed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Could not process your payment",
        variant: "destructive",
      });
    },
  });
  
  // Submit handler
  const onSubmit = (data: typeof insertPaymentSchema._type) => {
    paymentMutation.mutate(data);
  };
  
  // Check if all data is loading
  const isLoading = isLoadingBooking || isLoadingSlot || isLoadingGround || isLoadingPayment;
  
  // Handle card number input formatting
  const formatCardNumber = (value: string) => {
    return value.replace(/\s/g, "").replace(/(\d{4})/g, "$1 ").trim();
  };
  
  // Determine if this is a valid booking that can be paid for
  const isPaymentAllowed = booking && 
                           booking.status === "Confirmed" && 
                           slot && 
                           !existingPayment;
  
  // If payment already complete, show success message
  const isAlreadyPaid = existingPayment && existingPayment.paymentStatus === "Paid";
  
  if (!user) {
    navigate("/login");
    return null;
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/bookings")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">Payment</h1>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Booking Summary */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ground && slot ? (
                  <>
                    <div>
                      <h3 className="font-medium">{ground.name}</h3>
                      <p className="text-sm text-muted-foreground">{ground.location}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{slot.date.toString()}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{slot.startTime.toString()} - {slot.endTime.toString()}</span>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4 mt-4">
                      <div className="flex justify-between">
                        <span>Slot Price</span>
                        <span>${Number(slot.pricePerSlot).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold mt-2">
                        <span>Total</span>
                        <span>${Number(slot.pricePerSlot).toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p>Booking details not available</p>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Payment Form or Status */}
          <div className="md:col-span-2">
            {isPaymentComplete || isAlreadyPaid ? (
              <Card className="border-green-500">
                <CardHeader>
                  <CardTitle className="flex items-center text-green-600">
                    <CheckCircle className="h-6 w-6 mr-2" />
                    Payment Successful!
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-6">
                    Your payment has been processed successfully. Thank you for your booking!
                  </p>
                  
                  <div className="bg-muted p-4 rounded-md">
                    <h3 className="font-medium mb-2">Payment Details</h3>
                    <p><strong>Amount:</strong> ${Number(isAlreadyPaid ? existingPayment.amount : slot?.pricePerSlot).toFixed(2)}</p>
                    <p><strong>Method:</strong> {isAlreadyPaid ? existingPayment.paymentMethod : form.getValues("paymentMethod")}</p>
                    <p><strong>Date:</strong> {isAlreadyPaid ? new Date(existingPayment.paymentDate).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" onClick={() => navigate("/bookings")}>
                    View My Bookings
                  </Button>
                </CardFooter>
              </Card>
            ) : isPaymentAllowed ? (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Details</CardTitle>
                  <CardDescription>
                    Complete your payment for this booking
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="paymentMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Method</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select payment method" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {PaymentMethods.map((method) => (
                                  <SelectItem key={method} value={method}>
                                    {method === "Card" && <CreditCard className="h-4 w-4 mr-2 inline" />}
                                    {method === "Cash" && <Building className="h-4 w-4 mr-2 inline" />}
                                    {method === "Online" && <Smartphone className="h-4 w-4 mr-2 inline" />}
                                    {method}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {form.watch("paymentMethod") === "Card" && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <label htmlFor="cardNumber" className="block text-sm font-medium mb-1">Card Number</label>
                              <Input 
                                id="cardNumber" 
                                placeholder="1234 5678 9012 3456"
                                onChange={(e) => {
                                  e.target.value = formatCardNumber(e.target.value);
                                }}
                                maxLength={19}
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="expiry" className="block text-sm font-medium mb-1">Expiry Date</label>
                              <Input id="expiry" placeholder="MM/YY" maxLength={5} />
                            </div>
                            <div>
                              <label htmlFor="cvv" className="block text-sm font-medium mb-1">CVV</label>
                              <Input id="cvv" placeholder="123" maxLength={3} />
                            </div>
                          </div>
                          
                          <div>
                            <label htmlFor="name" className="block text-sm font-medium mb-1">Name on Card</label>
                            <Input id="name" placeholder="John Doe" />
                          </div>
                          
                          <FormDescription className="text-xs">
                            This is a demo application. No real payment will be processed.
                          </FormDescription>
                        </div>
                      )}
                      
                      {form.watch("paymentMethod") === "Online" && (
                        <div className="border rounded p-4 text-center">
                          <p className="mb-4">For online payment methods, you would be redirected to the payment gateway.</p>
                          <p className="text-sm text-muted-foreground">This is a demo application. No real payment will be processed.</p>
                        </div>
                      )}
                      
                      {form.watch("paymentMethod") === "Cash" && (
                        <div className="border rounded p-4 text-center">
                          <p className="mb-4">Please pay in cash when you arrive at the venue.</p>
                          <p className="text-sm text-muted-foreground">This booking will be marked as "pay on arrival".</p>
                        </div>
                      )}
                      
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={paymentMutation.isPending}
                      >
                        {paymentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Pay ${Number(slot.pricePerSlot).toFixed(2)}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground mb-4">
                    {booking?.status !== "Confirmed" 
                      ? "This booking cannot be paid for because it is not in a confirmed state." 
                      : "This booking has already been paid for or is not available for payment."}
                  </p>
                  <Button onClick={() => navigate("/bookings")}>
                    Back to My Bookings
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

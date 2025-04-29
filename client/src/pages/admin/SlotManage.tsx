import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertSlotSchema, 
  Ground, 
  Slot, 
  InsertSlot, 
  SlotAvailabilityStatuses 
} from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Pencil, Trash2, ArrowLeft, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

export default function SlotManage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const groundId = params.get("groundId") ? parseInt(params.get("groundId")!) : null;
  const slotId = params.get("slotId") ? parseInt(params.get("slotId")!) : null;
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState<Slot | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  
  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isAdmin, navigate, toast]);
  
  // Fetch grounds
  const { data: grounds, isLoading: isLoadingGrounds } = useQuery<Ground[]>({
    queryKey: ["/api/grounds"],
  });
  
  // Get selected ground
  const selectedGround = groundId && grounds
    ? grounds.find(g => g.id === groundId)
    : null;
  
  // Fetch slots for selected ground
  const { data: slots, isLoading: isLoadingSlots } = useQuery<Slot[]>({
    queryKey: ["/api/grounds", groundId, "slots"],
    queryFn: async () => {
      if (!groundId) return [];
      const res = await fetch(`/api/grounds/${groundId}/slots`);
      if (!res.ok) throw new Error("Failed to fetch slots");
      return res.json();
    },
    enabled: !!groundId,
  });
  
  // Get selected slot to edit
  const selectedSlot = slotId && slots
    ? slots.find(s => s.id === slotId)
    : null;
  
  // Filter slots by selected date
  const filteredSlots = slots?.filter(slot => 
    slot.date.toString() === selectedDate
  ) || [];
  
  // Add form setup
  const addForm = useForm<InsertSlot>({
    resolver: zodResolver(insertSlotSchema),
    defaultValues: {
      groundId: groundId || 0,
      date: selectedDate,
      startTime: "",
      endTime: "",
      pricePerSlot: "",
      availabilityStatus: "Available",
    },
  });
  
  // Edit form setup
  const editForm = useForm<InsertSlot>({
    resolver: zodResolver(insertSlotSchema),
    defaultValues: {
      groundId: selectedSlot?.groundId || 0,
      date: selectedSlot?.date.toString() || selectedDate,
      startTime: selectedSlot?.startTime.toString() || "",
      endTime: selectedSlot?.endTime.toString() || "",
      pricePerSlot: selectedSlot?.pricePerSlot.toString() || "",
      availabilityStatus: selectedSlot?.availabilityStatus || "Available",
    },
  });
  
  // Reset add form when ground changes
  useEffect(() => {
    if (groundId) {
      addForm.setValue("groundId", groundId);
      addForm.setValue("date", selectedDate);
    }
  }, [groundId, selectedDate, addForm]);
  
  // Reset edit form when selected slot changes
  useEffect(() => {
    if (selectedSlot) {
      editForm.reset({
        groundId: selectedSlot.groundId,
        date: selectedSlot.date.toString(),
        startTime: selectedSlot.startTime.toString(),
        endTime: selectedSlot.endTime.toString(),
        pricePerSlot: selectedSlot.pricePerSlot.toString(),
        availabilityStatus: selectedSlot.availabilityStatus,
      });
    }
  }, [selectedSlot, editForm]);
  
  // Add slot mutation
  const addMutation = useMutation({
    mutationFn: async (data: InsertSlot) => {
      return apiRequest("POST", "/api/slots", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grounds", groundId, "slots"] });
      toast({
        title: "Slot added",
        description: "The time slot has been added successfully.",
      });
      setIsAddDialogOpen(false);
      addForm.reset({
        groundId: groundId || 0,
        date: selectedDate,
        startTime: "",
        endTime: "",
        pricePerSlot: "",
        availabilityStatus: "Available",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add slot",
        variant: "destructive",
      });
    },
  });
  
  // Update slot mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; slot: Partial<InsertSlot> }) => {
      return apiRequest("PUT", `/api/slots/${data.id}`, data.slot);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grounds", groundId, "slots"] });
      toast({
        title: "Slot updated",
        description: "The time slot has been updated successfully.",
      });
      setIsEditing(false);
      navigate(`/admin/slots?groundId=${groundId}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update slot",
        variant: "destructive",
      });
    },
  });
  
  // Delete slot mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/slots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grounds", groundId, "slots"] });
      toast({
        title: "Slot deleted",
        description: "The time slot has been deleted successfully.",
      });
      setSlotToDelete(null);
      navigate(`/admin/slots?groundId=${groundId}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete slot",
        variant: "destructive",
      });
    },
  });
  
  // Handlers
  const handleAddSubmit = (data: InsertSlot) => {
    addMutation.mutate(data);
  };
  
  const handleEditSubmit = (data: InsertSlot) => {
    if (!selectedSlot) return;
    updateMutation.mutate({ id: selectedSlot.id, slot: data });
  };
  
  const handleDelete = (slot: Slot) => {
    setSlotToDelete(slot);
  };
  
  const confirmDelete = () => {
    if (slotToDelete) {
      deleteMutation.mutate(slotToDelete.id);
    }
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };
  
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
          <h1 className="text-3xl font-bold">Manage Slots</h1>
        </div>
        
        {selectedGround && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Slot
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Time Slot</DialogTitle>
                <DialogDescription>
                  Add a new time slot for {selectedGround.name}
                </DialogDescription>
              </DialogHeader>
              
              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit(handleAddSubmit)} className="space-y-4">
                  <FormField
                    control={addForm.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={addForm.control}
                    name="pricePerSlot"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            placeholder="0.00" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addForm.control}
                    name="availabilityStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select availability status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SlotAvailabilityStatuses.map((status) => (
                              <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={addMutation.isPending}
                    >
                      {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add Slot
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      {isLoadingGrounds ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Ground</CardTitle>
                <CardDescription>
                  Choose a ground to manage its time slots
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {grounds && grounds.length > 0 ? (
                  grounds.map((ground) => (
                    <Button
                      key={ground.id}
                      variant={ground.id === groundId ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => navigate(`/admin/slots?groundId=${ground.id}`)}
                    >
                      {ground.name} <span className="ml-2 text-xs opacity-70">({ground.sportType})</span>
                    </Button>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No grounds added yet
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => navigate("/admin/grounds")}
                >
                  Manage Grounds
                </Button>
              </CardFooter>
            </Card>
            
            {selectedGround && (
              <Card>
                <CardHeader>
                  <CardTitle>Filter Slots</CardTitle>
                  <CardDescription>
                    View slots for a specific date
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid w-full items-center gap-1.5">
                      <label htmlFor="date" className="text-sm font-medium">Date</label>
                      <Input
                        type="date"
                        id="date"
                        value={selectedDate}
                        onChange={handleDateChange}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          <div className="md:col-span-2">
            {selectedGround ? (
              selectedSlot && isEditing ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Edit Time Slot</CardTitle>
                    <CardDescription>
                      Update slot details for {selectedGround.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...editForm}>
                      <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
                        <FormField
                          control={editForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={editForm.control}
                            name="startTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Time</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={editForm.control}
                            name="endTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Time</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={editForm.control}
                          name="pricePerSlot"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  step="0.01" 
                                  placeholder="0.00" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={editForm.control}
                          name="availabilityStatus"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select availability status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {SlotAvailabilityStatuses.map((status) => (
                                    <SelectItem key={status} value={status}>{status}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end gap-2 pt-4">
                          <Button 
                            variant="outline" 
                            type="button" 
                            onClick={() => {
                              setIsEditing(false);
                              navigate(`/admin/slots?groundId=${groundId}`);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Time Slots for {selectedGround.name}</CardTitle>
                    <CardDescription>
                      Manage time slots for this ground
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingSlots ? (
                      <div className="flex justify-center p-6">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : filteredSlots.length > 0 ? (
                      <div className="space-y-4">
                        {filteredSlots.map((slot) => (
                          <Card key={slot.id} className="overflow-hidden">
                            <div className={`flex border-l-4 ${
                              slot.availabilityStatus === "Available" 
                                ? "border-green-500" 
                                : "border-yellow-500"
                            }`}>
                              <div className="py-4 px-6 flex-1">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">
                                        {slot.startTime.toString()} - {slot.endTime.toString()}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Calendar className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm text-muted-foreground">
                                        {slot.date.toString()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-medium">${Number(slot.pricePerSlot).toFixed(2)}</div>
                                    <div className={`text-sm ${
                                      slot.availabilityStatus === "Available"
                                        ? "text-green-600"
                                        : "text-yellow-600"
                                    }`}>
                                      {slot.availabilityStatus}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 py-2 px-4">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setIsEditing(true);
                                    navigate(`/admin/slots?groundId=${groundId}&slotId=${slot.id}`);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(slot)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <h3 className="font-medium text-lg">No slots found for this date</h3>
                        <p className="text-muted-foreground mt-2">
                          Add time slots for {selectedDate} or select another date
                        </p>
                        <Button 
                          className="mt-4" 
                          onClick={() => setIsAddDialogOpen(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Slot
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12">
                  <h3 className="text-xl font-medium">No Ground Selected</h3>
                  <p className="text-muted-foreground text-center mt-2">
                    Select a ground from the list to manage its time slots
                  </p>
                  <Button 
                    onClick={() => navigate("/admin/grounds")} 
                    className="mt-4"
                  >
                    Manage Grounds
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!slotToDelete} onOpenChange={(open) => !open && setSlotToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the time slot on {slotToDelete?.date.toString()} 
              from {slotToDelete?.startTime.toString()} to {slotToDelete?.endTime.toString()}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

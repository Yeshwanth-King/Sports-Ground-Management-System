import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGroundSchema, Ground, InsertGround, SportTypes } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";

export default function GroundManage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const groundId = params.get("id") ? parseInt(params.get("id")!) : null;
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [groundToDelete, setGroundToDelete] = useState<Ground | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
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
  const { data: grounds, isLoading } = useQuery<Ground[]>({
    queryKey: ["/api/grounds"],
  });
  
  // Get selected ground to edit
  const selectedGround = groundId && grounds
    ? grounds.find(g => g.id === groundId)
    : null;
  
  // Forms setup
  const addForm = useForm<InsertGround>({
    resolver: zodResolver(insertGroundSchema),
    defaultValues: {
      name: "",
      location: "",
      sportType: SportTypes[0],
      description: "",
      imageUrl: "",
    },
  });
  
  const editForm = useForm<InsertGround>({
    resolver: zodResolver(insertGroundSchema),
    defaultValues: {
      name: selectedGround?.name || "",
      location: selectedGround?.location || "",
      sportType: selectedGround?.sportType || SportTypes[0],
      description: selectedGround?.description || "",
      imageUrl: selectedGround?.imageUrl || "",
    },
  });
  
  // Reset form when selected ground changes
  useEffect(() => {
    if (selectedGround) {
      editForm.reset({
        name: selectedGround.name,
        location: selectedGround.location,
        sportType: selectedGround.sportType,
        description: selectedGround.description || "",
        imageUrl: selectedGround.imageUrl || "",
      });
    }
  }, [selectedGround, editForm]);
  
  // Add ground mutation
  const addMutation = useMutation({
    mutationFn: async (data: InsertGround) => {
      return apiRequest("POST", "/api/grounds", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grounds"] });
      toast({
        title: "Ground added",
        description: "The ground has been added successfully.",
      });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add ground",
        variant: "destructive",
      });
    },
  });
  
  // Update ground mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; ground: Partial<InsertGround> }) => {
      return apiRequest("PUT", `/api/grounds/${data.id}`, data.ground);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grounds"] });
      toast({
        title: "Ground updated",
        description: "The ground has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update ground",
        variant: "destructive",
      });
    },
  });
  
  // Delete ground mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/grounds/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grounds"] });
      toast({
        title: "Ground deleted",
        description: "The ground has been deleted successfully.",
      });
      setGroundToDelete(null);
      navigate("/admin/grounds");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete ground",
        variant: "destructive",
      });
    },
  });
  
  // Handlers
  const handleAddSubmit = (data: InsertGround) => {
    addMutation.mutate(data);
  };
  
  const handleEditSubmit = (data: InsertGround) => {
    if (!selectedGround) return;
    updateMutation.mutate({ id: selectedGround.id, ground: data });
  };
  
  const handleDelete = (ground: Ground) => {
    setGroundToDelete(ground);
  };
  
  const confirmDelete = () => {
    if (groundToDelete) {
      deleteMutation.mutate(groundToDelete.id);
    }
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
          <h1 className="text-3xl font-bold">Manage Grounds</h1>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Ground
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Ground</DialogTitle>
              <DialogDescription>
                Fill in the details to add a new sports ground.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(handleAddSubmit)} className="space-y-4">
                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter ground name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter ground location" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addForm.control}
                  name="sportType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sport Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a sport type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SportTypes.map((sport) => (
                            <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter ground description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addForm.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter image URL (optional)" {...field} />
                      </FormControl>
                      <FormDescription>
                        Provide a URL for an image of the ground (optional)
                      </FormDescription>
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
                    Add Ground
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Grounds</CardTitle>
                <CardDescription>
                  Click on a ground to view or edit its details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {grounds && grounds.length > 0 ? (
                  grounds.map((ground) => (
                    <Button
                      key={ground.id}
                      variant={ground.id === groundId ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => navigate(`/admin/grounds?id=${ground.id}`)}
                    >
                      {ground.name}
                    </Button>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No grounds added yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-2">
            {selectedGround ? (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{selectedGround.name}</CardTitle>
                      <CardDescription>{selectedGround.location}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => setIsEditing(!isEditing)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(selectedGround)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Form {...editForm}>
                      <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
                        <FormField
                          control={editForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter ground name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={editForm.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter ground location" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={editForm.control}
                          name="sportType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sport Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a sport type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {SportTypes.map((sport) => (
                                    <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={editForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Enter ground description" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={editForm.control}
                          name="imageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Image URL</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter image URL (optional)" {...field} />
                              </FormControl>
                              <FormDescription>
                                Provide a URL for an image of the ground (optional)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            type="button" 
                            onClick={() => setIsEditing(false)}
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
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium">Sport Type</h3>
                        <p>{selectedGround.sportType}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium">Rating</h3>
                        <p>{selectedGround.rating || "Not rated yet"}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium">Description</h3>
                        <p>{selectedGround.description || "No description provided"}</p>
                      </div>
                      
                      <div className="pt-4">
                        <Button 
                          onClick={() => navigate(`/admin/slots?groundId=${selectedGround.id}`)}
                        >
                          Manage Slots
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12">
                  <h3 className="text-xl font-medium">No Ground Selected</h3>
                  <p className="text-muted-foreground text-center mt-2">
                    Select a ground from the list or add a new one
                  </p>
                  <Button 
                    onClick={() => setIsAddDialogOpen(true)} 
                    className="mt-4"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Ground
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!groundToDelete} onOpenChange={(open) => !open && setGroundToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the ground "{groundToDelete?.name}". 
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

import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Ground } from "@shared/schema";
import { Loader2, Calendar, MapPin, Star } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  
  const { data: grounds, isLoading } = useQuery<Ground[]>({
    queryKey: ["/api/grounds"],
  });
  
  return (
    <div className="space-y-8">
      {/* Hero section */}
      <section className="py-12 bg-primary/5 rounded-lg">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold">Sports Ground Management System</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Book your favorite sports grounds with ease. Find available slots and manage your bookings all in one place.
          </p>
          {!user && (
            <div className="flex justify-center gap-4 pt-4">
              <Link href="/login">
                <Button size="lg">Login</Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline">Register</Button>
              </Link>
            </div>
          )}
        </div>
      </section>
      
      {/* Available grounds section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Available Sports Grounds</h2>
          {user && (
            <Link href="/bookings">
              <Button variant="outline">View My Bookings</Button>
            </Link>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : grounds && grounds.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {grounds.map((ground) => (
              <Card key={ground.id}>
                <CardHeader>
                  <CardTitle>{ground.name}</CardTitle>
                  <CardDescription className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {ground.location}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center mb-4">
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {ground.sportType}
                    </div>
                    <div className="ml-auto flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />
                      <span className="ml-1 text-sm">{ground.rating || "New"}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {ground.description || `A great venue for playing ${ground.sportType}.`}
                  </p>
                </CardContent>
                <CardFooter>
                  <Link href={user ? `/book/${ground.id}` : "/login"}>
                    <Button className="w-full">
                      <Calendar className="mr-2 h-4 w-4" />
                      {user ? "Book Now" : "Login to Book"}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12">
              <h3 className="font-medium text-lg">No grounds available</h3>
              <p className="text-muted-foreground text-center mt-2">
                {user?.isAdmin 
                  ? "Add some grounds to get started"
                  : "Check back later for available grounds"}
              </p>
              {user?.isAdmin && (
                <Link href="/admin/grounds" className="mt-4">
                  <Button>Add Ground</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </section>
      
      {/* Features section */}
      <section className="py-8">
        <h2 className="text-2xl font-bold mb-6">Our Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Easy Booking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Book your preferred sports ground with just a few clicks.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Multiple Sports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Choose from various sports including Cricket, Football, Basketball, and more.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Flexible Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Pay using multiple methods including Card, Cash, and Online transactions.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

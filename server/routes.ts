import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertGroundSchema, 
  insertSlotSchema, 
  insertUserSchema, 
  insertBookingSchema, 
  insertPaymentSchema,
  loginSchema,
  BookingStatuses,
  PaymentStatuses
} from "@shared/schema";
import * as z from "zod";
import session from "express-session";
import MemoryStore from "memorystore";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  const MemoryStoreSession = MemoryStore(session);
  app.use(
    session({
      secret: "sports-ground-management-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 86400000 }, // 1 day
      store: new MemoryStoreSession({
        checkPeriod: 86400000 // prune expired entries every 24h
      })
    })
  );

  // Auth middleware
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  const requireAdmin = (req: Request, res: Response, next: Function) => {
    if (!req.session.user || !req.session.user.isAdmin) {
      return res.status(403).json({ message: "Forbidden - Admin access required" });
    }
    next();
  };

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);

      if (!user || user.password !== data.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set user in session
      req.session.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin
      };

      return res.status(200).json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
        isAdmin: user.isAdmin
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      // Check if user with email already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      const user = await storage.createUser(data);
      
      // Set user in session
      req.session.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin
      };
      
      return res.status(201).json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
        isAdmin: user.isAdmin
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    return res.status(200).json(req.session.user);
  });

  // Ground routes
  app.get("/api/grounds", async (req, res) => {
    try {
      const grounds = await storage.getGrounds();
      return res.status(200).json(grounds);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/grounds/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const ground = await storage.getGround(id);
      if (!ground) {
        return res.status(404).json({ message: "Ground not found" });
      }
      
      return res.status(200).json(ground);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/grounds", requireAdmin, async (req, res) => {
    try {
      const data = insertGroundSchema.parse(req.body);
      const ground = await storage.createGround(data);
      return res.status(201).json(ground);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/grounds/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const data = insertGroundSchema.partial().parse(req.body);
      const ground = await storage.updateGround(id, data);
      
      if (!ground) {
        return res.status(404).json({ message: "Ground not found" });
      }
      
      return res.status(200).json(ground);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/grounds/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const success = await storage.deleteGround(id);
      if (!success) {
        return res.status(404).json({ message: "Ground not found" });
      }
      
      return res.status(200).json({ message: "Ground deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Slot routes
  app.get("/api/slots", async (req, res) => {
    try {
      const slots = await storage.getSlots();
      return res.status(200).json(slots);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/slots/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const slot = await storage.getSlot(id);
      if (!slot) {
        return res.status(404).json({ message: "Slot not found" });
      }
      
      return res.status(200).json(slot);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/grounds/:groundId/slots", async (req, res) => {
    try {
      const groundId = parseInt(req.params.groundId);
      if (isNaN(groundId)) {
        return res.status(400).json({ message: "Invalid ground ID" });
      }
      
      const slots = await storage.getSlotsByGround(groundId);
      return res.status(200).json(slots);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/grounds/:groundId/slots/available", async (req, res) => {
    try {
      const groundId = parseInt(req.params.groundId);
      const date = req.query.date as string;
      
      if (isNaN(groundId)) {
        return res.status(400).json({ message: "Invalid ground ID" });
      }
      
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
      }
      
      const slots = await storage.getAvailableSlotsByGroundAndDate(groundId, date);
      return res.status(200).json(slots);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/slots", requireAdmin, async (req, res) => {
    try {
      const data = insertSlotSchema.parse(req.body);
      const slot = await storage.createSlot(data);
      return res.status(201).json(slot);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/slots/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const data = insertSlotSchema.partial().parse(req.body);
      const slot = await storage.updateSlot(id, data);
      
      if (!slot) {
        return res.status(404).json({ message: "Slot not found" });
      }
      
      return res.status(200).json(slot);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/slots/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const success = await storage.deleteSlot(id);
      if (!success) {
        return res.status(404).json({ message: "Slot not found" });
      }
      
      return res.status(200).json({ message: "Slot deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // User routes
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      return res.status(200).json(users);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      // Only allow users to access their own data or admins to access any data
      if (req.session.user?.id !== id && !req.session.user?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      return res.status(200).json(user);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      // Only allow users to update their own data or admins to update any data
      if (req.session.user?.id !== id && !req.session.user?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const data = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(id, data);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      return res.status(200).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Booking routes
  app.get("/api/bookings", requireAdmin, async (req, res) => {
    try {
      const bookings = await storage.getBookings();
      return res.status(200).json(bookings);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/bookings/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const booking = await storage.getBooking(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Only allow users to access their own bookings or admins to access any booking
      if (req.session.user?.id !== booking.userId && !req.session.user?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      return res.status(200).json(booking);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/users/:userId/bookings", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Only allow users to access their own bookings or admins to access any user's bookings
      if (req.session.user?.id !== userId && !req.session.user?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const bookings = await storage.getBookingsByUser(userId);
      return res.status(200).json(bookings);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/grounds/:groundId/bookings", requireAdmin, async (req, res) => {
    try {
      const groundId = parseInt(req.params.groundId);
      if (isNaN(groundId)) {
        return res.status(400).json({ message: "Invalid ground ID" });
      }
      
      const bookings = await storage.getBookingsByGround(groundId);
      return res.status(200).json(bookings);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/bookings", requireAuth, async (req, res) => {
    try {
      const userId = req.session.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const data = insertBookingSchema.parse({ ...req.body, userId });
      
      try {
        const booking = await storage.createBooking(data);
        return res.status(201).json(booking);
      } catch (error) {
        return res.status(400).json({ message: error instanceof Error ? error.message : "Booking failed" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/bookings/:id/status", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const { status } = req.body;
      if (!status || !BookingStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const booking = await storage.getBooking(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Only allow users to cancel their own bookings or admins to update any booking
      if (status === "Cancelled" && req.session.user?.id !== booking.userId && !req.session.user?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Only allow admins to mark bookings as completed
      if (status === "Completed" && !req.session.user?.isAdmin) {
        return res.status(403).json({ message: "Forbidden - Admin access required" });
      }
      
      const updatedBooking = await storage.updateBookingStatus(id, status);
      return res.status(200).json(updatedBooking);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Payment routes
  app.get("/api/payments", requireAdmin, async (req, res) => {
    try {
      const payments = await storage.getPayments();
      return res.status(200).json(payments);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/payments/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const payment = await storage.getPayment(id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      // Check if the user is authorized to view this payment
      const booking = await storage.getBooking(payment.bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Associated booking not found" });
      }
      
      if (req.session.user?.id !== booking.userId && !req.session.user?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      return res.status(200).json(payment);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/bookings/:bookingId/payment", requireAuth, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }
      
      // Check if the user is authorized to view this booking's payment
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      if (req.session.user?.id !== booking.userId && !req.session.user?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const payment = await storage.getPaymentByBooking(bookingId);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found for this booking" });
      }
      
      return res.status(200).json(payment);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/payments", requireAuth, async (req, res) => {
    try {
      const data = insertPaymentSchema.parse(req.body);
      
      // Check if the user is authorized to create a payment for this booking
      const booking = await storage.getBooking(data.bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      if (req.session.user?.id !== booking.userId && !req.session.user?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Check if payment already exists for this booking
      const existingPayment = await storage.getPaymentByBooking(data.bookingId);
      if (existingPayment) {
        return res.status(400).json({ message: "Payment already exists for this booking" });
      }
      
      const payment = await storage.createPayment(data);
      return res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/payments/:id/status", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const { status } = req.body;
      if (!status || !PaymentStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const payment = await storage.updatePaymentStatus(id, status);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      return res.status(200).json(payment);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Reports routes
  app.get("/api/reports/grounds/:groundId/revenue", requireAdmin, async (req, res) => {
    try {
      const groundId = parseInt(req.params.groundId);
      if (isNaN(groundId)) {
        return res.status(400).json({ message: "Invalid ground ID" });
      }
      
      const revenueReport = await storage.getGroundRevenue(groundId);
      return res.status(200).json(revenueReport);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/reports/grounds/:groundId/occupancy", requireAdmin, async (req, res) => {
    try {
      const groundId = parseInt(req.params.groundId);
      if (isNaN(groundId)) {
        return res.status(400).json({ message: "Invalid ground ID" });
      }
      
      const occupancyReport = await storage.getGroundOccupancyRate(groundId);
      return res.status(200).json(occupancyReport);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

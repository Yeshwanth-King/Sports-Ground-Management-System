import { 
  Ground, InsertGround, 
  Slot, InsertSlot, 
  User, InsertUser, 
  Booking, InsertBooking, 
  Payment, InsertPayment,
  BookingStatuses,
  SlotAvailabilityStatuses
} from "@shared/schema";

// Storage Interface
export interface IStorage {
  // Ground operations
  getGrounds(): Promise<Ground[]>;
  getGround(id: number): Promise<Ground | undefined>;
  createGround(ground: InsertGround): Promise<Ground>;
  updateGround(id: number, ground: Partial<InsertGround>): Promise<Ground | undefined>;
  deleteGround(id: number): Promise<boolean>;
  
  // Slot operations
  getSlots(): Promise<Slot[]>;
  getSlot(id: number): Promise<Slot | undefined>;
  getSlotsByGround(groundId: number): Promise<Slot[]>;
  getAvailableSlotsByGroundAndDate(groundId: number, date: string): Promise<Slot[]>;
  createSlot(slot: InsertSlot): Promise<Slot>;
  updateSlot(id: number, slot: Partial<InsertSlot>): Promise<Slot | undefined>;
  deleteSlot(id: number): Promise<boolean>;
  
  // User operations
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Booking operations
  getBookings(): Promise<Booking[]>;
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByUser(userId: number): Promise<Booking[]>;
  getBookingsByGround(groundId: number): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: number, status: typeof BookingStatuses[number]): Promise<Booking | undefined>;
  
  // Payment operations
  getPayments(): Promise<Payment[]>;
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentByBooking(bookingId: number): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePaymentStatus(id: number, status: string): Promise<Payment | undefined>;
  
  // Special operations
  getGroundRevenue(groundId: number): Promise<{ groundName: string, totalRevenue: number }>;
  getGroundOccupancyRate(groundId: number): Promise<{ groundName: string, occupancyRate: number }>;
}

export class MemStorage implements IStorage {
  private grounds: Map<number, Ground>;
  private slots: Map<number, Slot>;
  private users: Map<number, User>;
  private bookings: Map<number, Booking>;
  private payments: Map<number, Payment>;
  
  private groundId: number;
  private slotId: number;
  private userId: number;
  private bookingId: number;
  private paymentId: number;
  
  constructor() {
    this.grounds = new Map();
    this.slots = new Map();
    this.users = new Map();
    this.bookings = new Map();
    this.payments = new Map();
    
    this.groundId = 1;
    this.slotId = 1;
    this.userId = 1;
    this.bookingId = 1;
    this.paymentId = 1;
    
    // Add admin user
    const adminUser: User = {
      id: this.userId++,
      firstName: "Admin",
      lastName: "User",
      email: "admin@sportsground.com",
      password: "admin123", // In a real app, this would be hashed
      phoneNumber: "1234567890",
      address: "Admin Address",
      isAdmin: true
    };
    this.users.set(adminUser.id, adminUser);
  }
  
  // Ground operations
  async getGrounds(): Promise<Ground[]> {
    return Array.from(this.grounds.values());
  }
  
  async getGround(id: number): Promise<Ground | undefined> {
    return this.grounds.get(id);
  }
  
  async createGround(ground: InsertGround): Promise<Ground> {
    const id = this.groundId++;
    const newGround: Ground = { id, ...ground };
    this.grounds.set(id, newGround);
    return newGround;
  }
  
  async updateGround(id: number, ground: Partial<InsertGround>): Promise<Ground | undefined> {
    const existingGround = this.grounds.get(id);
    if (!existingGround) return undefined;
    
    const updatedGround = { ...existingGround, ...ground };
    this.grounds.set(id, updatedGround);
    return updatedGround;
  }
  
  async deleteGround(id: number): Promise<boolean> {
    return this.grounds.delete(id);
  }
  
  // Slot operations
  async getSlots(): Promise<Slot[]> {
    return Array.from(this.slots.values());
  }
  
  async getSlot(id: number): Promise<Slot | undefined> {
    return this.slots.get(id);
  }
  
  async getSlotsByGround(groundId: number): Promise<Slot[]> {
    return Array.from(this.slots.values()).filter(slot => slot.groundId === groundId);
  }
  
  async getAvailableSlotsByGroundAndDate(groundId: number, date: string): Promise<Slot[]> {
    return Array.from(this.slots.values()).filter(
      slot => slot.groundId === groundId && 
             slot.date.toString() === date && 
             slot.availabilityStatus === "Available"
    );
  }
  
  async createSlot(slot: InsertSlot): Promise<Slot> {
    const id = this.slotId++;
    const newSlot: Slot = { id, ...slot };
    this.slots.set(id, newSlot);
    return newSlot;
  }
  
  async updateSlot(id: number, slot: Partial<InsertSlot>): Promise<Slot | undefined> {
    const existingSlot = this.slots.get(id);
    if (!existingSlot) return undefined;
    
    const updatedSlot = { ...existingSlot, ...slot };
    this.slots.set(id, updatedSlot);
    return updatedSlot;
  }
  
  async deleteSlot(id: number): Promise<boolean> {
    return this.slots.delete(id);
  }
  
  // User operations
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const newUser: User = { id, ...user, isAdmin: false };
    this.users.set(id, newUser);
    return newUser;
  }
  
  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { ...existingUser, ...user };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Booking operations
  async getBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values());
  }
  
  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }
  
  async getBookingsByUser(userId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(booking => booking.userId === userId);
  }
  
  async getBookingsByGround(groundId: number): Promise<Booking[]> {
    const bookings: Booking[] = [];
    for (const booking of this.bookings.values()) {
      const slot = await this.getSlot(booking.slotId);
      if (slot && slot.groundId === groundId) {
        bookings.push(booking);
      }
    }
    return bookings;
  }
  
  async createBooking(booking: InsertBooking): Promise<Booking> {
    // Check if slot is available
    const slot = await this.getSlot(booking.slotId);
    if (!slot || slot.availabilityStatus !== "Available") {
      throw new Error("Slot is not available for booking");
    }
    
    // Create booking
    const id = this.bookingId++;
    const newBooking: Booking = { 
      id, 
      ...booking,
      bookingDate: new Date()
    };
    this.bookings.set(id, newBooking);
    
    // Update slot availability
    await this.updateSlot(slot.id, { availabilityStatus: "Booked" });
    
    return newBooking;
  }
  
  async updateBookingStatus(id: number, status: typeof BookingStatuses[number]): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    
    const updatedBooking = { ...booking, status };
    this.bookings.set(id, updatedBooking);
    
    // If cancelling, make the slot available again
    if (status === "Cancelled") {
      const slot = await this.getSlot(booking.slotId);
      if (slot) {
        await this.updateSlot(slot.id, { availabilityStatus: "Available" });
      }
    }
    
    return updatedBooking;
  }
  
  // Payment operations
  async getPayments(): Promise<Payment[]> {
    return Array.from(this.payments.values());
  }
  
  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }
  
  async getPaymentByBooking(bookingId: number): Promise<Payment | undefined> {
    return Array.from(this.payments.values()).find(payment => payment.bookingId === bookingId);
  }
  
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.paymentId++;
    const newPayment: Payment = { 
      id, 
      ...payment,
      paymentDate: new Date()
    };
    this.payments.set(id, newPayment);
    return newPayment;
  }
  
  async updatePaymentStatus(id: number, paymentStatus: string): Promise<Payment | undefined> {
    const payment = this.payments.get(id);
    if (!payment) return undefined;
    
    const updatedPayment = { ...payment, paymentStatus };
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }
  
  // Special operations
  async getGroundRevenue(groundId: number): Promise<{ groundName: string, totalRevenue: number }> {
    const ground = await this.getGround(groundId);
    if (!ground) throw new Error("Ground not found");
    
    let totalRevenue = 0;
    const bookings = await this.getBookingsByGround(groundId);
    
    for (const booking of bookings) {
      const payment = await this.getPaymentByBooking(booking.id);
      if (payment && payment.paymentStatus === "Paid") {
        totalRevenue += Number(payment.amount);
      }
    }
    
    return {
      groundName: ground.name,
      totalRevenue
    };
  }
  
  async getGroundOccupancyRate(groundId: number): Promise<{ groundName: string, occupancyRate: number }> {
    const ground = await this.getGround(groundId);
    if (!ground) throw new Error("Ground not found");
    
    const slots = await this.getSlotsByGround(groundId);
    if (slots.length === 0) {
      return {
        groundName: ground.name,
        occupancyRate: 0
      };
    }
    
    const bookedSlots = slots.filter(slot => slot.availabilityStatus === "Booked").length;
    const occupancyRate = (bookedSlots / slots.length) * 100;
    
    return {
      groundName: ground.name,
      occupancyRate
    };
  }
}

export const storage = new MemStorage();

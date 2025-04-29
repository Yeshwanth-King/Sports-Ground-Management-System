import { pgTable, text, serial, integer, boolean, time, date, decimal, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Sports type enum
export const SportTypes = [
  "Cricket",
  "Football",
  "Basketball",
  "Badminton",
  "Tennis",
  "Volleyball",
  "Swimming",
  "Table Tennis"
] as const;

// Payment methods enum
export const PaymentMethods = [
  "Card",
  "Cash",
  "Online"
] as const;

// Payment status enum
export const PaymentStatuses = [
  "Paid",
  "Pending",
  "Failed"
] as const;

// Booking status enum
export const BookingStatuses = [
  "Confirmed",
  "Cancelled",
  "Completed"
] as const;

// Slot availability status enum
export const SlotAvailabilityStatuses = [
  "Available",
  "Booked"
] as const;

// Ground table
export const grounds = pgTable("grounds", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  sportType: text("sport_type").notNull().$type<typeof SportTypes[number]>(),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  description: text("description"),
  imageUrl: text("image_url")
});

// Slot table
export const slots = pgTable("slots", {
  id: serial("id").primaryKey(),
  groundId: integer("ground_id").notNull().references(() => grounds.id),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  pricePerSlot: decimal("price_per_slot", { precision: 10, scale: 2 }).notNull(),
  availabilityStatus: text("availability_status").notNull().$type<typeof SlotAvailabilityStatuses[number]>().default("Available")
});

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  phoneNumber: varchar("phone_number", { length: 15 }).notNull(),
  address: text("address").notNull(),
  isAdmin: boolean("is_admin").default(false)
});

// Booking table
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  slotId: integer("slot_id").notNull().references(() => slots.id),
  bookingDate: timestamp("booking_date").notNull().defaultNow(),
  status: text("status").notNull().$type<typeof BookingStatuses[number]>().default("Confirmed")
});

// Payment table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  paymentDate: timestamp("payment_date").notNull().defaultNow(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().$type<typeof PaymentMethods[number]>(),
  paymentStatus: text("payment_status").notNull().$type<typeof PaymentStatuses[number]>().default("Pending")
});

// Create Zod schemas for insertions
export const insertGroundSchema = createInsertSchema(grounds, {
  name: z.string().min(3).max(100),
  location: z.string().min(3).max(200),
  sportType: z.enum(SportTypes),
  description: z.string().optional(),
  imageUrl: z.string().optional()
}).omit({ id: true });

export const insertSlotSchema = createInsertSchema(slots, {
  groundId: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  pricePerSlot: z.string().or(z.number()),
  availabilityStatus: z.enum(SlotAvailabilityStatuses)
}).omit({ id: true });

export const insertUserSchema = createInsertSchema(users, {
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  phoneNumber: z.string().min(10).max(15),
  address: z.string().min(5).max(200)
}).omit({ id: true, isAdmin: true });

export const insertBookingSchema = createInsertSchema(bookings, {
  userId: z.number().positive(),
  slotId: z.number().positive(),
  status: z.enum(BookingStatuses)
}).omit({ id: true, bookingDate: true });

export const insertPaymentSchema = createInsertSchema(payments, {
  bookingId: z.number().positive(),
  amount: z.string().or(z.number()),
  paymentMethod: z.enum(PaymentMethods),
  paymentStatus: z.enum(PaymentStatuses)
}).omit({ id: true, paymentDate: true });

// Login schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

// Types for TypeScript
export type Ground = typeof grounds.$inferSelect;
export type InsertGround = z.infer<typeof insertGroundSchema>;

export type Slot = typeof slots.$inferSelect;
export type InsertSlot = z.infer<typeof insertSlotSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Login = z.infer<typeof loginSchema>;

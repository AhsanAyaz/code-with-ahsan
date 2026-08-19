import { z } from "zod";

export interface ConsultingPackage {
  id: string;
  name: string;
  badge?: string;
  durationMinutes: number;
  priceInCents: number;
  currency: string;
  description: string;
  features: string[];
}

export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";
export type BookingStatus = "pending_payment" | "confirmed" | "cancelled" | "completed";

export interface ConsultingBooking {
  id: string;
  packageId: string;
  packageName: string;
  durationMinutes: number;
  clientName: string;
  clientEmail: string;
  clientNotes?: string;
  githubOrLinkedinUrl?: string;
  startTime: Date | string;
  endTime: Date | string;
  timezone: string;
  amount: number;
  currency: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  calendarEventId?: string | null;
  meetLink?: string | null;
  expiresAt?: Date | string; // 15-minute slot lock expiration for pending_payment
  createdAt: Date | string;
  updatedAt: Date | string;
}

export const CreateCheckoutSchema = z.object({
  packageId: z.string().min(1, "Package is required"),
  startTime: z.string().datetime({ message: "Valid ISO start time required" }),
  endTime: z.string().datetime({ message: "Valid ISO end time required" }),
  timezone: z.string().min(1, "Timezone is required"),
  clientName: z.string().min(2, "Name must be at least 2 characters"),
  clientEmail: z.string().email("Valid email is required"),
  clientNotes: z.string().max(1000).optional(),
  githubOrLinkedinUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export type CreateCheckoutRequest = z.infer<typeof CreateCheckoutSchema>;

export interface ConsultingAvailableSlot {
  start: string; // ISO string
  end: string; // ISO string
}

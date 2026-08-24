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
  reviewEmailSentAt?: Date | string | null;
  reviewId?: string | null;
}

export interface ConsultingReview {
  id: string;
  bookingId: string;
  clientName: string;
  clientEmail: string;
  role?: string; // e.g. "Software Engineer at Kubermatic"
  company?: string;
  avatarUrl?: string;
  linkedinUrl?: string;
  rating: number; // 1 to 5
  headline: string; // e.g. "Invaluable architecture guidance!"
  feedback: string; // Full testimonial
  permissionToFeature: boolean;
  isApproved: boolean;
  packageName: string;
  sessionDate: string;
  createdAt: string;
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

export const SubmitReviewSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  rating: z.number().min(1).max(5),
  headline: z.string().min(3, "Headline must be at least 3 characters").max(120),
  feedback: z.string().min(10, "Feedback must be at least 10 characters").max(2000),
  role: z.string().max(100).optional().or(z.literal("")),
  company: z.string().max(100).optional().or(z.literal("")),
  linkedinUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  avatarUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  permissionToFeature: z.boolean().default(true),
});

export type SubmitReviewRequest = z.infer<typeof SubmitReviewSchema>;

export interface ConsultingAvailableSlot {
  start: string; // ISO string
  end: string; // ISO string
}

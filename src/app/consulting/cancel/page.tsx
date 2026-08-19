"use client";

import Link from "next/link";
import { ArrowLeft, RefreshCw, ShieldAlert } from "lucide-react";

export default function ConsultingCancelPage() {
  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center py-16 px-4">
      <div className="max-w-md w-full bg-base-200/60 backdrop-blur border border-base-300 rounded-3xl p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 bg-warning/20 text-warning rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Booking Not Completed</h1>
          <p className="text-sm text-base-content/70">
            Your checkout was cancelled and no charges were made. The reserved time slot has been
            released back to the calendar.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Link href="/consulting" className="btn btn-primary w-full gap-2">
            <RefreshCw className="w-4 h-4" /> Pick a Different Time / Try Again
          </Link>
          <Link href="/" className="btn btn-ghost btn-sm w-full gap-2">
            <ArrowLeft className="w-4 h-4" /> Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

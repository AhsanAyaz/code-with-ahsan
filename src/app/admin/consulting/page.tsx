"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/contexts/ToastContext";
import { ConsultingSettings } from "@/lib/consulting/config";
import { ConsultingPackage } from "@/types/consulting";
import {
  Calendar,
  Clock,
  DollarSign,
  Save,
  Plus,
  Trash2,
  Settings,
  CheckCircle,
  Video,
  ExternalLink,
} from "lucide-react";

const ADMIN_TOKEN_KEY = "mentorship_admin_token";

const DAYS_OF_WEEK = [
  { dayNum: 1, name: "Monday" },
  { dayNum: 2, name: "Tuesday" },
  { dayNum: 3, name: "Wednesday" },
  { dayNum: 4, name: "Thursday" },
  { dayNum: 5, name: "Friday" },
  { dayNum: 6, name: "Saturday" },
  { dayNum: 0, name: "Sunday" },
];

interface BookingItem {
  id: string;
  packageName: string;
  clientName: string;
  clientEmail: string;
  status: string;
  startTime: string;
  endTime: string;
  amountTotal: number;
  currency: string;
  createdAt: string;
  googleMeetLink: string | null;
}

interface Metrics {
  totalRevenueInCents: number;
  confirmedCount: number;
  totalBookingsCount: number;
}

export default function AdminConsultingPage() {
  const { success, error } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"schedule" | "packages" | "rules" | "bookings">(
    "schedule"
  );

  const [settings, setSettings] = useState<ConsultingSettings | null>(null);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalRevenueInCents: 0,
    confirmedCount: 0,
    totalBookingsCount: 0,
  });

  const getAdminToken = () => {
    return typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAdminToken();
      const res = await fetch("/api/admin/consulting", {
        headers: {
          "x-admin-token": token ?? "",
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load consulting data");
      }

      const data = await res.json();
      setSettings(data.settings);
      setBookings(data.bookings || []);
      setMetrics(
        data.metrics || {
          totalRevenueInCents: 0,
          confirmedCount: 0,
          totalBookingsCount: 0,
        }
      );
    } catch (err) {
      error("Could not load consulting settings");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const token = getAdminToken();
      const res = await fetch("/api/admin/consulting", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token ?? "",
        },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        throw new Error("Failed to save settings");
      }

      const data = await res.json();
      setSettings(data.settings);
      success("Consulting settings and schedule saved successfully!");
    } catch (err) {
      error("Failed to save consulting settings");
    } finally {
      setSaving(false);
    }
  };

  // Schedule management handlers
  const handleToggleDay = (dayNum: number, enabled: boolean) => {
    if (!settings) return;
    const currentSchedule = { ...settings.weeklyAvailability };
    if (enabled) {
      currentSchedule[dayNum] = [{ start: "15:00", end: "17:00" }];
    } else {
      currentSchedule[dayNum] = [];
    }
    setSettings({ ...settings, weeklyAvailability: currentSchedule });
  };

  const handleAddTimeWindow = (dayNum: number) => {
    if (!settings) return;
    const currentSchedule = { ...settings.weeklyAvailability };
    const daySlots = [...(currentSchedule[dayNum] || [])];
    daySlots.push({ start: "10:00", end: "12:00" });
    currentSchedule[dayNum] = daySlots;
    setSettings({ ...settings, weeklyAvailability: currentSchedule });
  };

  const handleRemoveTimeWindow = (dayNum: number, index: number) => {
    if (!settings) return;
    const currentSchedule = { ...settings.weeklyAvailability };
    const daySlots = (currentSchedule[dayNum] || []).filter((_, i) => i !== index);
    currentSchedule[dayNum] = daySlots;
    setSettings({ ...settings, weeklyAvailability: currentSchedule });
  };

  const handleTimeChange = (
    dayNum: number,
    index: number,
    field: "start" | "end",
    value: string
  ) => {
    if (!settings) return;
    const currentSchedule = { ...settings.weeklyAvailability };
    const daySlots = [...(currentSchedule[dayNum] || [])];
    if (daySlots[index]) {
      daySlots[index] = { ...daySlots[index], [field]: value };
      currentSchedule[dayNum] = daySlots;
      setSettings({ ...settings, weeklyAvailability: currentSchedule });
    }
  };

  // Packages management handlers
  const handlePackageChange = (
    index: number,
    field: keyof ConsultingPackage,
    value: string | number
  ) => {
    if (!settings) return;
    const packages = [...settings.packages];
    packages[index] = { ...packages[index], [field]: value };
    setSettings({ ...settings, packages });
  };

  const handleAddPackage = () => {
    if (!settings) return;
    const newPkg: ConsultingPackage = {
      id: `advisory-custom-${Date.now()}`,
      name: "New Consulting Tier",
      durationMinutes: 45,
      priceInCents: 7500,
      currency: "usd",
      description: "Description of the new consultation package.",
      features: ["Personalized guidance", "Actionable feedback"],
    };
    setSettings({ ...settings, packages: [...settings.packages, newPkg] });
  };

  const handleDeletePackage = (index: number) => {
    if (!settings) return;
    const packages = settings.packages.filter((_, i) => i !== index);
    setSettings({ ...settings, packages });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="text-sm text-base-content/70">Loading 1:1 consulting settings...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="alert alert-error">
        <span>Failed to load consulting settings. Please try again.</span>
        <button onClick={fetchData} className="btn btn-sm btn-outline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-base-300 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            1:1 Advisory & Consulting Management
          </h1>
          <p className="text-sm text-base-content/70 mt-1">
            Configure your weekly schedule, package pricing tiers, booking policies, and manage
            client sessions.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary gap-2 shadow-lg hover:shadow-primary/20 shrink-0"
        >
          {saving ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body p-4 flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-base-content/60 font-semibold uppercase tracking-wider">
                Total Revenue
              </div>
              <div className="text-2xl font-black">
                ${(metrics.totalRevenueInCents / 100).toFixed(2)} USD
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body p-4 flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-base-content/60 font-semibold uppercase tracking-wider">
                Confirmed Sessions
              </div>
              <div className="text-2xl font-black">{metrics.confirmedCount}</div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body p-4 flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-info/10 text-info flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-base-content/60 font-semibold uppercase tracking-wider">
                Active Timezone
              </div>
              <div className="text-lg font-bold truncate">{settings.adminTimezone}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-300/60 p-1 w-full sm:w-fit">
        <button
          onClick={() => setActiveTab("schedule")}
          className={`tab gap-2 font-medium ${activeTab === "schedule" ? "tab-active" : ""}`}
        >
          <Calendar className="w-4 h-4" /> Weekly Schedule
        </button>
        <button
          onClick={() => setActiveTab("packages")}
          className={`tab gap-2 font-medium ${activeTab === "packages" ? "tab-active" : ""}`}
        >
          <DollarSign className="w-4 h-4" /> Packages & Pricing
        </button>
        <button
          onClick={() => setActiveTab("rules")}
          className={`tab gap-2 font-medium ${activeTab === "rules" ? "tab-active" : ""}`}
        >
          <Settings className="w-4 h-4" /> Booking Rules
        </button>
        <button
          onClick={() => setActiveTab("bookings")}
          className={`tab gap-2 font-medium ${activeTab === "bookings" ? "tab-active" : ""}`}
        >
          <Clock className="w-4 h-4" /> Recent Bookings ({bookings.length})
        </button>
      </div>

      {/* TAB 1: WEEKLY SCHEDULE */}
      {activeTab === "schedule" && (
        <div className="space-y-6">
          <div className="alert alert-info shadow-sm">
            <span>
              <strong>Note:</strong> Times are configured in your admin timezone (
              <code>{settings.adminTimezone}</code>). When clients visit your page, the site
              automatically subtracts your busy Google Calendar events in real-time.
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {DAYS_OF_WEEK.map(({ dayNum, name }) => {
              const daySlots = settings.weeklyAvailability[dayNum] || [];
              const isEnabled = daySlots.length > 0;

              return (
                <div
                  key={dayNum}
                  className={`card bg-base-100 border transition-all ${
                    isEnabled ? "border-primary/40 shadow-sm" : "border-base-300 opacity-60"
                  }`}
                >
                  <div className="card-body p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) => handleToggleDay(dayNum, e.target.checked)}
                          className="toggle toggle-primary toggle-sm sm:toggle-md"
                        />
                        <div>
                          <h3 className="font-bold text-base sm:text-lg">{name}</h3>
                          <p className="text-xs text-base-content/60">
                            {isEnabled
                              ? `${daySlots.length} active time window${daySlots.length > 1 ? "s" : ""}`
                              : "Closed / Unavailable"}
                          </p>
                        </div>
                      </div>

                      {isEnabled && (
                        <button
                          type="button"
                          onClick={() => handleAddTimeWindow(dayNum)}
                          className="btn btn-ghost btn-xs sm:btn-sm gap-1 text-primary self-start sm:self-auto"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Window
                        </button>
                      )}
                    </div>

                    {/* Time Windows List */}
                    {isEnabled && (
                      <div className="mt-4 pt-4 border-t border-base-200 space-y-3">
                        {daySlots.map((slot, index) => (
                          <div
                            key={index}
                            className="flex flex-wrap items-center gap-3 bg-base-200/50 p-3 rounded-lg"
                          >
                            <span className="text-xs font-semibold text-base-content/60 w-16">
                              Window {index + 1}:
                            </span>

                            <div className="flex items-center gap-2">
                              <label className="text-xs text-base-content/70">Start:</label>
                              <input
                                type="time"
                                value={slot.start}
                                onChange={(e) =>
                                  handleTimeChange(dayNum, index, "start", e.target.value)
                                }
                                className="input input-bordered input-sm font-mono w-28"
                              />
                            </div>

                            <span className="text-base-content/40">to</span>

                            <div className="flex items-center gap-2">
                              <label className="text-xs text-base-content/70">End:</label>
                              <input
                                type="time"
                                value={slot.end}
                                onChange={(e) =>
                                  handleTimeChange(dayNum, index, "end", e.target.value)
                                }
                                className="input input-bordered input-sm font-mono w-28"
                              />
                            </div>

                            {daySlots.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTimeWindow(dayNum, index)}
                                className="btn btn-ghost btn-xs text-error ml-auto"
                                title="Remove time window"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: PACKAGES & PRICING */}
      {activeTab === "packages" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">Consulting Tiers & Pricing</h2>
              <p className="text-xs text-base-content/60">
                Manage the packages displayed on <code>/consulting</code> and the Stripe checkout
                amounts.
              </p>
            </div>
            <button onClick={handleAddPackage} className="btn btn-sm btn-outline btn-primary gap-1">
              <Plus className="w-4 h-4" /> Add Package
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {settings.packages.map((pkg, index) => (
              <div
                key={pkg.id || index}
                className="card bg-base-100 border border-base-300 shadow-sm"
              >
                <div className="card-body p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="badge badge-primary badge-outline font-mono text-xs">
                      ID: {pkg.id}
                    </span>
                    {settings.packages.length > 1 && (
                      <button
                        onClick={() => handleDeletePackage(index)}
                        className="btn btn-ghost btn-xs text-error"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="form-control sm:col-span-2">
                      <label className="label">
                        <span className="label-text font-semibold text-xs">Package Title</span>
                      </label>
                      <input
                        type="text"
                        value={pkg.name}
                        onChange={(e) => handlePackageChange(index, "name", e.target.value)}
                        className="input input-bordered input-sm w-full"
                        placeholder="e.g. 1:1 Mentorship & Career Advisory"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-semibold text-xs">Price ($ USD)</span>
                        </label>
                        <input
                          type="number"
                          value={pkg.priceInCents / 100}
                          onChange={(e) =>
                            handlePackageChange(
                              index,
                              "priceInCents",
                              Math.round(Number(e.target.value) * 100)
                            )
                          }
                          className="input input-bordered input-sm font-mono w-full"
                          min="1"
                        />
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-semibold text-xs">Duration (Mins)</span>
                        </label>
                        <input
                          type="number"
                          value={pkg.durationMinutes}
                          onChange={(e) =>
                            handlePackageChange(index, "durationMinutes", Number(e.target.value))
                          }
                          className="input input-bordered input-sm font-mono w-full"
                          min="15"
                          step="15"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-xs">Description</span>
                    </label>
                    <textarea
                      value={pkg.description}
                      onChange={(e) => handlePackageChange(index, "description", e.target.value)}
                      rows={2}
                      className="textarea textarea-bordered text-sm w-full"
                      placeholder="What is covered in this session..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: BOOKING RULES */}
      {activeTab === "rules" && (
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body p-6 space-y-6">
            <h2 className="text-lg font-bold">Booking Policies & Engine Rules</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold text-xs">Admin Timezone (IANA)</span>
                </label>
                <input
                  type="text"
                  value={settings.adminTimezone}
                  onChange={(e) => setSettings({ ...settings, adminTimezone: e.target.value })}
                  className="input input-bordered input-sm font-mono"
                  placeholder="Europe/Stockholm"
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Weekly schedule start/end hours are interpreted in this timezone.
                  </span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold text-xs">Admin Notification Email</span>
                </label>
                <input
                  type="email"
                  value={settings.adminEmail}
                  onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                  className="input input-bordered input-sm"
                  placeholder="ahsan.ubitian@gmail.com"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold text-xs">
                    Minimum Advance Notice (Hours)
                  </span>
                </label>
                <input
                  type="number"
                  value={settings.minBookingNoticeHours}
                  onChange={(e) =>
                    setSettings({ ...settings, minBookingNoticeHours: Number(e.target.value) })
                  }
                  className="input input-bordered input-sm font-mono"
                  min="0"
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Clients cannot book slots starting sooner than this.
                  </span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold text-xs">
                    Buffer Between Sessions (Minutes)
                  </span>
                </label>
                <input
                  type="number"
                  value={settings.bufferBetweenSessionsMinutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      bufferBetweenSessionsMinutes: Number(e.target.value),
                    })
                  }
                  className="input input-bordered input-sm font-mono"
                  min="0"
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Gap required before & after each confirmed session.
                  </span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold text-xs">
                    Max Advance Booking (Days)
                  </span>
                </label>
                <input
                  type="number"
                  value={settings.maxBookingDaysInAdvance}
                  onChange={(e) =>
                    setSettings({ ...settings, maxBookingDaysInAdvance: Number(e.target.value) })
                  }
                  className="input input-bordered input-sm font-mono"
                  min="1"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold text-xs">
                    Slot Hold Window on Checkout (Minutes)
                  </span>
                </label>
                <input
                  type="number"
                  value={settings.slotLockExpirationMinutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      slotLockExpirationMinutes: Number(e.target.value),
                    })
                  }
                  className="input input-bordered input-sm font-mono"
                  min="5"
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Holds the slot while the client is on the Stripe checkout page.
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: RECENT BOOKINGS */}
      {activeTab === "bookings" && (
        <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-base-200 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">Consulting Bookings History</h2>
              <p className="text-xs text-base-content/60">
                View completed payments, upcoming client consultations, and Google Meet links.
              </p>
            </div>
          </div>

          {bookings.length === 0 ? (
            <div className="p-8 text-center text-sm text-base-content/60">
              No consulting bookings found yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full text-sm">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Package</th>
                    <th>Date & Time</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Meeting Link</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <div className="font-bold">{b.clientName}</div>
                        <div className="text-xs text-base-content/60">{b.clientEmail}</div>
                      </td>
                      <td>
                        <span className="font-medium">{b.packageName}</span>
                      </td>
                      <td>
                        <div className="font-mono text-xs">
                          {b.startTime ? new Date(b.startTime).toLocaleDateString() : "-"}
                        </div>
                        <div className="font-mono text-xs text-base-content/60">
                          {b.startTime
                            ? new Date(b.startTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </div>
                      </td>
                      <td className="font-bold font-mono">
                        ${((b.amountTotal || 0) / 100).toFixed(2)}
                      </td>
                      <td>
                        <span
                          className={`badge badge-sm font-semibold ${
                            b.status === "confirmed"
                              ? "badge-success text-white"
                              : b.status === "pending_payment"
                                ? "badge-warning"
                                : "badge-ghost"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td>
                        {b.googleMeetLink ? (
                          <a
                            href={b.googleMeetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-xs btn-outline btn-primary gap-1"
                          >
                            <Video className="w-3 h-3" /> Meet{" "}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="text-xs text-base-content/40">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

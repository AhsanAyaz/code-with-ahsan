"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import {
  SESSION_TEMPLATES,
  SessionTemplate,
  generateGoogleCalendarUrl,
} from "@/lib/mentorship-templates";

interface Session {
  id: string;
  scheduledAt: string;
  duration: number;
  agenda: string;
  templateId?: string;
  notes: string;
  rating?: number;
  feedback?: string;
}

interface SessionSchedulerProps {
  matchId: string;
  currentUserId: string;
  isMentor: boolean;
  menteeEmail?: string;
}

export default function SessionScheduler({
  matchId,
  currentUserId,
  isMentor,
  menteeEmail,
}: SessionSchedulerProps) {
  const toast = useToast();
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzAbbreviation = new Date().toLocaleTimeString("en-US", { timeZoneName: "short" }).split(" ").pop() || "";
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<SessionTemplate | null>(null);
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    duration: 30,
    agenda: "",
    templateId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [ratingSession, setRatingSession] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch(
          `/api/mentorship/scheduled-sessions?sessionId=${matchId}`
        );
        if (response.ok) {
          const data = await response.json();
          setSessions(data.sessions || []);
        }
      } catch (error) {
        console.error("Error fetching sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [matchId]);

  const handleTemplateSelect = (template: SessionTemplate) => {
    setSelectedTemplate(template);
    setFormData((prev) => ({
      ...prev,
      duration: template.durationMinutes,
      agenda: template.agenda.join("\n• "),
      templateId: template.id,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.time || submitting) return;

    setSubmitting(true);
    try {
      const scheduledAt = new Date(
        `${formData.date}T${formData.time}`
      ).toISOString();

      const response = await fetch("/api/mentorship/scheduled-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: matchId,
          scheduledAt,
          duration: formData.duration,
          agenda: formData.agenda,
          templateId: formData.templateId || null,
          mentorTimezone: userTimezone,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSessions((prev) =>
          [...prev, data.scheduledSession].sort(
            (a, b) =>
              new Date(a.scheduledAt).getTime() -
              new Date(b.scheduledAt).getTime()
          )
        );
        setFormData({
          date: "",
          time: "",
          duration: 30,
          agenda: "",
          templateId: "",
        });
        setSelectedTemplate(null);
        setShowForm(false);
      }
    } catch (error) {
      console.error("Error scheduling session:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const submitRating = async (scheduledSessionId: string) => {
    try {
      const response = await fetch("/api/mentorship/scheduled-sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledSessionId, rating, feedback }),
      });

      if (response.ok) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === scheduledSessionId ? { ...s, rating, feedback } : s
          )
        );
        setRatingSession(null);
        setRating(5);
        setFeedback("");
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
    }
  };

  const openGoogleCalendar = (session: Session) => {
    const template = SESSION_TEMPLATES.find((t) => t.id === session.templateId);
    const title = template
      ? `Mentorship: ${template.title}`
      : "Mentorship Session";

    const url = generateGoogleCalendarUrl({
      title,
      description: session.agenda || "Mentorship session",
      startTime: new Date(session.scheduledAt),
      durationMinutes: session.duration,
      attendeeEmail: menteeEmail,
    });

    window.open(url, "_blank");
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this session?")) return;

    try {
      const response = await fetch(
        `/api/mentorship/scheduled-sessions?scheduledSessionId=${sessionId}&mentorId=${currentUserId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete session");
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  const upcomingSessions = sessions.filter(
    (s) => new Date(s.scheduledAt) > new Date()
  );
  const pastSessions = sessions.filter(
    (s) => new Date(s.scheduledAt) <= new Date()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold">Session Scheduler</h3>
          <p className="text-sm text-base-content/60">
            Plan and track your mentorship meetings
          </p>
        </div>
        {isMentor && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "✕ Cancel" : "+ Schedule Session"}
          </button>
        )}
      </div>

      {/* Schedule Form - Mentor Only */}
      {showForm && isMentor && (
        <div className="card bg-base-200 p-4 space-y-4">
          {/* Template Selection */}
          <div>
            <label className="label">
              <span className="label-text font-semibold">
                Choose a Template (Optional)
              </span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {SESSION_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleTemplateSelect(template)}
                  className={`btn btn-sm justify-start gap-2 ${
                    selectedTemplate?.id === template.id
                      ? "btn-primary"
                      : "btn-outline"
                  }`}
                >
                  <span>{template.icon}</span>
                  <span className="truncate">{template.title}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Date *</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, date: e.target.value }))
                  }
                  required
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Time * <span className="font-normal text-base-content/60">({tzAbbreviation})</span></span>
                </label>
                <input
                  type="time"
                  className="input input-bordered w-full"
                  value={formData.time}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, time: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">
                  Duration: {formData.duration} mins
                </span>
              </label>
              <input
                type="range"
                min={15}
                max={90}
                step={15}
                value={formData.duration}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    duration: Number(e.target.value),
                  }))
                }
                className="range range-primary w-full"
              />
              <div className="w-full flex justify-between text-xs px-2 mt-1">
                <span>15</span>
                <span>30</span>
                <span>45</span>
                <span>60</span>
                <span>75</span>
                <span>90</span>
              </div>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Agenda</span>
              </label>
              <textarea
                placeholder="What will you discuss?"
                className="textarea textarea-bordered w-full h-24"
                value={formData.agenda}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, agenda: e.target.value }))
                }
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={submitting}
            >
              {submitting ? "Scheduling..." : "Schedule Session"}
            </button>
          </form>
        </div>
      )}

      {/* Mentee note */}
      {!isMentor && upcomingSessions.length === 0 && (
        <div className="alert alert-info">
          <span>
            Your mentor will schedule sessions. You&apos;ll see them here once
            scheduled.
          </span>
        </div>
      )}

      {/* Upcoming Sessions */}
      <div>
        <h4 className="text-sm font-semibold text-base-content/60 mb-3">
          🗓️ Upcoming ({upcomingSessions.length})
        </h4>
        {upcomingSessions.length === 0 ? (
          <div className="card bg-base-100 p-4 text-center text-base-content/60">
            No upcoming sessions scheduled.
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingSessions.map((session) => {
              const template = SESSION_TEMPLATES.find(
                (t) => t.id === session.templateId
              );
              return (
                <div key={session.id} className="card bg-base-100 shadow">
                  <div className="card-body p-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center bg-primary/10 rounded-lg p-3 min-w-[70px]">
                        <div className="text-xs text-primary font-semibold">
                          {new Date(session.scheduledAt).toLocaleDateString(
                            "en-US",
                            { month: "short" }
                          )}
                        </div>
                        <div className="text-2xl font-bold text-primary">
                          {new Date(session.scheduledAt).getDate()}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold flex items-center gap-2">
                          {template && <span>{template.icon}</span>}
                          {template?.title || "Session"}
                          <span className="badge badge-ghost badge-sm">
                            {session.duration} min
                          </span>
                        </div>
                        <div className="text-sm text-base-content/70">
                          {new Date(session.scheduledAt).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </div>
                      </div>
                      {/* Google Calendar Button - Mentor Only */}
                      {isMentor && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => openGoogleCalendar(session)}
                            className="btn btn-sm btn-outline gap-1"
                            title="Add to Google Calendar with Meet link"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" />
                            </svg>
                            Calendar
                          </button>
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className="btn btn-sm btn-ghost text-error"
                            title="Delete session"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Sessions */}
      {pastSessions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-base-content/60 mb-3">
            📝 Past Sessions ({pastSessions.length})
          </h4>
          <div className="space-y-2">
            {pastSessions.slice(0, 5).map((session) => (
              <div key={session.id} className="card bg-base-100/50 shadow-sm">
                <div className="card-body p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm">
                        {new Date(session.scheduledAt).toLocaleDateString()} at{" "}
                        {new Date(session.scheduledAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {session.rating && (
                        <span className="ml-2">
                          {"★".repeat(session.rating)}
                          {"☆".repeat(5 - session.rating)}
                        </span>
                      )}
                    </div>
                    {!session.rating && (
                      <div className="flex gap-1">
                        <button
                          className="btn btn-xs btn-outline"
                          onClick={() => setRatingSession(session.id)}
                        >
                          Rate Session
                        </button>
                        {isMentor && (
                          <button
                            className="btn btn-xs btn-ghost text-error"
                            onClick={() => handleDeleteSession(session.id)}
                            title="Delete session"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    )}
                    {session.rating && isMentor && (
                      <button
                        className="btn btn-xs btn-ghost text-error"
                        onClick={() => handleDeleteSession(session.id)}
                        title="Delete session"
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                  {/* Rating Form */}
                  {ratingSession === session.id && (
                    <div className="mt-3 p-3 bg-base-200 rounded-lg">
                      <div className="rating rating-lg">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <input
                            key={n}
                            type="radio"
                            name={`rating-${session.id}`}
                            className="mask mask-star-2 bg-warning"
                            checked={rating === n}
                            onChange={() => setRating(n)}
                          />
                        ))}
                      </div>
                      <textarea
                        placeholder="Optional feedback..."
                        className="textarea textarea-bordered w-full mt-2 text-sm"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          className="btn btn-primary btn-sm flex-1"
                          onClick={() => submitRating(session.id)}
                        >
                          Submit
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setRatingSession(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

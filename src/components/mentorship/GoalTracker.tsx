"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";

interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  status: "in-progress" | "completed" | "overdue";
  createdBy: string;
}

interface GoalTrackerProps {
  matchId: string;
  currentUserId: string;
  isMentor: boolean;
}

export default function GoalTracker({
  matchId,
  currentUserId,
  isMentor,
}: GoalTrackerProps) {
  const toast = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    targetDate: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const response = await fetch(
          `/api/mentorship/goals?matchId=${matchId}`
        );
        if (response.ok) {
          const data = await response.json();
          setGoals(data.goals || []);
        }
      } catch (error) {
        console.error("Error fetching goals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [matchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/mentorship/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          createdBy: currentUserId,
          ...formData,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGoals((prev) => [...prev, data.goal]);
        setFormData({ title: "", description: "", targetDate: "" });
        setShowForm(false);
      }
    } catch (error) {
      console.error("Error creating goal:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleGoalStatus = async (goalId: string, currentStatus: string) => {
    const newStatus =
      currentStatus === "completed" ? "in-progress" : "completed";

    try {
      const response = await fetch("/api/mentorship/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId, status: newStatus, matchId }),
      });

      if (response.ok) {
        setGoals((prev) =>
          prev.map((g) =>
            g.id === goalId ? { ...g, status: newStatus as Goal["status"] } : g
          )
        );
      }
    } catch (error) {
      console.error("Error updating goal:", error);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;

    try {
      const response = await fetch(
        `/api/mentorship/goals?goalId=${goalId}&mentorId=${currentUserId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setGoals((prev) => prev.filter((g) => g.id !== goalId));
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete goal");
      }
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  const inProgressGoals = goals.filter((g) => g.status === "in-progress");
  const completedGoals = goals.filter((g) => g.status === "completed");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold">SMART Goals</h3>
          <p className="text-sm text-base-content/60">
            Track your mentorship objectives
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "✕ Cancel" : "+ Add Goal"}
        </button>
      </div>

      {/* Add Goal Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card bg-base-200 p-4">
          <div className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Goal Title *</span>
              </label>
              <input
                type="text"
                placeholder='e.g., "Complete a React project"'
                className="input input-bordered"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Description</span>
              </label>
              <textarea
                placeholder="Describe what success looks like..."
                className="textarea textarea-bordered"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Target Date</span>
              </label>
              <input
                type="date"
                className="input input-bordered"
                value={formData.targetDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    targetDate: e.target.value,
                  }))
                }
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Create Goal"}
            </button>
          </div>
        </form>
      )}

      {/* In Progress Goals */}
      <div>
        <h4 className="text-sm font-semibold text-base-content/60 mb-3 flex items-center gap-2">
          <span className="badge badge-warning badge-sm">In Progress</span>
          {inProgressGoals.length} goals
        </h4>
        {inProgressGoals.length === 0 ? (
          <div className="card bg-base-100 p-4 text-center text-base-content/60">
            No active goals. Create one to get started!
          </div>
        ) : (
          <div className="space-y-3">
            {inProgressGoals.map((goal) => (
              <div key={goal.id} className="card bg-base-100 shadow">
                <div className="card-body p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-success mt-1"
                      checked={false}
                      onChange={() => toggleGoalStatus(goal.id, goal.status)}
                    />
                    <div className="flex-1">
                      <h5 className="font-semibold">{goal.title}</h5>
                      {goal.description && (
                        <p className="text-sm text-base-content/70 mt-1">
                          {goal.description}
                        </p>
                      )}
                      {goal.targetDate && (
                        <div className="text-xs text-base-content/50 mt-2">
                          Target:{" "}
                          {new Date(goal.targetDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    {isMentor && (
                      <button
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => handleDeleteGoal(goal.id)}
                        title="Delete goal"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-base-content/60 mb-3 flex items-center gap-2">
            <span className="badge badge-success badge-sm">Completed</span>
            {completedGoals.length} goals
          </h4>
          <div className="space-y-2">
            {completedGoals.map((goal) => (
              <div key={goal.id} className="card bg-base-100/50 shadow-sm">
                <div className="card-body p-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-success"
                      checked={true}
                      onChange={() => toggleGoalStatus(goal.id, goal.status)}
                    />
                    <span className="line-through text-base-content/50 flex-1">
                      {goal.title}
                    </span>
                    {isMentor && (
                      <button
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => handleDeleteGoal(goal.id)}
                        title="Delete goal"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

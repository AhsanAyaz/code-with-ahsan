"use client";

import { useState, useRef, useEffect } from "react";
import Button from "../Button";

interface BookInterestModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
}

export default function BookInterestModal({
  isOpen,
  onClose,
  bookTitle,
}: BookInterestModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/book-interest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          source: "website-book-card",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setStatus("success");
      setTimeout(() => {
        onClose();
        setStatus("idle");
        setFormData({ name: "", email: "" });
      }, 3000);
    } catch (error: any) {
      console.error(error);
      setStatus("error");
      setErrorMessage(error.message);
    }
  };

  const handleDialogClose = () => {
    onClose();
  };

  return (
    <dialog ref={dialogRef} className="modal" onClose={handleDialogClose}>
      <div className="modal-box">
        <button
          onClick={onClose}
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        >
          ✕
        </button>
        <h3 className="font-bold text-lg mb-4 text-center">
          Get notified when {bookTitle} launches! 🚀
        </h3>

        {status === "success" ? (
          <div className="text-center py-8 text-green-500">
            <p className="text-xl font-bold">You're on the list! 🎉</p>
            <p className="text-sm mt-2">
              We'll let you know as soon as it's ready.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Name</span>
              </label>
              <input
                type="text"
                placeholder="Your Name"
                className="input input-bordered w-full"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                className="input input-bordered w-full"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            {status === "error" && (
              <p className="text-red-500 text-sm text-center">{errorMessage}</p>
            )}

            <div className="mt-4">
              <Button
                type="submit"
                color="primary"
                className="w-full"
                disabled={status === "loading"}
              >
                {status === "loading" ? "Joining..." : "Join the Waitlist"}
              </Button>
            </div>
          </form>
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}

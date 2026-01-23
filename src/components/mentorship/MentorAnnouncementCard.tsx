"use client";

import { useState, useEffect } from "react";
import { useMentorship } from "@/contexts/MentorshipContext";
import { useToast } from "@/contexts/ToastContext";

interface MentorAnnouncementCardProps {
  userId: string;
  userName: string;
  userPhotoURL: string;
  announcementUrl?: string; // from profile
}

export default function MentorAnnouncementCard({
  userId,
  userName,
  userPhotoURL,
  announcementUrl: initialAnnouncementUrl,
}: MentorAnnouncementCardProps) {
  const [announcementImage, setAnnouncementImage] = useState<string | null>(
    initialAnnouncementUrl || null,
  );

  useEffect(() => {
    setAnnouncementImage(initialAnnouncementUrl || null);
  }, [initialAnnouncementUrl]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const toast = useToast();
  const { refreshProfile } = useMentorship();

  const generateImage = async (regenerate = false) => {
    setLoading(true);
    try {
      if (regenerate && announcementImage) {
        // Delete existing
        await fetch(`/api/mentorship/announcement-image/mentor?uid=${userId}`, {
          method: "DELETE",
        });
      }

      const response = await fetch(
        "/api/mentorship/announcement-image/mentor",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: userId,
            name: userName,
            photoURL: userPhotoURL,
          }),
        },
      );

      const data = await response.json();

      if (data.success && data.announcementImageUrl) {
        setAnnouncementImage(data.announcementImageUrl);
        toast.success("Announcement image generated!");
        setShowModal(true);
        refreshProfile(); // Update context
      } else {
        toast.error("Failed to generate image.");
      }
    } catch (error) {
      console.error("Error generating mentor announcement:", error);
      toast.error("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const shareText = `I'm excited to announce that I'm a mentor in the Mentorship Program! 🚀 Check out my profile! #Mentorship #Coding`;
  const shareUrl = typeof window !== "undefined" ? window.location.href : ""; // Ideally this should be their public profile URL

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shareText,
    )}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank");
  };

  const shareToLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      shareUrl,
    )}`;
    window.open(url, "_blank");
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      shareUrl,
    )}`;
    window.open(url, "_blank");
  };

  return (
    <>
      <div className="card bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">
            <span className="text-2xl">📣</span> Share Your Mentor Status
          </h3>
          <p className="text-base-content/70 text-sm">
            Let everyone know you are open to mentorship! Generate a custom
            announcement card to share on social media.
          </p>

          {announcementImage ? (
            <div className="space-y-4 mt-4">
              <div className="flex justify-center">
                <img
                  src={announcementImage}
                  alt="Mentor Announcement"
                  className="max-w-full max-h-48 rounded-lg shadow cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setShowModal(true)}
                />
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowModal(true)}
                >
                  View & Share
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => generateImage(true)}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Regenerating...
                    </>
                  ) : (
                    "Regenerate Image"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="card-actions mt-4 justify-end">
              <button
                className="btn btn-primary"
                onClick={() => generateImage(false)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Generating...
                  </>
                ) : (
                  "Generate Announcement Card"
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && announcementImage && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4 text-center">
              🎉 Your Mentor Announcement Card
            </h3>
            <div className="flex justify-center bg-base-200 p-4 rounded-lg">
              <img
                src={announcementImage}
                alt="Mentor Announcement"
                className="max-w-full rounded shadow-lg"
              />
            </div>

            <div className="mt-6">
              <p className="text-sm text-base-content/70 mb-3 text-center">
                Share this on your social media to attract mentees!
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  className="btn btn-info gap-2 text-white"
                  onClick={shareToTwitter}
                >
                  Share on X
                </button>
                <button
                  className="btn btn-primary gap-2"
                  onClick={shareToLinkedIn}
                >
                  Share on LinkedIn
                </button>
                <button
                  className="btn gap-2 bg-[#1877F2] text-white hover:bg-[#166fe5] border-none"
                  onClick={shareToFacebook}
                >
                  Share on Facebook
                </button>
              </div>
              {/* Download Link */}
              <div className="mt-4 text-center">
                <a
                  href={announcementImage}
                  download="mentor-announcement.png"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-primary text-sm"
                >
                  Download Image
                </a>
              </div>
            </div>

            <div className="modal-action justify-center">
              <button className="btn" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => setShowModal(false)}
          ></div>
        </dialog>
      )}
    </>
  );
}

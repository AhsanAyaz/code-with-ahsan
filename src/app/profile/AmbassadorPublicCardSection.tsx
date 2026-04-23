"use client";
import { useEffect, useMemo, useState } from "react";
import { useMentorship } from "@/contexts/MentorshipContext";
import { useToast } from "@/contexts/ToastContext";
import { authFetch } from "@/lib/apiClient";
import { classifyVideoUrl, isValidVideoUrl } from "@/lib/ambassador/videoUrl";
import VideoEmbed from "@/app/admin/ambassadors/[applicationId]/VideoEmbed";
import type { VideoEmbedType } from "@/types/ambassador";

type PublicFieldsState = {
  university: string;
  city: string;
  publicTagline: string;
  twitterUrl: string;
  githubUrl: string;
  personalSiteUrl: string;
  cohortPresentationVideoUrl: string;
};

const EMPTY: PublicFieldsState = {
  university: "",
  city: "",
  publicTagline: "",
  twitterUrl: "",
  githubUrl: "",
  personalSiteUrl: "",
  cohortPresentationVideoUrl: "",
};

export default function AmbassadorPublicCardSection() {
  const { user } = useMentorship();
  const toast = useToast();

  const [loaded, setLoaded] = useState(false);
  const [initial, setInitial] = useState<PublicFieldsState>(EMPTY);
  const [form, setForm] = useState<PublicFieldsState>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // authFetch auto-retries 401/403 once with a force-refreshed token,
        // which covers both the newly-accepted-ambassador claims race and
        // dev-emulator token staleness after a server restart.
        const res = await authFetch("/api/ambassador/profile");
        if (!res.ok) {
          setLoaded(true);
          return;
        }
        const body = (await res.json()) as Partial<PublicFieldsState>;
        const hydrated: PublicFieldsState = { ...EMPTY, ...body };
        setInitial(hydrated);
        setForm(hydrated);
      } finally {
        setLoaded(true);
      }
    })();
  }, [user]);

  // Derived video preview
  const videoType: VideoEmbedType = useMemo(
    () => classifyVideoUrl(form.cohortPresentationVideoUrl),
    [form.cohortPresentationVideoUrl]
  );
  const videoPreviewable =
    form.cohortPresentationVideoUrl.trim().length > 0 &&
    isValidVideoUrl(form.cohortPresentationVideoUrl) &&
    videoType !== "unknown";

  const dirty = useMemo(
    () =>
      (Object.keys(initial) as (keyof PublicFieldsState)[]).some(
        (k) => initial[k] !== form[k]
      ),
    [initial, form]
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    try {
      // Send every field that differs from the baseline — empty strings
      // are meaningful to the server (they trigger FieldValue.delete()).
      const payload: Partial<PublicFieldsState> = {};
      (Object.keys(initial) as (keyof PublicFieldsState)[]).forEach((k) => {
        if (initial[k] !== form[k]) payload[k] = form[k];
      });

      const res = await authFetch("/api/ambassador/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        toast.error(error ?? "Could not save your public card");
        return;
      }

      const body = (await res.json()) as Partial<PublicFieldsState>;
      const hydrated: PublicFieldsState = { ...EMPTY, ...body };
      setInitial(hydrated);
      setForm(hydrated);
      toast.success("Public card updated");
    } catch {
      toast.error("Network error — try again");
    } finally {
      setSaving(false);
    }
  }

  // Loader skeleton — avoids flash of empty form.
  if (!loaded) return null;

  const update =
    (k: keyof PublicFieldsState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body gap-4">
        <h3 className="card-title">Ambassador Public Card</h3>
        <p className="text-sm text-base-content/70">
          This is what people see on your public ambassador card and on
          the public /ambassadors page. Only fill in what you want to share.
        </p>

        <div className="divider my-0"></div>

        <form onSubmit={(e) => { e.preventDefault(); void save(e); }} className="space-y-4">
          {/* university + city */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="label" htmlFor="ap-university">
                <span className="label-text font-semibold">University</span>
              </label>
              <input
                id="ap-university"
                type="text"
                maxLength={120}
                className="input input-bordered"
                value={form.university}
                onChange={update("university")}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="label" htmlFor="ap-city">
                <span className="label-text font-semibold">City</span>
              </label>
              <input
                id="ap-city"
                type="text"
                maxLength={120}
                className="input input-bordered"
                value={form.city}
                onChange={update("city")}
              />
            </div>
          </div>

          {/* publicTagline */}
          <div className="flex flex-col gap-1">
            <label className="label" htmlFor="ap-tagline">
              <span className="label-text font-semibold">
                Public tagline
              </span>
            </label>
            <textarea
              id="ap-tagline"
              rows={2}
              maxLength={120}
              className="textarea textarea-bordered"
              value={form.publicTagline}
              onChange={update("publicTagline")}
              placeholder="A one-line intro people see on your public card"
            />
            <label className="label">
              <span className="label-text-alt text-base-content/60">
                {form.publicTagline.length} / 120
              </span>
            </label>
          </div>

          {/* social links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="label" htmlFor="ap-twitter">
                <span className="label-text font-semibold">Twitter URL</span>
              </label>
              <input
                id="ap-twitter"
                type="url"
                className="input input-bordered"
                value={form.twitterUrl}
                onChange={update("twitterUrl")}
                placeholder="https://twitter.com/you"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="label" htmlFor="ap-github">
                <span className="label-text font-semibold">GitHub URL</span>
              </label>
              <input
                id="ap-github"
                type="url"
                className="input input-bordered"
                value={form.githubUrl}
                onChange={update("githubUrl")}
                placeholder="https://github.com/you"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="label" htmlFor="ap-site">
                <span className="label-text font-semibold">
                  Personal site
                </span>
              </label>
              <input
                id="ap-site"
                type="url"
                className="input input-bordered"
                value={form.personalSiteUrl}
                onChange={update("personalSiteUrl")}
                placeholder="https://yourname.dev"
              />
            </div>
          </div>

          {/* cohort presentation video */}
          <div className="flex flex-col gap-1">
            <label className="label" htmlFor="ap-video">
              <span className="label-text font-semibold">
                Cohort presentation video URL
              </span>
              <span className="label-text-alt text-base-content/60">
                YouTube · Loom · Google Drive
              </span>
            </label>
            <input
              id="ap-video"
              type="url"
              className="input input-bordered"
              value={form.cohortPresentationVideoUrl}
              onChange={update("cohortPresentationVideoUrl")}
              placeholder="https://..."
            />
            {videoPreviewable && (
              <div className="mt-3 border border-base-300 rounded-lg overflow-hidden">
                <VideoEmbed
                  videoUrl={form.cohortPresentationVideoUrl}
                  videoEmbedType={videoType}
                />
              </div>
            )}
          </div>

          <div className="card-actions justify-end pt-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!dirty || saving}
            >
              {saving && (
                <span className="loading loading-spinner loading-sm mr-2" />
              )}
              {saving ? "Saving..." : "Save public card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

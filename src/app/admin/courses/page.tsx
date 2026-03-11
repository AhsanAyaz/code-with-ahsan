"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/contexts/ToastContext";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";

interface CoursePost {
  title: string;
  timestampSeconds: number;
}

interface Course {
  slug: string;
  name: string;
  description: string;
  chapters: number;
  posts: number;
  publishedAt: string | null;
  visibilityOrder: number;
  isVisible: boolean;
}

interface YouTubeVideoData {
  title: string;
  description: string;
  thumbnail: string;
  chapters: CoursePost[];
}

interface PlaylistItem {
  videoId: string;
  title: string;
  position: number;
}

interface YouTubePlaylistData {
  items: PlaylistItem[];
  thumbnail?: string | null;
}

type InputMode = "video" | "playlist";
type FetchedData = YouTubeVideoData | YouTubePlaylistData | null;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function isVideoData(data: FetchedData): data is YouTubeVideoData {
  return data !== null && "chapters" in data;
}

function isPlaylistData(data: FetchedData): data is YouTubePlaylistData {
  return data !== null && "items" in data;
}

export default function AdminCoursesPage() {
  const toast = useToast();

  // Course list state
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);

  // Form state
  const [inputMode, setInputMode] = useState<InputMode>("video");
  const [youtubeId, setYoutubeId] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchedData, setFetchedData] = useState<FetchedData>(null);

  // Editable form fields after fetch
  const [courseName, setCourseName] = useState("");
  const [courseSlug, setCourseSlug] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [editableChapters, setEditableChapters] = useState<CoursePost[]>([]);

  // Create state
  const [creating, setCreating] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);

  const getAdminHeaders = (): Record<string, string> => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    const headers: Record<string, string> = {};
    if (token) headers["x-admin-token"] = token;
    return headers;
  };

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/courses", {
        headers: getAdminHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
        setOrderChanged(false);
      } else {
        toast.error("Failed to load courses");
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleDelete = async (course: Course) => {
    const confirmed = window.confirm(
      `Delete course "${course.name}"? This removes all MDX files.`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/courses/${course.slug}`, {
        method: "DELETE",
        headers: getAdminHeaders(),
      });

      if (response.ok) {
        toast.success(`Course "${course.name}" deleted`);
        await fetchCourses();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete course");
      }
    } catch (error) {
      console.error("Error deleting course:", error);
      toast.error("Failed to delete course");
    }
  };

  const handleToggleVisibility = async (course: Course) => {
    const newVisible = !course.isVisible;
    try {
      const response = await fetch(`/api/admin/courses/${course.slug}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(),
        },
        body: JSON.stringify({ isVisible: newVisible }),
      });

      if (response.ok) {
        setCourses((prev) =>
          prev.map((c) =>
            c.slug === course.slug ? { ...c, isVisible: newVisible } : c
          )
        );
        toast.success(
          newVisible
            ? `"${course.name}" is now visible`
            : `"${course.name}" is now hidden`
        );
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to toggle visibility");
      }
    } catch (error) {
      console.error("Error toggling visibility:", error);
      toast.error("Failed to toggle visibility");
    }
  };

  const moveCourse = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= courses.length) return;

    const updated = [...courses];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setCourses(updated);
    setOrderChanged(true);
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      const orderedSlugs = courses.map((c) => c.slug);
      const response = await fetch("/api/admin/courses", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(),
        },
        body: JSON.stringify({ orderedSlugs }),
      });

      if (response.ok) {
        toast.success("Course order saved");
        setOrderChanged(false);
        await fetchCourses();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to save order");
      }
    } catch (error) {
      console.error("Error saving order:", error);
      toast.error("Failed to save order");
    } finally {
      setSaving(false);
    }
  };

  const handleFetch = async () => {
    if (!youtubeId.trim()) {
      toast.error("Please enter a YouTube ID");
      return;
    }

    setFetching(true);
    setFetchedData(null);
    setCourseName("");
    setCourseSlug("");
    setCourseDescription("");
    setEditableChapters([]);

    try {
      const param = inputMode === "video" ? "videoId" : "playlistId";
      const response = await fetch(
        `/api/admin/courses/youtube?${param}=${encodeURIComponent(youtubeId.trim())}`,
        { headers: getAdminHeaders() }
      );

      if (response.ok) {
        const data = await response.json();
        setFetchedData(data);

        if (inputMode === "video" && data.title) {
          setCourseName(data.title);
          setCourseSlug(generateSlug(data.title));
          setCourseDescription(data.description?.split("\n")[0] || "");
          setEditableChapters(data.chapters || []);
        } else if (inputMode === "playlist" && data.items?.length) {
          const firstTitle = data.items[0]?.title || "";
          setCourseName(firstTitle);
          setCourseSlug(generateSlug(firstTitle));
        }
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to fetch YouTube data");
      }
    } catch (error) {
      console.error("Error fetching YouTube data:", error);
      toast.error("Failed to fetch YouTube data");
    } finally {
      setFetching(false);
    }
  };

  const handleNameChange = (value: string) => {
    setCourseName(value);
    setCourseSlug(generateSlug(value));
  };

  const handleChapterTitleChange = (index: number, title: string) => {
    setEditableChapters((prev) =>
      prev.map((ch, i) => (i === index ? { ...ch, title } : ch))
    );
  };

  const handleGenerateDescription = async () => {
    if (!courseName) {
      toast.error("Course name is required to generate description");
      return;
    }

    setGeneratingDesc(true);
    try {
      const chapters = editableChapters.length > 0
        ? editableChapters.map((ch) => ch.title)
        : isPlaylistData(fetchedData)
          ? fetchedData.items.map((item) => item.title)
          : [];

      const response = await fetch("/api/admin/courses/generate-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(),
        },
        body: JSON.stringify({ courseName, chapters }),
      });

      if (response.ok) {
        const data = await response.json();
        setCourseDescription(data.description);
        toast.success("Description generated");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to generate description");
      }
    } catch (error) {
      console.error("Error generating description:", error);
      toast.error("Failed to generate description");
    } finally {
      setGeneratingDesc(false);
    }
  };

  const handleCreate = async () => {
    if (!courseSlug || !courseName) {
      toast.error("Course name and slug are required");
      return;
    }

    setCreating(true);
    try {
      let body: Record<string, unknown>;

      if (inputMode === "video" && isVideoData(fetchedData)) {
        body = {
          slug: courseSlug,
          name: courseName,
          description: courseDescription,
          outline: courseDescription,
          videoId: youtubeId.trim(),
          chapters: editableChapters,
          thumbnail: fetchedData.thumbnail || undefined,
        };
      } else if (inputMode === "playlist" && isPlaylistData(fetchedData)) {
        const chapters = fetchedData.items.map((item) => ({
          title: item.title,
          timestampSeconds: 0,
          videoId: item.videoId,
        }));
        body = {
          slug: courseSlug,
          name: courseName,
          description: courseDescription,
          outline: courseDescription,
          videoId: fetchedData.items[0]?.videoId || youtubeId.trim(),
          chapters,
          thumbnail: fetchedData.thumbnail || undefined,
        };
      } else {
        toast.error("No YouTube data fetched. Please fetch first.");
        return;
      }

      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(),
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success("Course created!");
        setYoutubeId("");
        setFetchedData(null);
        setCourseName("");
        setCourseSlug("");
        setCourseDescription("");
        setEditableChapters([]);
        await fetchCourses();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to create course");
      }
    } catch (error) {
      console.error("Error creating course:", error);
      toast.error("Failed to create course");
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold">Courses Management</h1>
        <p className="text-base-content/60 mt-1">
          Manage courses — create, reorder, toggle visibility, or delete
        </p>
      </div>

      {/* Course List */}
      <div className="card bg-base-200 shadow-md">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h2 className="card-title text-xl">
              Existing Courses ({courses.length})
            </h2>
            {orderChanged && (
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSaveOrder}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Saving...
                  </>
                ) : (
                  "Save Order"
                )}
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-8 text-base-content/60">
              No courses found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th className="w-20">Order</th>
                    <th>Name</th>
                    <th>Chapters</th>
                    <th>Posts</th>
                    <th>Published</th>
                    <th>Visible</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course, index) => (
                    <tr
                      key={course.slug}
                      className={!course.isVisible ? "opacity-50" : ""}
                    >
                      <td>
                        <div className="flex flex-col gap-1">
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => moveCourse(index, "up")}
                            disabled={index === 0}
                            title="Move up"
                          >
                            ▲
                          </button>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => moveCourse(index, "down")}
                            disabled={index === courses.length - 1}
                            title="Move down"
                          >
                            ▼
                          </button>
                        </div>
                      </td>
                      <td>
                        <div>
                          <span className="font-medium">{course.name}</span>
                          <br />
                          <code className="text-xs bg-base-300 px-2 py-0.5 rounded">
                            {course.slug}
                          </code>
                        </div>
                      </td>
                      <td>{course.chapters}</td>
                      <td>{course.posts}</td>
                      <td className="text-sm">{formatDate(course.publishedAt)}</td>
                      <td>
                        <input
                          type="checkbox"
                          className="toggle toggle-primary toggle-sm"
                          checked={course.isVisible}
                          onChange={() => handleToggleVisibility(course)}
                          title={course.isVisible ? "Hide course" : "Show course"}
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-error btn-sm"
                          onClick={() => handleDelete(course)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Course Form */}
      <div className="card bg-base-200 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-xl mb-4">Add New Course</h2>

          {/* Step 1: Input mode selector */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">Step 1: Select input mode</span>
            </label>
            <div className="flex gap-6">
              <label className="label cursor-pointer gap-2">
                <input
                  type="radio"
                  name="inputMode"
                  className="radio radio-primary"
                  checked={inputMode === "video"}
                  onChange={() => {
                    setInputMode("video");
                    setFetchedData(null);
                    setYoutubeId("");
                  }}
                />
                <span className="label-text">YouTube Video</span>
              </label>
              <label className="label cursor-pointer gap-2">
                <input
                  type="radio"
                  name="inputMode"
                  className="radio radio-primary"
                  checked={inputMode === "playlist"}
                  onChange={() => {
                    setInputMode("playlist");
                    setFetchedData(null);
                    setYoutubeId("");
                  }}
                />
                <span className="label-text">YouTube Playlist</span>
              </label>
            </div>
          </div>

          {/* Step 2: YouTube ID input */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">
                Step 2: Enter {inputMode === "video" ? "Video" : "Playlist"} ID
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={
                  inputMode === "video"
                    ? "e.g. oUmVFHlwZsI"
                    : "e.g. PLqq6Dn4EQGT..."
                }
                className="input input-bordered flex-1"
                value={youtubeId}
                onChange={(e) => setYoutubeId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFetch()}
              />
              <button
                className="btn btn-primary"
                onClick={handleFetch}
                disabled={fetching || !youtubeId.trim()}
              >
                {fetching ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Fetching...
                  </>
                ) : (
                  "Fetch"
                )}
              </button>
            </div>
          </div>

          {/* Step 3: Preview after fetch */}
          {fetchedData && (
            <div className="space-y-4">
              <div className="divider">
                <span className="text-sm font-semibold">Step 3: Review &amp; Edit</span>
              </div>

              {/* Video preview */}
              {inputMode === "video" && isVideoData(fetchedData) && (
                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    {fetchedData.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={fetchedData.thumbnail}
                        alt="Video thumbnail"
                        className="w-40 rounded-lg shadow"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-base-content/70 mb-1">
                        Video title: {fetchedData.title}
                      </p>
                      <p className="text-sm text-base-content/60">
                        {fetchedData.chapters.length} chapters detected
                      </p>
                    </div>
                  </div>

                  {/* Chapters list */}
                  {editableChapters.length > 0 && (
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">
                          Chapters ({editableChapters.length})
                        </span>
                      </label>
                      <div className="space-y-2 max-h-64 overflow-y-auto border border-base-300 rounded-lg p-3">
                        {editableChapters.map((chapter, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <span className="text-xs text-base-content/50 w-16 shrink-0">
                              {Math.floor(chapter.timestampSeconds / 60)}:
                              {String(chapter.timestampSeconds % 60).padStart(2, "0")}
                            </span>
                            <input
                              type="text"
                              className="input input-bordered input-sm flex-1"
                              value={chapter.title}
                              onChange={(e) =>
                                handleChapterTitleChange(index, e.target.value)
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Playlist preview */}
              {inputMode === "playlist" && isPlaylistData(fetchedData) && (
                <div className="space-y-2">
                  <div className="flex gap-4 items-start">
                    {fetchedData.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={fetchedData.thumbnail}
                        alt="Playlist thumbnail"
                        className="w-40 rounded-lg shadow"
                      />
                    )}
                    <p className="text-sm text-base-content/60">
                      {fetchedData.items.length} videos in playlist — each will become a post
                    </p>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto border border-base-300 rounded-lg p-3">
                    {fetchedData.items.map((item, index) => (
                      <div key={item.videoId} className="flex gap-2 items-center text-sm">
                        <span className="text-base-content/50 w-6 shrink-0">{index + 1}.</span>
                        <span>{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Editable course fields */}
              <div className="space-y-4 mt-2">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-semibold">Course Name</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={courseName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Course name"
                  />
                </div>
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-semibold">Slug</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full font-mono text-sm"
                    value={courseSlug}
                    onChange={(e) => setCourseSlug(e.target.value)}
                    placeholder="course-slug"
                  />
                </div>
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-semibold">Description</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered w-full"
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    placeholder="Course description..."
                    rows={4}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      className="btn btn-outline btn-sm gap-2"
                      onClick={handleGenerateDescription}
                      disabled={generatingDesc || !courseName}
                    >
                      {generatingDesc ? (
                        <>
                          <span className="loading loading-spinner loading-xs"></span>
                          Generating...
                        </>
                      ) : (
                        "AI Generate Description"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Create button */}
          {fetchedData && (
            <>
              <div className="divider">
                <span className="text-sm font-semibold">Step 4: Create</span>
              </div>
              <div className="card-actions justify-end">
                <button
                  className="btn btn-success"
                  onClick={handleCreate}
                  disabled={creating || !courseSlug || !courseName}
                >
                  {creating ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Creating...
                    </>
                  ) : (
                    "Create Course"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

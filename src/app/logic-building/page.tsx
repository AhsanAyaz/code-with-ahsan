"use client";

import { useState, useRef, useEffect, useContext } from "react";
import confetti from "canvas-confetti";
import problemsData from "@/data/logicProblems.json";
import ReactMarkdown from "react-markdown";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { getApp } from "firebase/app";
import { AuthContext } from "@/contexts/AuthContext";

interface LeaderboardEntry {
  id?: string;
  name: string;
  score: number;
}

interface LogicProblem {
  id: string;
  title: string;
  description: string;
}

export default function LogicBuildingPage() {
  const { setShowLoginPopup } = useContext(AuthContext);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [inputVal, setInputVal] = useState("");
  const [chatHistory, setChatHistory] = useState<
    { role: "user" | "model"; content: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [previewApi, setPreviewApi] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [completedProblems, setCompletedProblems] = useState<Set<number>>(
    new Set()
  );
  const [bonusProblem, setBonusProblem] = useState<LogicProblem | null>(null);
  const [pendingScore, setPendingScore] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auth & Progress Init
  useEffect(() => {
    const auth = getAuth(getApp());
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch progress
        try {
          const res = await fetch(`/api/user-progress?uid=${user.uid}`);
          const data = await res.json();
          if (data.currentProblemIndex !== undefined) {
            // We allow free navigation, so we might want to just load the last saved index
            // OR just let them start at 0?
            // "Resume" usually means jump to where they were.
            setCurrentProblemIndex(data.currentProblemIndex);
          }
          if (Array.isArray(data.completedProblems)) {
            setCompletedProblems(new Set(data.completedProblems));
          }
        } catch (e) {
          console.error("Error fetching progress", e);
        }
      }
    });

    fetchLeaderboard();

    return () => unsub();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const activeProblem =
    currentProblemIndex < problemsData.length
      ? problemsData[currentProblemIndex]
      : bonusProblem;

  const isBonusLevel = currentProblemIndex >= problemsData.length;

  const saveProgress = async (index: number, newCompleted?: number[]) => {
    if (!currentUser) return;
    try {
      const completedArr = newCompleted || Array.from(completedProblems);
      await fetch("/api/user-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: currentUser.uid,
          currentProblemIndex: index,
          completedProblems: completedArr,
        }),
      });
    } catch (e) {
      console.error("Failed to save progress", e);
    }
  };

  const nextProblem = () => {
    if (currentProblemIndex < problemsData.length) {
      const newIndex = currentProblemIndex + 1;
      setCurrentProblemIndex(newIndex);
      // We save progress (current index) when moving next
      saveProgress(newIndex);
      resetState();
    } else {
      // Bonus mode logic if needed
    }
  };

  // ... (prevProblem, resetState, generateBonusProblem, fetchLeaderboard, handleFileUpload, handleSubmit same as before)

  const prevProblem = () => {
    if (currentProblemIndex > 0) {
      setCurrentProblemIndex((prev) => prev - 1);
      if (currentProblemIndex - 1 < problemsData.length) {
        setBonusProblem(null);
      }
      resetState();
    }
  };

  const resetState = () => {
    setChatHistory([]);
    setInputVal("");
    setPreviewApi(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const simpleHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  };

  const generateBonusProblem = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/logic-building", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "generate-problem" }),
      });
      const data = await res.json();
      const parsed = JSON.parse(data.result);
      setBonusProblem({
        id: `bonus-${simpleHash(parsed.title)}`,
        title: parsed.title,
        description: parsed.description,
      });
      resetState();
    } catch (e) {
      console.error("Failed to generate problem", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      if (Array.isArray(data)) {
        setLeaderboard(data);
      }
    } catch (e) {
      console.error("Failed to fetch leaderboard", e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewApi(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!inputVal && !previewApi) return;
    setLoading(true);

    const userMsg = inputVal || (previewApi ? "Image uploaded" : "");
    setChatHistory((prev) => [...prev, { role: "user", content: userMsg }]);

    try {
      const res = await fetch("/api/logic-building", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: inputVal,
          image: previewApi,
          problemContext: activeProblem,
          history: chatHistory,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setChatHistory((prev) => [
          ...prev,
          { role: "model", content: "Error: " + data.error },
        ]);
      } else {
        // Parse the structured JSON response
        let aiText = "";
        let isWin = false;
        let scoreVal = 0;

        try {
          // The API now returns a JSON string in 'result'
          const parsed = JSON.parse(data.result);
          aiText = parsed.response;
          isWin = parsed.isLogicCorrect;
          scoreVal = parsed.score || 0;
        } catch (e) {
          // Fallback if parsing fails (shouldn't happen with valid API)
          console.error("Failed to parse AI response", e);
          aiText = data.result;
        }

        setChatHistory((prev) => [...prev, { role: "model", content: aiText }]);
        setInputVal("");
        setPreviewApi(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        if (isWin) {
          triggerWin(scoreVal);
        }
      }
    } catch (err) {
      console.error(err);
      setChatHistory((prev) => [
        ...prev,
        { role: "model", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const triggerWin = async (scoreVal: number = 0) => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
    });

    // Mark as completed
    const newCompleted = new Set(completedProblems);
    newCompleted.add(currentProblemIndex);
    setCompletedProblems(newCompleted);

    setPendingScore(scoreVal);

    // Always show modal to ask for submission
    setShowScoreModal(true);

    if (currentUser) {
      // Also save progress silently?
      // User asked to "ask to submit the progress".
      // Saving *progress* (completion check) is fine to do silently or we can do it on submit.
      // Let's save the completion marker silently so they don't lose the "check",
      // but wait for them to "Submit Score" for the leaderboard.
      await saveProgress(currentProblemIndex, Array.from(newCompleted));
    }
  };

  const submitScore = async () => {
    // If not logged in, we shouldn't be here basically, but fallback safely
    const nameObj = currentUser?.displayName || playerName || "Anonymous";

    await submitScoreInternal(
      nameObj,
      currentUser?.uid,
      currentUser?.photoURL || undefined,
      activeProblem?.id,
      pendingScore
    );
    setShowScoreModal(false);
    setPlayerName("");
    setPendingScore(0);
    // Refresh leaderboard immediately is handled in submitScoreInternal
  };

  const submitScoreInternal = async (
    name: string,
    uid?: string,
    photoURL?: string,
    problemId?: string,
    scoreVal?: number
  ) => {
    try {
      const points =
        scoreVal && scoreVal > 0
          ? scoreVal
          : Math.floor(Math.random() * 50) + 10;
      await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          score: points,
          logicTitle: activeProblem?.title || "Logic Exercise",
          uid,
          photoURL,
          problemId: problemId || `unknown-${Date.now()}`,
        }),
      });
      fetchLeaderboard();
    } catch (e) {
      console.error("Failed to submit score", e);
    }
  };

  const handleShare = (platform: string) => {
    const text = `I just leveled up my logic building skills with CodeWithAhsan's Logic Buddy! 🚀 Check it out!`;
    const url = typeof window !== "undefined" ? window.location.href : "";
    let shareUrl = "";

    switch (platform) {
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
    }

    if (shareUrl) window.open(shareUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-base-200">
      <div className="hero bg-base-100 py-8">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Logic Buddy <span className="text-2xl align-top">(beta)</span> 🧠
            </h1>
            <p className="py-6">
              Master your programming logic. Solve the problems suggested by
              your AI mentor!
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Area */}
          <div className="lg:col-span-2">
            {/* Problem Card */}
            <div className="card bg-primary text-primary-content shadow-xl mb-6">
              <div className="card-body">
                {isBonusLevel && !bonusProblem ? (
                  <div className="text-center py-6">
                    <h2 className="card-title text-2xl justify-center mb-4">
                      Bonus Stage! 🌟
                    </h2>
                    <p className="mb-4">
                      You've completed the core set. Ready for an infinite
                      stream of challenges?
                    </p>
                    <button
                      className="btn btn-secondary btn-lg"
                      onClick={generateBonusProblem}
                      disabled={loading}
                    >
                      {loading ? "Generating..." : "Generate New Challenge"}
                    </button>
                    <div className="mt-4">
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={prevProblem}
                      >
                        « Back to List
                      </button>
                    </div>
                  </div>
                ) : (
                  activeProblem && (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <h2 className="card-title text-2xl">
                          {activeProblem.title}
                        </h2>
                      </div>
                      <p className="text-lg">{activeProblem.description}</p>
                      <div className="flex justify-between items-center mt-2">
                        <div className="badge badge-accent">
                          {isBonusLevel
                            ? "Bonus Challenge"
                            : `Problem ${currentProblemIndex + 1} of ${problemsData.length}`}
                        </div>
                        {isBonusLevel && (
                          <button
                            className="btn btn-xs btn-outline btn-accent"
                            onClick={generateBonusProblem}
                          >
                            Reroll 🎲
                          </button>
                        )}
                      </div>
                    </>
                  )
                )}
              </div>
            </div>

            {/* Chat Interface */}
            {(activeProblem || (isBonusLevel && bonusProblem)) && (
              <div className="card bg-base-100 shadow-xl mb-6">
                <div className="card-body">
                  <div className="h-96 overflow-y-auto mb-4 p-2 rounded-box bg-base-200/50 space-y-4">
                    {/* Intro Message */}
                    <div className="chat chat-start">
                      <div className="chat-image avatar">
                        <div className="w-10 rounded-full">
                          <img
                            alt="AI Mentor"
                            src="/static/images/avatar.jpeg"
                          />
                        </div>
                      </div>
                      <div className="chat-bubble chat-bubble-primary">
                        Ready? Describe your logic or upload a flowchart!
                      </div>
                    </div>

                    {/* History */}
                    {chatHistory.map((msg, i) => (
                      <div
                        key={i}
                        className={`chat ${msg.role === "user" ? "chat-end" : "chat-start"}`}
                      >
                        {msg.role ===
                          "model" /* eslint-disable-next-line @next/next/no-img-element */ && (
                          <div className="chat-image avatar">
                            <div className="w-10 rounded-full">
                              <img
                                alt="AI Mentor"
                                src="/static/images/avatar.jpeg"
                              />
                            </div>
                          </div>
                        )}
                        <div
                          className={`chat-bubble ${msg.role === "user" ? "chat-bubble-info" : "chat-bubble-accent break-words max-w-full overflow-hidden prose prose-sm prose-invert prose-p:my-1 prose-headings:my-2 leading-normal"}`}
                        >
                          {msg.role === "model" ? (
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          ) : (
                            msg.content
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef}></div>
                  </div>

                  <div className="form-control w-full">
                    <textarea
                      className="textarea textarea-bordered h-24 mb-4"
                      placeholder={
                        chatHistory.length > 0
                          ? "Reply to your mentor..."
                          : "Type your pseudo-code or logic description here..."
                      }
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit();
                        }
                      }}
                    ></textarea>

                    <div className="flex gap-2 mb-4 items-center justify-between">
                      <div className="flex gap-2 items-center">
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="file-input file-input-bordered file-input-sm w-full max-w-xs"
                          onChange={handleFileUpload}
                          accept="image/*"
                        />
                        {previewApi && (
                          <span className="badge badge-success badge-sm whitespace-nowrap">
                            Image Loaded ✅
                          </span>
                        )}
                      </div>
                      {!currentUser && (
                        <button
                          className="btn btn-sm btn-ghost text-xs whitespace-nowrap"
                          onClick={() => {
                            setShowScoreModal(false);
                            setShowLoginPopup(true);
                          }}
                        >
                          Login to Save Progress
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2 w-full">
                      <button
                        className="btn btn-outline"
                        onClick={prevProblem}
                        disabled={currentProblemIndex === 0 && !isBonusLevel}
                      >
                        « Prev
                      </button>
                      <button
                        className="btn btn-primary flex-1"
                        onClick={handleSubmit}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="loading loading-spinner loading-sm"></span>
                            Thinking...
                          </>
                        ) : chatHistory.length > 0 ? (
                          "Send Reply"
                        ) : (
                          "Start Assessment"
                        )}
                      </button>
                      <button
                        className="btn btn-outline"
                        onClick={
                          isBonusLevel ? generateBonusProblem : nextProblem
                        }
                        disabled={
                          (currentProblemIndex >= problemsData.length &&
                            !isBonusLevel) ||
                          loading
                        }
                      >
                        {isBonusLevel ? "New Problem »" : "Next »"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar / Leaderboard / Sharing */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-xl mb-4">Share Wins 🏆</h2>
                <div className="flex gap-2">
                  <button
                    className="btn btn-circle btn-ghost"
                    onClick={() => handleShare("twitter")}
                  >
                    {/* Twitter Icon */}
                    <svg
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      className="w-6 h-6"
                    >
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  </button>
                  <button
                    className="btn btn-circle btn-ghost"
                    onClick={() => handleShare("linkedin")}
                  >
                    {/* LinkedIn Icon */}
                    <svg
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      className="w-6 h-6"
                    >
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-xl mb-4">Leaderboard 🥇</h2>
                <p className="text-sm opacity-70 mb-4">
                  Top logic builders this week!
                </p>
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Name</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="text-center">
                            No scores yet. (or unavailable)
                          </td>
                        </tr>
                      ) : (
                        leaderboard.map((entry, index) => (
                          <tr key={entry.id || index}>
                            <th>{index + 1}</th>
                            <td>
                              <div className="flex items-center gap-2">
                                {/* Entry photo if available (not in interface yet but robust to add) */}
                                {/* entry.photoURL && <img src={entry.photoURL} className="w-6 h-6 rounded-full" /> */}
                                {entry.name}
                              </div>
                            </td>
                            <td>{entry.score}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-xl mb-4">Feedback 💭</h2>
                <p className="mb-4">
                  Help us improve Logic Buddy! Share your thoughts, report bugs,
                  or suggest features.
                </p>
                <a
                  href="https://discord.com/channels/814191682282717194/1450734264302964837"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary w-full"
                >
                  Join Discord Discussion
                </a>
              </div>
            </div>
          </div>

          {/* Score Modal */}
          {showScoreModal && (
            <div className="modal modal-open">
              <div className="modal-box">
                <h3 className="font-bold text-lg">Congratulations! 🎉</h3>
                <p className="py-4">
                  {currentUser
                    ? `You've solved it! Submit your score as ${currentUser.displayName}?`
                    : "You've solved it! Log in to save your progress and appear on the leaderboard."}
                </p>

                <div className="modal-action">
                  {currentUser ? (
                    <button className="btn btn-primary" onClick={submitScore}>
                      Submit Score
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setShowScoreModal(false);
                        setShowLoginPopup(true);
                      }}
                    >
                      Log In / Sign Up
                    </button>
                  )}

                  <button
                    className="btn"
                    onClick={() => setShowScoreModal(false)}
                  >
                    {currentUser ? "Cancel" : "Continue without saving"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

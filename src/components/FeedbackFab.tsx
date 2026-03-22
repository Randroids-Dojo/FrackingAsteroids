"use client";

import { useState } from "react";

export function FeedbackFab() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      setSubmitted(true);
      setMessage("");
      setTimeout(() => {
        setSubmitted(false);
        setOpen(false);
      }, 2000);
    } catch {
      // silently ignore
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-hud-green text-space-900 font-bold text-xl shadow-lg hover:scale-110 active:scale-95 transition-transform flex items-center justify-center"
        aria-label="Send feedback"
      >
        ?
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-space-800 border border-hud-green/30 rounded-lg shadow-2xl p-4">
      {submitted ? (
        <p className="text-hud-green font-mono text-sm text-center">
          Thanks for your feedback!
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-hud-green font-mono text-sm font-bold">
            Feedback
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What do you think?"
            className="bg-space-900 border border-hud-green/20 rounded p-2 text-white text-sm font-mono resize-none h-24 focus:outline-none focus:border-hud-green/60"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-sm font-mono text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-hud-green text-space-900 rounded text-sm font-mono font-bold hover:opacity-90 active:scale-95 transition-all"
            >
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

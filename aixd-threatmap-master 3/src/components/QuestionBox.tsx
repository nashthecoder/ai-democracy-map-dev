"use client";

import { useState } from "react";

const QUESTION_EMAIL = "";

function csvEscape(s: string) {
  if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const QuestionBox = () => {
  const [question, setQuestion] = useState("");
  const [confirmation, setConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const q = question.trim();
    if (!q) return;
    setSubmitting(true);
    const pat = typeof window !== "undefined" ? sessionStorage.getItem("gh_pat") : null;
    const owner = typeof window !== "undefined" ? sessionStorage.getItem("gh_owner") ?? "nashthecoder" : "nashthecoder";
    const repo = typeof window !== "undefined" ? sessionStorage.getItem("gh_repo") ?? "ai-democracy-map-dev" : "ai-democracy-map-dev";
    const branch = typeof window !== "undefined" ? sessionStorage.getItem("gh_branch") ?? "dev" : "dev";
    // If admin PAT present (gh-pages admin), try direct commit to data/questions.csv
    if (pat) {
      try {
        const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/questions.csv?ref=${branch}`, {
          headers: { Authorization: `Bearer ${pat}`, Accept: "application/vnd.github.v3+json" },
        });
        let existing = "timestamp,question,page,ua\n";
        let sha: string | null = null;
        if (getRes.ok) {
          const j = await getRes.json();
          existing = atob(j.content.replace(/\n/g, ""));
          sha = j.sha;
        }
        const line = `${new Date().toISOString()},${csvEscape(q)},${csvEscape(window.location.pathname)},${csvEscape(navigator.userAgent.slice(0,120))}\n`;
        const next = existing.endsWith("\n") ? existing + line : existing + "\n" + line;
        await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/questions.csv`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${pat}`, Accept: "application/vnd.github.v3+json", "Content-Type": "application/json" },
          body: JSON.stringify({ message: `chore: question ${new Date().toISOString().slice(0,10)}`, content: btoa(unescape(encodeURIComponent(next))), branch, ...(sha ? { sha } : {}) }),
        });
      } catch {
        // fall through to local fallback
        try {
          const pending = JSON.parse(localStorage.getItem("pending_questions") ?? "[]");
          pending.push({ timestamp: new Date().toISOString(), question: q });
          localStorage.setItem("pending_questions", JSON.stringify(pending));
        } catch {}
      }
    } else {
      // No PAT (public visitor): queue locally + mailto fallback so admin can flush via PAT later
      try {
        const pending = JSON.parse(localStorage.getItem("pending_questions") ?? "[]");
        pending.push({ timestamp: new Date().toISOString(), question: q });
        localStorage.setItem("pending_questions", JSON.stringify(pending));
      } catch {}
      if (QUESTION_EMAIL) {
        window.location.href = `mailto:${QUESTION_EMAIL}?subject=${encodeURIComponent("Question about the AI–Democracy Map")}&body=${encodeURIComponent(q)}`;
      }
    }
    setQuestion("");
    setConfirmation(true);
    setSubmitting(false);
    setTimeout(() => setConfirmation(false), 2600);
  };

  return (
    <div className="w-full rounded-[16px] bg-[#E7DEC4] p-5">
      <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-8">
        <h3 className="m-0 shrink-0 text-center text-[14px] font-bold leading-snug text-foreground sm:w-[300px] sm:text-left sm:text-[15px]">
          What would you like to know from the data?
          <br />
          Submit your questions to us!
        </h3>
        <div className="flex w-full items-center gap-2.5 sm:flex-1">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your question…"
            rows={2}
            className="min-w-0 flex-1 resize-none rounded-[10px] border border-border bg-[#fff] p-2.5 font-body text-[12.5px] text-foreground"
          />
          <button
            type="button"
            onClick={handleSubmit}
            className="shrink-0 cursor-pointer self-stretch rounded-full border-none bg-p4d-brick px-5 text-[12.5px] font-bold text-[#fff]"
          >
            Submit
          </button>
        </div>
      </div>
      {confirmation && (
        <p className="m-0 mt-3 w-full text-center text-[11.5px] font-semibold text-p4d-grassroot">
          Thanks — your question has been submitted!
        </p>
      )}
    </div>
  );
};
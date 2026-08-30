"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";

const DEFAULT_OWNER = "nashthecoder";
const DEFAULT_REPO = "ai-democracy-map-dev";
const DEFAULT_BRANCH = "dev";

type GhFile = { sha: string; content: string };

async function ghGetFile(owner: string, repo: string, path: string, branch: string, pat: string): Promise<GhFile | null> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${branch}`, {
    headers: { Authorization: `Bearer ${pat}`, Accept: "application/vnd.github.v3+json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path} ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return { sha: j.sha, content: atob(j.content.replace(/\n/g, "")) };
}

async function ghPutFile(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  pat: string,
  content: string,
  sha: string | null,
  message: string
) {
  const body: any = { message, content: btoa(unescape(encodeURIComponent(content))), branch };
  if (sha) body.sha = sha;
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${pat}`, Accept: "application/vnd.github.v3+json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

function csvEscape(s: string) {
  if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const AdminPanel = () => {
  const [pat, setPat] = useState("");
  const [owner, setOwner] = useState(DEFAULT_OWNER);
  const [repo, setRepo] = useState(DEFAULT_REPO);
  const [branch, setBranch] = useState(DEFAULT_BRANCH);
  const [tab, setTab] = useState<"questions" | "codebook">("questions");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Questions state
  const [qRows, setQRows] = useState<{ timestamp: string; question: string; page: string; ua: string }[]>([]);
  const [qLoading, setQLoading] = useState(false);
  const [newQ, setNewQ] = useState("");

  // Codebook state
  const [cbCsv, setCbCsv] = useState<string | null>(null);
  const [cbParsed, setCbParsed] = useState<any[] | null>(null);
  const [cbErrors, setCbErrors] = useState<string[]>([]);
  const [cbCurrent, setCbCurrent] = useState<Record<string, any> | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    setPat(sessionStorage.getItem("gh_pat") ?? "");
    setOwner(sessionStorage.getItem("gh_owner") ?? DEFAULT_OWNER);
    setRepo(sessionStorage.getItem("gh_repo") ?? DEFAULT_REPO);
    setBranch(sessionStorage.getItem("gh_branch") ?? DEFAULT_BRANCH);
  }, []);

  const savePat = () => {
    sessionStorage.setItem("gh_pat", pat);
    sessionStorage.setItem("gh_owner", owner);
    sessionStorage.setItem("gh_repo", repo);
    sessionStorage.setItem("gh_branch", branch);
    setMsg("Saved to sessionStorage");
    setTimeout(() => setMsg(null), 1500);
  };

  const loadQuestions = async () => {
    if (!pat) return setErr("Enter PAT first");
    setQLoading(true);
    setErr(null);
    try {
      const f = await ghGetFile(owner, repo, "data/questions.csv", branch, pat);
      const text = f?.content ?? "timestamp,question,page,ua\n";
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      setQRows((parsed.data as any[]).filter((r) => r.question));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setQLoading(false);
    }
  };

  useEffect(() => {
    if (pat && tab === "questions" && qRows.length === 0) loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const appendQuestion = async () => {
    if (!newQ.trim()) return;
    if (!pat) return setErr("PAT required to write");
    setErr(null);
    setMsg(null);
    try {
      const f = await ghGetFile(owner, repo, "data/questions.csv", branch, pat);
      const existing = f?.content ?? "timestamp,question,page,ua\n";
      const line = `${new Date().toISOString()},${csvEscape(newQ.trim())},admin,${csvEscape(navigator.userAgent.slice(0,120))}\n`;
      const next = existing.endsWith("\n") ? existing + line : existing + "\n" + line;
      await ghPutFile(owner, repo, "data/questions.csv", branch, pat, next, f?.sha ?? null, `chore: add question ${new Date().toISOString().slice(0,10)}`);
      setMsg("Committed to data/questions.csv");
      setNewQ("");
      loadQuestions();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const onCodebookFile = (file: File) => {
    setCbCsv(null);
    setCbParsed(null);
    setCbErrors([]);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = res.data as any[];
        setCbParsed(rows);
        const errs: string[] = [];
        const seen = new Set<string>();
        rows.forEach((r, i) => {
          const code = String(r.code ?? "").trim();
          const name = String(r.name ?? "").trim();
          const pillar = String(r.pillar ?? r.pillarCode ?? "").trim();
          if (!code) errs.push(`Row ${i + 2}: missing code`);
          else if (!/^[1-4]\.\d+$/.test(code)) errs.push(`Row ${i + 2} ${code}: code must be 1.1-4.9`);
          if (seen.has(code)) errs.push(`Row ${i + 2} ${code}: duplicate`);
          seen.add(code);
          if (!name) errs.push(`Row ${i + 2} ${code}: missing name`);
          if (!["1", "2", "3", "4"].includes(pillar)) errs.push(`Row ${i + 2} ${code}: pillar must be 1-4`);
        });
        setCbErrors(errs);
        // Load current for diff
        fetch(`./data/aspects.json`)
          .then((r) => r.json())
          .then(setCbCurrent)
          .catch(() => setCbCurrent(null));
      },
    });
  };

  const publishCodebook = async () => {
    if (!cbParsed || cbErrors.length) return setErr("Fix validation first");
    if (!pat) return setErr("PAT required");
    setPublishing(true);
    setErr(null);
    try {
      // Build aspects.json
      const next: Record<string, any> = {};
      for (const r of cbParsed) {
        const code = String(r.code).trim();
        next[code] = {
          code,
          name: String(r.name).trim(),
          definition: String(r.definition ?? r.short ?? "").trim(),
          description: String(r.description ?? "").trim(),
          pillar: ["Citizenship, Law and Rights", "Representative and Accountable Government", "Civil Society and Popular Participation", "Transnational Dynamics"][Number(r.pillar) - 1] ?? r.pillar,
          pillarCode: String(r.pillar).trim(),
        };
      }
      const aspectsContent = JSON.stringify(next, null, 2) + "\n";
      const csvContent = Papa.unparse(cbParsed);
      const aspectsFile = await ghGetFile(owner, repo, "public/data/aspects.json", branch, pat);
      await ghPutFile(owner, repo, "public/data/aspects.json", branch, pat, aspectsContent, aspectsFile?.sha ?? null, "chore: update codebook aspects.json via admin");
      const rawFile = await ghGetFile(owner, repo, "data/raw/codebook.csv", branch, pat);
      await ghPutFile(owner, repo, "data/raw/codebook.csv", branch, pat, csvContent, rawFile?.sha ?? null, "chore: update codebook.csv via admin");
      setMsg("Published aspects.json + codebook.csv — Actions will rebuild gh-pages. Q1 corner clusters will pick up new pillar codes; missing codes fall back to #5C5C52.");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-extrabold">Admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">Hosted on gh-pages. Writes via PAT `contents:write` to `PUT /repos/{owner}/{repo}/contents/...`. PAT stays in sessionStorage, never committed.</p>

      <div className="mt-6 rounded-xl border bg-card p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="owner" className="rounded border px-2 py-1 text-sm" />
          <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="repo" className="rounded border px-2 py-1 text-sm" />
          <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="branch" className="rounded border px-2 py-1 text-sm" />
          <input value={pat} onChange={(e) => setPat(e.target.value)} placeholder="ghp_... (fine-grained PAT)" type="password" className="rounded border px-2 py-1 text-sm" />
        </div>
        <button onClick={savePat} className="mt-3 rounded bg-foreground px-3 py-1 text-sm text-background">Save PAT to session</button>
        <p className="mt-2 text-xs text-muted-foreground">Create at github.com/settings/tokens?type=beta — repo `{owner}/{repo}` `Contents:Read & write` `Metadata:Read` 90d. Paste at `/admin?pat=` or here.</p>
      </div>

      <div className="mt-6 flex gap-2">
        <button onClick={() => setTab("questions")} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === "questions" ? "bg-p4d-brick text-white" : "border"}`}>Questions</button>
        <button onClick={() => setTab("codebook")} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === "codebook" ? "bg-p4d-brick text-white" : "border"}`}>Codebook CSV</button>
      </div>

      {msg && <p className="mt-3 text-sm font-semibold text-p4d-grassroot">{msg}</p>}
      {err && <p className="mt-3 text-sm font-semibold text-p4d-brick">{err}</p>}

      {tab === "questions" && (
        <div className="mt-6 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Questions → data/questions.csv</h2>
            <button onClick={loadQuestions} className="rounded border px-3 py-1 text-sm">Reload</button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Public `QuestionBox` will `PUT` via this PAT if present in sessionStorage, else falls back to `mailto`. Each submit appends `timestamp,question,page,ua` and commits — Q1-4 viz untouched.</p>
          <div className="mt-3 flex gap-2">
            <input value={newQ} onChange={(e) => setNewQ(e.target.value)} placeholder="Add question manually..." className="flex-1 rounded border px-2 py-1.5 text-sm" />
            <button onClick={appendQuestion} className="rounded bg-p4d-brick px-4 py-1.5 text-sm font-bold text-white">Commit</button>
          </div>
          {qLoading ? <p className="mt-3 text-sm">Loading…</p> : <p className="mt-3 text-sm">{qRows.length} rows</p>}
          <div className="mt-2 max-h-[320px] overflow-auto rounded border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted"><tr><th className="p-2">timestamp</th><th className="p-2">question</th><th className="p-2">page</th></tr></thead>
              <tbody>{qRows.slice(0,100).map((r, i) => <tr key={i} className="border-t"><td className="p-2">{r.timestamp.slice(0,16)}</td><td className="p-2">{r.question}</td><td className="p-2">{r.page}</td></tr>)}</tbody>
            </table>
          </div>
          <a href={`https://github.com/${owner}/${repo}/blob/${branch}/data/questions.csv`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs underline">View on GitHub</a>
        </div>
      )}

      {tab === "codebook" && (
        <div className="mt-6 rounded-xl border bg-card p-4">
          <h2 className="font-bold">Codebook → public/data/aspects.json</h2>
          <p className="mt-1 text-xs text-muted-foreground">CSV header: <code>code,name,definition,description,pillar</code> e.g. <code>1.1,Nationhood,Effects on inclusion...,Full description...,1</code>. Q1 `CORNERS` expects pillar 1-4; Q2-4 use `T/B` not affected. Missing/new codes render grey `#5C5C52`; deletes of codes used in `data.json` warn but don’t break.</p>
          <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && onCodebookFile(e.target.files[0])} className="mt-3 text-sm" />
          {cbErrors.length > 0 && <ul className="mt-2 list-disc pl-5 text-xs text-p4d-brick">{cbErrors.map((x, i) => <li key={i}>{x}</li>)}</ul>}
          {cbParsed && <p className="mt-2 text-sm">{cbParsed.length} rows parsed {cbErrors.length ? `— ${cbErrors.length} errors` : "— valid"}</p>}
          {cbCurrent && cbParsed && (
            <div className="mt-2 max-h-[200px] overflow-auto rounded border p-2 text-xs">
              <p className="font-semibold">Diff vs current aspects.json ({Object.keys(cbCurrent).length} {"->"} {cbParsed.length})</p>
              <p>Added: {cbParsed.filter((r: any) => !cbCurrent[String(r.code)]).map((r: any) => r.code).join(", ") || "—"}</p>
              <p>Removed: {Object.keys(cbCurrent).filter((c) => !cbParsed.find((r: any) => String(r.code) === c)).join(", ") || "—"}</p>
            </div>
          )}
          <button onClick={publishCodebook} disabled={publishing || !cbParsed || !!cbErrors.length} className="mt-3 rounded bg-p4d-brick px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40">{publishing ? "Publishing…" : "Publish to GitHub (2 commits)"}</button>
          <a href={`https://github.com/${owner}/${repo}/blob/${branch}/public/data/aspects.json`} target="_blank" rel="noreferrer" className="ml-3 text-xs underline">View aspects.json</a>
        </div>
      )}
    </div>
  );
};

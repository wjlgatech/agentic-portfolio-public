"use client";

// The Portfolio Network — a self-propelling network, not a directory. Each node exposes an A2A
// agent card, so "Ask the agent" is real. 10X over a plain list: a growth header (value rises
// with N), a capability marketplace (browse by skill), an embeddable badge (the backlink flywheel),
// and on-join peer recommendations (reciprocity) — so every join makes the next one worth more.

import { useEffect, useMemo, useState } from "react";
import { searchRegistry, networkStats, skillIndex, peersLike, type RegistryEntry } from "@core/registry-types";

export function Network({ entries }: { entries: RegistryEntry[] }) {
  const [q, setQ] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [joinMsg, setJoinMsg] = useState("");
  const [joined, setJoined] = useState<RegistryEntry | null>(null); // the node you just added → peer recs
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  const [ask, setAsk] = useState("");
  const [asking, setAsking] = useState(false);
  const [answers, setAnswers] = useState<{ handle: string; name: string; url: string; ok: boolean; answer: string }[] | null>(null);

  useEffect(() => { try { setOrigin(window.location.origin); } catch { /* ssr */ } }, []);

  const results = useMemo(() => (q.trim() ? searchRegistry(entries, q) : entries), [entries, q]);
  const stats = useMemo(() => networkStats(entries), [entries]);
  const topSkills = useMemo(() => skillIndex(entries).slice(0, 14), [entries]);
  const peers = useMemo(() => (joined ? peersLike(joined, entries) : []), [joined, entries]);

  const badgeUrl = origin ? `${origin}/api/badge` : "/api/badge";
  const embedMd = `[![agentic network](${badgeUrl})](${origin || ""}/network)`;

  async function askNetwork() {
    if (!ask.trim()) return;
    setAsking(true);
    setAnswers(null);
    try {
      const res = await fetch("/api/registry/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: ask.trim() }) });
      const data = await res.json();
      setAnswers(res.ok ? (data.nodes ?? []) : [{ handle: "error", name: "Error", url: "", ok: false, answer: data.error || `HTTP ${res.status}` }]);
    } catch (e) {
      setAnswers([{ handle: "error", name: "Error", url: "", ok: false, answer: (e as Error).message }]);
    }
    setAsking(false);
  }

  async function join() {
    if (!joinUrl.trim()) { setJoinMsg("Paste your portfolio URL (it must expose an A2A agent card)."); return; }
    setBusy(true);
    setJoinMsg("Fetching your agent card…");
    setJoined(null);
    try {
      const res = await fetch("/api/registry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: joinUrl.trim() }) });
      const data = await res.json();
      if (!res.ok) setJoinMsg(`Couldn't join: ${data.error || res.status}`);
      else {
        setJoinMsg(`✓ ${data.entry.name} is now discoverable by every agent in the network (${data.total} node${data.total === 1 ? "" : "s"}).${data.persisted ? "" : " Commit content/registry.json to make it permanent."}`);
        setJoined(data.entry as RegistryEntry);
      }
    } catch (e) {
      setJoinMsg(`Couldn't reach the registry: ${(e as Error).message}`);
    }
    setBusy(false);
  }

  return (
    <div className="grid gap-8">
      {/* ── Growth header: value rises with N (Metcalfe) — social proof that joining is worth it. ── */}
      <div className="card grid gap-4 border-accent/30 bg-accent/5 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="flex gap-6">
          <div className="text-center"><div className="text-4xl font-extrabold text-ink">{stats.nodes}</div><div className="text-xs uppercase tracking-widest text-accent">nodes</div></div>
          <div className="text-center"><div className="text-4xl font-extrabold text-ink">{stats.skills}</div><div className="text-xs uppercase tracking-widest text-accent">skills</div></div>
          <div className="text-center"><div className="text-4xl font-extrabold text-ink">{stats.connections}</div><div className="text-xs uppercase tracking-widest text-accent">possible links</div></div>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          A network, not a phonebook: every node exposes a live agent other agents can <span className="text-ink">query</span>.
          Each join adds <span className="text-ink">N</span> new possible connections — the network gets more useful the bigger it is.
          <span className="text-accent"> Add yours below</span> and you&apos;re instantly discoverable + queryable.
        </p>
      </div>

      {/* ── Ask the network — the A2A fan-out: the network *answers*, grounded by each live agent. ── */}
      <div className="card border-accent2/30 bg-accent2/5">
        <p className="mb-1 text-sm font-medium uppercase tracking-widest text-accent2">Ask the network</p>
        <p className="mb-3 text-sm text-muted">One question → the matching nodes&apos; live agents each answer, grounded in their own portfolio.</p>
        <div className="flex flex-wrap items-center gap-2">
          <input value={ask} onChange={(e) => setAsk(e.target.value)} onKeyDown={(e) => e.key === "Enter" && askNetwork()} placeholder="e.g. “Who has shipped agent-verification tooling?”" className="min-w-[16rem] flex-1 rounded-theme border border-edge bg-surface px-3 py-2 text-sm text-ink" />
          <button onClick={askNetwork} disabled={asking} className="chip border-accent2/50 text-accent2 disabled:opacity-50">{asking ? "Asking…" : "Ask"}</button>
        </div>
        {answers && (
          <div className="mt-4 grid gap-3">
            {answers.length === 0 && <p className="text-sm text-muted">No nodes answered.</p>}
            {answers.map((a, i) => (
              <div key={i} className="rounded-theme border border-edge bg-surface/60 p-3">
                <p className="mb-1 text-sm font-medium text-ink">{a.url ? <a href={a.url} target="_blank" rel="noreferrer" className="hover:underline">{a.name}</a> : a.name}</p>
                {a.ok && <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{a.answer}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Capability marketplace: browse the network BY skill ("who can do X?"). ── */}
      {topSkills.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-accent">Browse by capability</p>
          <div className="flex flex-wrap gap-2">
            {topSkills.map((s) => (
              <button key={s.skill} onClick={() => setQ(s.skill)} className={`chip ${q === s.skill ? "border-accent text-accent" : "border-edge text-muted hover:border-accent"}`}>
                {s.skill} <span className="ml-1 opacity-60">{s.nodes.length}</span>
              </button>
            ))}
            {q && <button onClick={() => setQ("")} className="chip border-edge text-muted">clear ✕</button>}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the network — e.g. “agent verification”, “Rust”, “founder”…" className="min-w-[16rem] flex-1 rounded-theme border border-edge bg-surface px-4 py-2 text-sm text-ink" />
        <span className="text-xs text-muted">{results.length} / {entries.length} node{entries.length === 1 ? "" : "s"}</span>
      </div>

      {results.length === 0 ? (
        <p className="text-muted">No nodes match “{q}”.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((e) => (
            <div key={e.url} className="card flex flex-col">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="font-semibold text-ink">{e.name}</h3>
                <span className="ml-auto rounded-full bg-accent2/15 px-2 py-0.5 text-[11px] text-accent2">A2A</span>
              </div>
              {e.description && <p className="mb-3 flex-1 text-sm leading-relaxed text-muted">{e.description}</p>}
              {e.skills.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {e.skills.map((s) => <span key={s.id || s.name} className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] text-accent">{s.name || s.id}</span>)}
                </div>
              )}
              <div className="flex items-center gap-3 text-xs">
                <a href={e.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">Ask the agent →</a>
                <a href={e.cardUrl} target="_blank" rel="noreferrer" className="text-muted hover:text-ink">Agent Card</a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Join → instant discoverability + peer recs (reciprocity) + an embeddable badge (flywheel). ── */}
      <div className="card border-accent/30 bg-accent/5">
        <p className="mb-1 text-sm font-medium uppercase tracking-widest text-accent">Join the network</p>
        <p className="mb-3 text-sm text-muted">
          Have an agentic portfolio with an A2A agent card (<code>/.well-known/agent-card.json</code>)? Add it — other agents can then discover and query yours.
          No portfolio yet? <a href="/" className="text-accent hover:underline">this whole site is the template</a>.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input value={joinUrl} onChange={(e) => setJoinUrl(e.target.value)} placeholder="https://your-portfolio.example.com" className="min-w-[16rem] flex-1 rounded-theme border border-edge bg-surface px-3 py-2 text-sm text-ink" />
          <button onClick={join} disabled={busy} className="chip border-accent/50 text-accent disabled:opacity-50">{busy ? "Joining…" : "Join"}</button>
        </div>
        {joinMsg && <p className="mt-2 text-sm text-muted">{joinMsg}</p>}

        {joined && (
          <div className="mt-4 grid gap-3">
            {peers.length > 0 && (
              <div>
                <p className="mb-1 text-sm text-ink">🤝 Reach these {peers.length} peer{peers.length === 1 ? "" : "s"} (shared skills):</p>
                <div className="flex flex-wrap gap-2">
                  {peers.map((p) => <a key={p.url} href={p.url} target="_blank" rel="noreferrer" className="chip border-edge text-muted hover:border-accent">{p.name} →</a>)}
                </div>
              </div>
            )}
            <div>
              <p className="mb-1 text-sm text-ink">📌 Embed your membership badge (grows the network — every embed is a backlink):</p>
              <div className="flex items-center gap-3">
                <img src={badgeUrl} alt="agentic network badge" className="h-5" />
                <button
                  onClick={() => { navigator.clipboard?.writeText(embedMd); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                  className="chip border-accent/50 text-accent"
                >{copied ? "copied ✓" : "copy embed"}</button>
              </div>
              <pre className="mt-2 overflow-x-auto rounded-theme border border-edge bg-surface/60 p-2 text-xs text-muted">{embedMd}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

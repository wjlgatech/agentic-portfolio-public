import Link from "next/link";
import { readRegistryAsync } from "@/lib/registry";
import { Network } from "@/components/Network";

// The Portfolio Network — a searchable directory of A2A agent-portfolios (the network's
// DNS). Reads the live registry (KV joins over the committed seed) per request.
export const dynamic = "force-dynamic";

export default async function NetworkPage() {
  const entries = await readRegistryAsync();
  return (
    <main className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
      <header className="mb-10">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-accent">The Portfolio Network</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Agent portfolios, discoverable + queryable</h1>
        <p className="mt-3 max-w-2xl text-muted">
          A directory of portfolios that each expose an <strong className="text-ink">A2A agent card</strong>. Search by skill,
          then talk to any node's agent. Each new portfolio makes the network more useful — the whole point.
        </p>
        <p className="mt-4 text-sm">
          <Link href="/" className="text-accent hover:underline">← back to the portfolio</Link>
        </p>
      </header>
      <Network entries={entries} />
    </main>
  );
}

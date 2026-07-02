// ─────────────────────────────────────────────────────────────────────────────
// lib/feedback.ts — durable persistence for the feedback→feature loop. Items live in ONE
// KV key (like society applications / referral edges), the latest digest in another. No KV
// configured → callers degrade honestly (accepted, durable:false), never crash. The pure
// shapes + math live in @core/feedback-types; this file is only the storage seam.
// ─────────────────────────────────────────────────────────────────────────────
import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/storage";
import { upsertFeedback, type FeedbackDigest, type FeedbackItem } from "@core/feedback-types";

const ITEMS_KEY = "feedback:items";
const DIGEST_KEY = "feedback:digest";

export async function listFeedback(): Promise<FeedbackItem[]> {
  return (await kvGetJSON<FeedbackItem[]>(ITEMS_KEY)) ?? [];
}

export async function addFeedback(item: FeedbackItem): Promise<{ durable: boolean; total: number }> {
  const merged = upsertFeedback(await listFeedback(), item);
  const durable = await kvSetJSON(ITEMS_KEY, merged);
  return { durable: durable && kvConfigured(), total: merged.length };
}

export async function readFeedbackDigest(): Promise<FeedbackDigest | null> {
  return kvGetJSON<FeedbackDigest>(DIGEST_KEY);
}

export async function writeFeedbackDigest(digest: FeedbackDigest): Promise<boolean> {
  return kvSetJSON(DIGEST_KEY, digest);
}

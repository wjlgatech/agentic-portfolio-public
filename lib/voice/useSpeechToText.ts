"use client";

// ─────────────────────────────────────────────────────────────────────────────
// useSpeechToText — a tiny, dependency-free React hook over the Web Speech API.
//
// Framework-agnostic core of the reusable "voice input" capability. It knows
// nothing about CopilotKit or this portfolio — it just turns speech into text
// callbacks. Pair it with <VoiceInput> (which binds it to a text field) or call
// it directly. Transportable: copy lib/voice/ into any React app.
//
// Browser support: Chrome/Edge/Safari (webkitSpeechRecognition). `supported` is
// false elsewhere (e.g. Firefox) so callers can hide the mic gracefully.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings — the Web Speech API isn't in the standard TS DOM lib.
type SpeechRecognitionResultLike = { 0: { transcript: string }; isFinal: boolean };
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechRecognitionResultLike };
};
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type UseSpeechToText = {
  supported: boolean;
  listening: boolean;
  /** Last error code from the engine, if any (e.g. "not-allowed", "no-speech"). */
  error: string | null;
  start: () => void;
  stop: () => void;
  toggle: () => void;
};

export function useSpeechToText(opts: {
  /** Called with the cumulative FINAL transcript for the current session. */
  onFinal?: (text: string) => void;
  /** Called continuously with the in-progress (interim) transcript. */
  onInterim?: (text: string) => void;
  /** BCP-47 language tag. Default: the browser's language, else en-US. */
  lang?: string;
  /** Keep listening until stopped (default true). */
  continuous?: boolean;
} = {}): UseSpeechToText {
  const { onFinal, onInterim, lang, continuous = true } = opts;
  const [supported] = useState(() => getRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  // Keep latest callbacks in refs so we don't rebuild the recognizer each render.
  const cb = useRef({ onFinal, onInterim });
  cb.current = { onFinal, onInterim };

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    // Tear down any prior session.
    try { recRef.current?.abort(); } catch { /* ignore */ }

    const rec = new Ctor();
    rec.lang = lang || (typeof navigator !== "undefined" ? navigator.language : "en-US") || "en-US";
    rec.continuous = continuous;
    rec.interimResults = true;

    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (interim) cb.current.onInterim?.(interim);
      if (finalText) cb.current.onFinal?.(finalText);
    };
    rec.onerror = (ev) => {
      setError(ev.error);
      setListening(false);
    };
    rec.onend = () => setListening(false);

    recRef.current = rec;
    setError(null);
    try {
      rec.start();
      setListening(true);
    } catch {
      // start() throws if called while already started — ignore.
    }
  }, [lang, continuous]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  // Clean up on unmount.
  useEffect(() => () => { try { recRef.current?.abort(); } catch { /* ignore */ } }, []);

  return { supported, listening, error, start, stop, toggle };
}

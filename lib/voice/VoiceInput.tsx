"use client";

// ─────────────────────────────────────────────────────────────────────────────
// <VoiceInput> — a reusable, drop-in mic that dictates speech into ANY text
// field on the page. Self-contained: it finds the target <textarea>/<input> by
// CSS selector (waiting for it to appear via MutationObserver, so it works with
// lazily-mounted UIs like the CopilotKit chat), injects a mic button into the
// field, and streams the transcript in live using the React-safe native value
// setter (so controlled inputs update their state).
//
// Reuse anywhere:
//   <VoiceInput targetSelector="textarea" />                 // any textarea
//   <VoiceInput targetSelector="#chat-input" lang="en-US" /> // a specific field
// Drop the whole lib/voice/ folder into another React app — no other deps.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSpeechToText } from "./useSpeechToText";

const DEFAULT_SELECTOR =
  "textarea[placeholder='Type a message...'], .copilotKitInput textarea, textarea, input[type='text']";

function setNativeValue(el: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true })); // React tracks via this
}

export function VoiceInput({
  targetSelector = DEFAULT_SELECTOR,
  lang,
  title = "Dictate by voice",
}: {
  targetSelector?: string;
  lang?: string;
  title?: string;
}) {
  const [target, setTarget] = useState<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const baseRef = useRef(""); // text already in the field when dictation started
  const finalRef = useRef(""); // cumulative final transcript this session

  // Find the target field, and keep finding it as the UI mounts/unmounts it.
  useEffect(() => {
    const find = () =>
      document.querySelector(targetSelector) as HTMLTextAreaElement | HTMLInputElement | null;
    setTarget(find());
    const obs = new MutationObserver(() => {
      const el = find();
      setTarget((prev) => (prev && document.contains(prev) ? prev : el));
    });
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [targetSelector]);

  const write = (transcriptTail: string) => {
    if (!target) return;
    setNativeValue(target, baseRef.current + finalRef.current + transcriptTail);
  };

  const stt = useSpeechToText({
    lang,
    onInterim: (interim) => write(interim),
    onFinal: (final) => {
      finalRef.current = final;
      write("");
    },
  });

  // Make failures visible instead of silent — the #1 reason "the mic does
  // nothing" is a denied/blocked permission, which otherwise leaves no trace.
  useEffect(() => {
    if (!stt.error) return;
    const human: Record<string, string> = {
      "not-allowed": "Microphone permission was blocked. Click the 🔒/site-settings icon in the address bar, allow the mic, and try again.",
      "service-not-allowed": "Microphone permission was blocked by the browser or OS.",
      "no-speech": "Didn't catch any speech — try again and speak after the mic turns red.",
      "audio-capture": "No microphone was found.",
      "network": "Speech service is unreachable (check your connection).",
    };
    // eslint-disable-next-line no-console
    console.warn("[VoiceInput] speech recognition error:", stt.error);
    if (stt.error === "not-allowed" || stt.error === "service-not-allowed" || stt.error === "audio-capture") {
      window.alert(human[stt.error] ?? `Voice input error: ${stt.error}`);
    }
  }, [stt.error]);

  function onMicClick() {
    if (!target) return;
    if (stt.listening) {
      stt.stop();
      return;
    }
    // Capture what's already typed; dictation appends after it.
    const existing = target.value;
    baseRef.current = existing && !existing.endsWith(" ") ? existing + " " : existing;
    finalRef.current = "";
    target.focus();
    stt.start();
  }

  // Give the field room for the mic on its left, so typed text doesn't overlap.
  useEffect(() => {
    if (!target) return;
    const prev = target.style.paddingLeft;
    target.style.paddingLeft = "2.4rem";
    return () => { target.style.paddingLeft = prev; };
  }, [target]);

  if (!target || !stt.supported) return null;

  const parent = target.parentElement;
  if (!parent) return null;
  if (getComputedStyle(parent).position === "static") parent.style.position = "relative";

  return createPortal(
    <button
      type="button"
      onClick={onMicClick}
      title={stt.listening ? "Stop dictation" : title}
      aria-label={stt.listening ? "Stop dictation" : title}
      style={{
        position: "absolute",
        left: "0.5rem",
        top: "50%",
        transform: "translateY(-50%)",
        width: "1.7rem",
        height: "1.7rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "9999px",
        border: "none",
        cursor: "pointer",
        zIndex: 10,
        background: stt.listening ? "var(--accent, #c2410c)" : "transparent",
        color: stt.listening ? "var(--onaccent, #fff)" : "var(--muted, #6b7280)",
        transition: "background 120ms ease",
      }}
    >
      <span
        style={{
          fontSize: "1rem",
          lineHeight: 1,
          animation: stt.listening ? "voiceinput-pulse 1s ease-in-out infinite" : undefined,
        }}
      >
        🎤
      </span>
      <style>{`@keyframes voiceinput-pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
    </button>,
    parent,
  );
}

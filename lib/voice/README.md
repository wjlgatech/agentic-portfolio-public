# `lib/voice` — reusable voice input (speech → text)

A self-contained, dependency-free voice-dictation capability for React apps. Drop
a mic into **any** text field; speak, and your words stream into the field. Built
on the browser's Web Speech API — no API keys, no cost, no backend.

Designed to be **transportable**: copy this whole folder into another React/Next.js
project and it works. Nothing here imports the portfolio or CopilotKit.

## Use it

Attach a mic to a field that already exists (or mounts later, like a chat box):

```tsx
import { VoiceInput } from "@/lib/voice";

// Anywhere in your tree (renders nothing until it finds the field):
<VoiceInput targetSelector="#chat-input" />
```

`VoiceInput` finds the target with a `MutationObserver`, so it works with lazily
mounted UIs (e.g. a chat panel that only renders when opened). It writes into
controlled inputs safely via the native value setter + an `input` event, so React
state updates correctly.

Props:

| Prop | Default | Notes |
|---|---|---|
| `targetSelector` | common chat/textarea selectors | CSS selector for the field to dictate into |
| `lang` | browser language → `en-US` | BCP-47 tag, e.g. `en-US`, `es-ES` |
| `title` | `"Dictate by voice"` | tooltip / aria-label |

## Or use the hook directly

For custom UI, skip the component and use the core hook:

```tsx
import { useSpeechToText } from "@/lib/voice";

const { supported, listening, toggle } = useSpeechToText({
  onInterim: (t) => console.log("…", t),
  onFinal: (t) => console.log("final:", t),
});

{supported && <button onClick={toggle}>{listening ? "Stop" : "Speak"}</button>}
```

## Notes

- **Support:** Chrome, Edge, Safari (`webkitSpeechRecognition`). On unsupported
  browsers (Firefox), `supported` is `false` and `<VoiceInput>` renders nothing —
  the field still works by typing.
- **Permission:** the first use prompts for microphone access.
- **Privacy:** Chrome streams audio to Google's speech service for transcription;
  Safari uses on-device recognition. No audio is stored by this module.

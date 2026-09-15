# Mentor Chat UI Redesign — Attachment Sheet, Voice Mode Shell, Input Pill

## Scope note

Three separate UI components, inspired by ChatGPT and Google AI Mode but
adapted to Opus Devia's existing dark/crimson design system. Voice mode
is UI/animation only in this pass — no Whisper or TTS wiring yet, that's
a separate follow-up task once this shell exists. Do not let Copilot
scope-creep into building the actual voice pipeline.

---

## Component 1 — Attachment bottom sheet

Replaces whatever currently happens when the `+` icon is tapped in
`MessageInput.tsx`. Instead of a single native file picker, tapping `+`
opens a bottom sheet with four options, matching capabilities already
built tonight (vision + link fetch).

### Visual spec

- Bottom sheet slides up from the bottom, dark glass background
  matching existing design system: `background: rgba(26,29,39,0.85)`,
  `backdrop-filter: blur(24px)`, rounded top corners `20px`
- Dimmed overlay behind it: `background: rgba(0,0,0,0.6)`, tap outside
  to dismiss
- Drag handle bar at top, same style as `TaskDetailModal`'s existing
  handle
- Four rows, each with a circular icon on the left and label text,
  matching the ChatGPT reference layout but restyled:

```tsx
const ATTACHMENT_OPTIONS = [
  { id: 'camera', label: 'Camera', icon: CameraIcon },
  { id: 'photos', label: 'Photos', icon: ImageIcon },
  { id: 'files', label: 'Files', icon: PaperclipIcon },
  { id: 'link', label: 'Paste Link', icon: LinkIcon },
]
```

Each row styling:
```css
display: flex;
align-items: center;
gap: 16px;
padding: 14px 20px;
```

Icon circle:
```css
width: 44px;
height: 44px;
border-radius: 50%;
background: rgba(255,255,255,0.06);
display: flex;
align-items: center;
justify-content: center;
color: #F5F5F5;
```

Label text: `16px`, `#F5F5F5`, medium weight.

On tap of a row, subtle background flash `rgba(154,0,0,0.1)` then
dismiss the sheet and trigger the corresponding action:

- **Camera** — opens device camera directly (native file input with
  `capture="environment"` attribute), resulting image goes through the
  existing vision upload flow already built
- **Photos** — opens device photo picker (native file input, no
  capture attribute), resulting image goes through the existing vision
  upload flow
- **Files** — opens device file picker filtered to accepted document
  types; if the selected file is an image, route through vision;
  document types beyond images are out of scope for now unless already
  supported — do not build new document parsing here
- **Paste Link** — opens a small inline text input (not a separate
  screen) directly above the message input, placeholder "Paste a URL",
  with a checkmark button to confirm — on confirm, the URL is sent
  through the existing `fetch_link` flow already built, and the small
  input closes

### Component structure

```
src/components/mentor/AttachmentSheet.tsx  — new
src/components/mentor/MessageInput.tsx     — modified to trigger sheet
```

`AttachmentSheet` takes props:
```tsx
interface AttachmentSheetProps {
  isOpen: boolean
  onClose: () => void
  onCameraSelect: () => void
  onPhotoSelect: (file: File) => void
  onFileSelect: (file: File) => void
  onLinkSubmit: (url: string) => void
}
```

`MessageInput.tsx`'s existing `+` icon onClick now sets
`isAttachmentSheetOpen` to true instead of whatever it currently does,
and renders `<AttachmentSheet>` conditionally.

---

## Component 2 — Voice mode full-screen shell

A new, separate full-screen page/overlay, entered by tapping the mic
icon in `MessageInput.tsx`. Exits back to the text chat on tap anywhere
on screen or a dedicated close button. This is UI ONLY — pressing
record does not yet actually transcribe or respond, it just shows the
visual state. Wire this up for real in a follow-up task once Whisper/
TTS are built.

### Visual spec — waveform, not an orb

Full black background, matching the rest of the mentor chat. Centered
in the middle of the screen: an animated horizontal waveform — a row of
vertical bars that idle with a slow gentle pulse when not "listening,"
and animate more energetically (varying bar heights, faster movement)
when in a simulated "listening" state.

```tsx
// Waveform component — CSS-animated bars, no audio processing yet
const WAVEFORM_BAR_COUNT = 24

function VoiceWaveform({ isListening }: { isListening: boolean }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      height: '80px',
    }}>
      {Array.from({ length: WAVEFORM_BAR_COUNT }).map((_, i) => (
        <div
          key={i}
          style={{
            width: '3px',
            borderRadius: '2px',
            background: '#9a0000',
            height: '20%',
            animation: isListening
              ? `waveformActive 0.6s ease-in-out ${i * 0.05}s infinite alternate`
              : `waveformIdle 2.4s ease-in-out ${i * 0.08}s infinite alternate`,
          }}
        />
      ))}
    </div>
  )
}
```

CSS keyframes (add to index.css):
```css
@keyframes waveformIdle {
  from { height: 15%; opacity: 0.4; }
  to   { height: 30%; opacity: 0.7; }
}

@keyframes waveformActive {
  from { height: 20%; opacity: 0.6; }
  to   { height: 90%; opacity: 1; }
}
```

The random-looking stagger comes from each bar having a different
animation delay (`i * 0.05s` etc), not from actual audio data — this is
a convincing idle/listening visual, not real waveform analysis. Once
real voice input is wired in later, the bar heights can be driven by
actual audio amplitude instead of CSS keyframes, but that's out of
scope for this pass.

### Page layout, top to bottom

- Close button (X or down chevron) top left, dismisses back to text
  chat
- Center: the waveform, with a status label below it that changes based
  on state:
  - Idle/ready: "Tap to speak"
  - Listening (simulated): "Listening..."
  - Processing (simulated): "Thinking..."
- Below the waveform: a single large circular mic button, crimson
  `#9a0000` background, tap to toggle between idle and listening state
  (visual only, per scope)
- Bottom: small text link "Switch to text" that exits back to normal
  chat, and a settings-style row (visual only, matching the reference
  image's language/audio output rows) — can be built as static/
  non-functional placeholders since actual voice settings don't exist
  yet

### Component structure

```
src/pages/VoiceMode.tsx  — new, full-screen page/overlay
```

Rendered as an overlay on top of `MentorChat.tsx` rather than a
separate route, so it can slide in/out smoothly:

```tsx
{isVoiceModeOpen && (
  <VoiceMode onClose={() => setIsVoiceModeOpen(false)} />
)}
```

Entrance/exit animation: fade + slight scale, 250ms ease, matching the
transition feel already used elsewhere in the app (e.g. message entrance
animations).

---

## Component 3 — Input pill redesign

The message input bar gets restyled to more closely match the Google AI
Mode reference — rounded pill, icons arranged inside/beside it — while
keeping Opus Devia's existing glass aesthetic rather than copying
Google's flat style directly.

### Current vs new layout

Keep the existing glass styling already built (`rgba(26,29,39,0.5)`,
`backdrop-filter: blur(16px)`, crimson focus border) — this redesign is
about icon arrangement and the addition of the mic-triggers-voice-mode
behavior, not a full visual overhaul of colors.

**New icon arrangement inside the pill, left to right:**
1. `+` icon — opens `AttachmentSheet` (Component 1)
2. Text input field — flex-grow, placeholder text as already built
3. Mic icon — opens `VoiceMode` (Component 2) when input is empty
4. Send button (crimson circle, arrow icon) — replaces the mic icon in
   the same position once the user has typed text, matching the
   existing "send button only shows when input has text" behavior
   already built

```tsx
{inputText.length > 0 ? (
  <SendButton onClick={handleSend} />
) : (
  <button onClick={() => setIsVoiceModeOpen(true)} aria-label="Voice mode">
    <MicIcon size={20} color="#A8A8A8" />
  </button>
)}
```

This mirrors the Google reference exactly — mic and send button occupy
the same visual slot, swapping based on whether there's text typed.

---

## Build order

1. Build `AttachmentSheet.tsx` in isolation, wire it into
   `MessageInput.tsx`'s `+` icon — test that all four options correctly
   trigger their existing flows (vision upload for camera/photos/files,
   `fetch_link` for paste link)
2. Build the waveform component and `VoiceMode.tsx` page shell —
   test the idle/listening visual toggle purely as UI, no real audio
   logic
3. Wire `VoiceMode` into `MentorChat.tsx` as an overlay triggered by the
   mic icon, test open/close transitions
4. Update the input pill's icon arrangement — mic/send button swap
   logic — test both states

**Explicitly out of scope for this build:** actual audio recording,
Whisper transcription, TTS playback, real waveform-from-audio rendering.
These are follow-up work once this visual shell exists and is confirmed
working.

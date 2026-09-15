import { useState } from "react";
import "./VoiceMode.css";

interface VoiceModeProps {
  onClose: () => void;
}

const WAVEFORM_BAR_COUNT = 24;

type VoiceState = "idle" | "listening";

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 11v1a7 7 0 0 1-14 0v-1M12 19v3M8 22h8" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function VoiceWaveform({ isListening }: { isListening: boolean }) {
  return (
    <div className="voice-waveform" aria-hidden="true">
      {Array.from({ length: WAVEFORM_BAR_COUNT }).map((_, index) => (
        <span
          key={index}
          className="voice-waveform-bar"
          style={{
            animationName: isListening ? "waveformActive" : "waveformIdle",
            animationDuration: isListening ? "0.6s" : "2.4s",
            animationDelay: `${index * (isListening ? 0.05 : 0.08)}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function VoiceMode({ onClose }: VoiceModeProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const isListening = voiceState === "listening";

  return (
    <div className="voice-mode" role="dialog" aria-modal="true" aria-label="Voice mode" onClick={onClose}>
      <button
        type="button"
        className="voice-mode-close"
        onClick={(event) => { event.stopPropagation(); onClose(); }}
        aria-label="Close voice mode"
      >
        <CloseIcon />
      </button>

      <main className="voice-mode-center">
        <VoiceWaveform isListening={isListening} />
        <p className="voice-mode-status">{isListening ? "Listening..." : "Tap to speak"}</p>
        <button
          type="button"
          className={`voice-mode-mic ${isListening ? "is-listening" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            setVoiceState((current) => current === "idle" ? "listening" : "idle");
          }}
          aria-label={isListening ? "Stop listening" : "Start listening"}
          aria-pressed={isListening}
        >
          <MicIcon />
        </button>
      </main>

      <footer className="voice-mode-footer">
        <button type="button" className="voice-mode-switch" onClick={onClose}>Switch to text</button>
        <div className="voice-mode-settings" aria-label="Voice settings">
          <span className="voice-mode-setting-label">
            <span className="voice-mode-setting-icon">A</span>
            Language
          </span>
          <span className="voice-mode-setting-value">English <ChevronIcon /></span>
        </div>
        <div className="voice-mode-settings" aria-label="Audio output">
          <span className="voice-mode-setting-label">
            <span className="voice-mode-setting-icon"><span className="voice-mode-speaker" /></span>
            Audio output
          </span>
          <span className="voice-mode-setting-value">Device <ChevronIcon /></span>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";

type LanguageMode = "auto" | "en" | "kn";

interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export default function Home() {
  const [languageMode, setLanguageMode] = useState<LanguageMode>("auto");
  const [inputText, setInputText] = useState("");
  const [currentQuery, setCurrentQuery] = useState<string>("");
  const [currentResponse, setCurrentResponse] = useState<string>("");
  const [currentSources, setCurrentSources] = useState<Array<{ title: string; source: string; category?: string }>>([]);
  const [responseLatency, setResponseLatency] = useState<number | null>(null);
  const [isResponding, setIsResponding] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState("");
  const [autoVoice, setAutoVoice] = useState(true);
  const [copied, setCopied] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [micSupported, setMicSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentTranscriptRef = useRef<string>("");
  const isSendingRef = useRef<boolean>(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Suggestions for quick interaction
  const suggestions = [
    { en: "Colleges under ACU", kn: "ACU ಅಡಿಯಲ್ಲಿರುವ ಕಾಲೇಜುಗಳು" },
    { en: "BGSIT Engineering Courses", kn: "BGSIT ಇಂಜಿನಿಯರಿಂಗ್ ಕೋರ್ಸ್‌ಗಳು" },
    { en: "MBBS Admission at AIMS", kn: "AIMS ವೈದ್ಯಕೀಯ ಪ್ರವೇಶ" },
    { en: "Hostel & Food Facilities", kn: "ಹಾಸ್ಟೆಲ್ ಮತ್ತು ಊಟದ ಸೌಲಭ್ಯ" },
    { en: "Admissions Helpline & Contact", kn: "ಪ್ರವೇಶ ಸಹಾಯವಾಣಿ ಮತ್ತು ಸಂಪರ್ಕ" },
    { en: "Who is the Vice-Chancellor?", kn: "ವಿಶ್ವವಿದ್ಯಾಲಯದ ಉಪಕುಲಪತಿಗಳು ಯಾರು?" },
  ];

  // Load and cache voices when ready
  const loadVoices = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        voicesRef.current = v;
      }
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSpeechSupported("speechSynthesis" in window);
      const SpeechRecognition =
        (window as IWindow).SpeechRecognition ||
        (window as IWindow).webkitSpeechRecognition;
      setMicSupported(!!SpeechRecognition);

      if ("speechSynthesis" in window) {
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  const fallbackWebSpeech = (text: string, lang?: "en" | "kn") => {
    if (!speechSupported || !autoVoice || typeof window === "undefined") return;
    try {
      window.speechSynthesis.cancel();
      const cleanText = text
        .replace(/^[Jj]ai [Ss]ri [Gg]urudev 🙏\s*/i, "")
        .replace(/^ಜೈ ಶ್ರೀ ಗುರುದೇವ್ 🙏\s*/i, "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/[*#_`•-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!cleanText) return;
      const isKannada = lang === "kn" || /[\u0C80-\u0CFF]/.test(text);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = isKannada ? "kn-IN" : "en-IN";
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const speakText = async (text: string, lang?: "en" | "kn") => {
    if (!autoVoice || typeof window === "undefined") return;
    stopSpeaking();

    const isKannada = lang === "kn" || /[\u0C80-\u0CFF]/.test(text);

    try {
      setIsSpeaking(true);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          language: isKannada ? "kn" : "en",
        }),
      });

      if (!res.ok) {
        throw new Error("Neural TTS failed");
      }

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;

      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioPlayerRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioPlayerRef.current = null;
        fallbackWebSpeech(text, lang);
      };

      await audio.play();
    } catch (err) {
      console.warn("Using fallback speech synthesis:", err);
      fallbackWebSpeech(text, lang);
    }
  };

  const sendQuery = async (customQuery?: string) => {
    const queryToSend = (customQuery || inputText).trim();
    if (!queryToSend || isResponding || isSendingRef.current) return;
    isSendingRef.current = true;
    stopSpeaking();
    setIsListening(false);
    setSpeechTranscript("");
    currentTranscriptRef.current = "";
    setCurrentQuery(queryToSend);
    setCurrentResponse("");
    setCurrentSources([]);
    setInputText("");
    setIsResponding(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: queryToSend, language: languageMode }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const answerText = data.answer || "Jai Sri Gurudev 🙏\n\nI can assist you with information about Adichunchanagiri University.";
      const detectedLang = data.language as "en" | "kn";
      setCurrentResponse(answerText);
      setCurrentSources(data.sources || []);
      if (typeof data.latency_ms === "number") {
        setResponseLatency(data.latency_ms);
      }
      speakText(answerText, detectedLang);
    } catch (error: any) {
      console.error("SARATHI Chat error:", error);
      const isNetwork = error instanceof TypeError && /fetch|failed|network/i.test(error.message);
      const isKn = languageMode === "kn" || /[\u0C80-\u0CFF]/.test(queryToSend);
      const errorMessage = isKn
        ? (isNetwork
            ? "ಜೈ ಶ್ರೀ ಗುರುದೇವ್ 🙏\n\nಸರ್ವರ್‌ಗೆ ಸಂಪರ್ಕಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ಸರ್ವರ್ ಚಾಲನೆಯಲ್ಲಿದೆಯೇ ಎಂದು ಪರಿಶೀಲಿಸಿ."
            : "ಜೈ ಶ್ರೀ ಗುರುದೇವ್ 🙏\n\nಕ್ಷಮಿಸಿ, ವಿನಂತಿಯನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ.")
        : (isNetwork
            ? "Jai Sri Gurudev 🙏\n\nUnable to connect to the SARATHI server. Please verify the server is running."
            : "Jai Sri Gurudev 🙏\n\nSorry, I couldn't process your request right now.");
      setCurrentResponse(errorMessage);
      speakText(errorMessage);
    } finally {
      setIsResponding(false);
      isSendingRef.current = false;
    }
  };

  const toggleListening = () => {
    if (!micSupported) return;
    stopSpeaking();
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      if (currentTranscriptRef.current.trim()) sendQuery(currentTranscriptRef.current.trim());
      return;
    }
    const SpeechRecognition = (window as IWindow).SpeechRecognition || (window as IWindow).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = languageMode === "kn" ? "kn-IN" : "en-IN";
    recognition.onstart = () => {
      setIsListening(true);
      setSpeechTranscript("");
      currentTranscriptRef.current = "";
    };
    recognition.onresult = (event: any) => {
      let fullTranscript = "";
      let hasFinal = false;
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript;
        if (event.results[i].isFinal) hasFinal = true;
      }
      const spoken = fullTranscript.trim();
      if (spoken) {
        setSpeechTranscript(spoken);
        setInputText(spoken);
        currentTranscriptRef.current = spoken;
        if (hasFinal) {
          recognition.stop();
          setIsListening(false);
          sendQuery(spoken);
        }
      }
    };
    recognition.onend = () => {
      setIsListening(false);
      if (currentTranscriptRef.current.trim() && !isSendingRef.current && !isResponding) {
        sendQuery(currentTranscriptRef.current.trim());
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") sendQuery();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getBloomState = () => {
    if (isListening) return "bloom-listening";
    if (isResponding) return "bloom-thinking";
    if (isSpeaking) return "bloom-speaking";
    return "bloom-idle";
  };

  return (
    <main className="chatgpt-voice-page">
      {/* Background Starry Galaxy Canvas */}
      <div className="galaxy-bg">
        <div className="stars"></div>
        <div className="nebula-glow nebula-top"></div>
        <div className="nebula-glow nebula-bottom"></div>
      </div>

      <div className="chatgpt-voice-container">
        {/* Top Header Bar */}
        <header className="voice-header">
          <div className="header-brand">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
              <span className="brand-badge">SARATHI • ಸಾರಥಿ</span>
              <span className="db-badge">🟢 Supabase pgvector</span>
              <span className="db-badge" style={{ borderColor: "rgba(56,189,248,0.4)", color: "#38bdf8" }}>🎙️ Neural HD Voice</span>
            </div>
            <h1 className="brand-title">Adichunchanagiri University</h1>
          </div>

          <div className="header-controls">
            {/* Language Switcher */}
            <div className="lang-pill" role="group" aria-label="Language Mode">
              <button
                type="button"
                className={`lang-option ${languageMode === "auto" ? "active" : ""}`}
                onClick={() => setLanguageMode("auto")}
              >
                🌐 Auto
              </button>
              <button
                type="button"
                className={`lang-option ${languageMode === "en" ? "active" : ""}`}
                onClick={() => setLanguageMode("en")}
              >
                English
              </button>
              <button
                type="button"
                className={`lang-option ${languageMode === "kn" ? "active" : ""}`}
                onClick={() => setLanguageMode("kn")}
              >
                ಕನ್ನಡ
              </button>
            </div>

            {/* Voice Toggle */}
            <button
              type="button"
              className={`voice-icon-btn ${autoVoice ? "active" : ""}`}
              onClick={() => {
                if (isSpeaking) stopSpeaking();
                setAutoVoice(!autoVoice);
              }}
              title={autoVoice ? "Voice Output Active (Click to Mute)" : "Voice Muted (Click to Unmute)"}
              aria-label="Toggle Voice"
            >
              {autoVoice ? "🔊" : "🔇"}
            </button>
          </div>
        </header>

        {/* Central Immersive Voice Assistant Stage (ChatGPT Voice Style) */}
        <section className="assistant-central-stage">
          {/* Glowing Blooming Avatar */}
          <div
            className={`voice-avatar-stage ${getBloomState()}`}
            onClick={toggleListening}
            title={isListening ? "Listening... Click to Stop" : "Click to Speak"}
          >
            <div className="blooming-aura">
              <div className="aura-ring ring-1"></div>
              <div className="aura-ring ring-2"></div>
              <div className="aura-ring ring-3"></div>

              {/* Robot Face */}
              <div className="robot-head">
                <div className="robot-visor">
                  <span className="antenna left-antenna"></span>
                  <span className="antenna right-antenna"></span>
                  <span className="eye left-eye"></span>
                  <span className="eye right-eye"></span>

                  <div className="mouth">
                    {isSpeaking ? (
                      <div className="voice-equalizer">
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    ) : isListening ? (
                      <div className="mic-wave-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    ) : (
                      <div className="mouth-smile"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Assistant Status Badge */}
          <div className="voice-status-pill">
            <span
              className={`status-light ${
                isListening
                  ? "listening"
                  : isResponding
                  ? "responding"
                  : isSpeaking
                  ? "speaking"
                  : "idle"
              }`}
            ></span>
            <span className="status-label">
              {isListening
                ? "Listening... Speak your question"
                : isResponding
                ? "Analyzing ACU Knowledge..."
                : isSpeaking
                ? "Saarthi Speaking..."
                : "Tap Microphone to Speak"}
            </span>
            {isSpeaking && (
              <button
                type="button"
                className="stop-btn"
                onClick={stopSpeaking}
                title="Stop Speaking"
              >
                ⏹ Stop
              </button>
            )}
          </div>

          {/* Active Live Spoken Preview (While User Speaks) */}
          {isListening && speechTranscript && (
            <div className="live-speech-card">
              <span className="live-label">🎙️ YOU ARE SAYING:</span>
              <p className="live-text">"{speechTranscript}"</p>
            </div>
          )}

          {/* Active Dialogue Display (User Question & Saarthi Answer - Single Turn View) */}
          {!isListening && (currentQuery || currentResponse) ? (
            <div className="active-turn-card">
              {/* User Question */}
              {currentQuery && (
                <div className="turn-user-box">
                  <span className="turn-role-tag">👤 You asked</span>
                  <p className="turn-query-text">{currentQuery}</p>
                </div>
              )}

              {/* Assistant Answer */}
              {isResponding ? (
                <div className="turn-assistant-box thinking">
                  <div className="galaxy-typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="thinking-note">Fetching verified ACU information...</span>
                </div>
              ) : currentResponse ? (
                <div className="turn-assistant-box">
                  <div className="turn-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="turn-assistant-tag">🤖 SARATHI</span>
                      {responseLatency && (
                        <span className="latency-badge" title="Verified retrieval from Supabase pgvector + Groq">
                          ⚡ {(responseLatency / 1000).toFixed(2)}s • Grounded
                        </span>
                      )}
                    </div>
                    <div className="card-actions">
                      <button
                        type="button"
                        className="card-tool-btn"
                        onClick={() => speakText(currentResponse)}
                        title="Replay Voice"
                        aria-label="Replay Voice"
                      >
                        🔊
                      </button>
                      <button
                        type="button"
                        className="card-tool-btn"
                        onClick={() => copyToClipboard(currentResponse)}
                        title={copied ? "Copied!" : "Copy text"}
                        aria-label="Copy text"
                      >
                        {copied ? "✓" : "📋"}
                      </button>
                    </div>
                  </div>

                  <div className="turn-response-content">
                    {currentResponse.split("\n").map((line, i) => (
                      <p key={i} className="response-line">
                        {line}
                      </p>
                    ))}
                  </div>

                  {/* Sources */}
                  {currentSources.length > 0 && (
                    <div className="turn-sources">
                      <span className="source-title">Official Source:</span>
                      {currentSources.map((s, idx) => (
                        <a
                          key={idx}
                          href={s.source}
                          target="_blank"
                          rel="noreferrer"
                          className="source-link"
                        >
                          {s.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            /* Quick Suggestion Chips (When Idle & No Active Turn) */
            !isListening && (
              <div className="quick-starters-tray">
                <span className="starters-label">Try asking:</span>
                <div className="starters-grid">
                  {suggestions.map((item, index) => {
                    const text = languageMode === "kn" ? item.kn : item.en;
                    return (
                      <button
                        key={index}
                        type="button"
                        className="starter-chip"
                        onClick={() => sendQuery(text)}
                      >
                        {text}
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </section>

        {/* Bottom Giant ChatGPT Mic Bar */}
        <footer className="voice-footer">
          <div className="voice-input-wrapper">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening
                  ? "Listening... Speak your question..."
                  : "Ask about ACU (Courses, Admissions, Leadership, Hostels)..."
              }
              className="voice-text-field"
              disabled={isResponding}
            />

            {/* Giant ChatGPT Style Voice Mic Button */}
            {micSupported && (
              <button
                type="button"
                className={`giant-voice-btn ${isListening ? "active-recording" : ""}`}
                onClick={toggleListening}
                disabled={isResponding}
                title={isListening ? "Stop & Submit" : "Click to Speak"}
                aria-label="Microphone"
              >
                {isListening ? "⏹" : "🎤"}
              </button>
            )}

            {/* Send Button */}
            <button
              type="button"
              className="voice-send-btn"
              onClick={() => sendQuery()}
              disabled={isResponding || !inputText.trim()}
              aria-label="Send query"
            >
              ➤
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}
import { useEffect, useRef, useState } from "react";

export function useSpeechRecognition(lang: string = "en-US") {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const finalRef = useRef("");
  const wantListeningRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalRef.current += res[0].transcript + " ";
        else interim += res[0].transcript;
      }
      setTranscript(finalRef.current + interim);
    };
    recognition.onend = () => {
      // Auto-restart if user still wants to be listening (browsers stop on silence)
      if (wantListeningRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          // fall through to stop
        }
      }
      setListening(false);
    };
    recognition.onerror = (e: any) => {
      const code = e?.error || "unknown";
      if (code === "not-allowed" || code === "service-not-allowed") {
        setError("Microphone access blocked. Allow mic permission in your browser.");
        wantListeningRef.current = false;
      } else if (code === "no-speech") {
        // common; ignore — onend will retry
        return;
      } else if (code === "audio-capture") {
        setError("No microphone detected.");
        wantListeningRef.current = false;
      } else if (code !== "aborted") {
        setError(`Voice error: ${code}`);
      }
      setListening(false);
    };
    recognitionRef.current = recognition;

    return () => {
      wantListeningRef.current = false;
      try {
        recognition.stop();
      } catch {}
    };
  }, [lang]);

  const start = () => {
    if (!recognitionRef.current) return;
    setError(null);
    wantListeningRef.current = true;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      // already started
      setListening(true);
    }
  };
  const stop = () => {
    wantListeningRef.current = false;
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {}
    setListening(false);
  };
  const reset = (initial = "") => {
    finalRef.current = initial ? initial + " " : "";
    setTranscript(initial);
  };

  return { transcript, listening, supported, error, start, stop, reset, setTranscript };
}

"use client";

import { useRef, useState } from "react";

export default function HomePage() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      setErrorMessage("");
      setAudioUrl(null);

      // Ask user for microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // Create recorder using the microphone stream
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Store audio chunks as they become available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // When recording stops, create an audio file URL
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Stop microphone access
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone access error:", error);
      setErrorMessage("Microphone access was denied or unavailable.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-xl rounded-2xl p-10 w-full max-w-md text-center">
        <h1 className="text-4xl font-bold mb-2">interpretit.ai</h1>

        <p className="text-gray-500 mb-8">
          Spanish Medical Speech Interpreter
        </p>

        <button
          onClick={handleRecording}
          className={`w-full py-4 rounded-xl text-white text-xl font-semibold transition duration-200 ${
            isRecording
              ? "bg-red-600 hover:bg-red-700"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isRecording ? "Stop" : "Record"}
        </button>

        <p className="mt-6 text-gray-500">
          {isRecording ? "Recording Spanish speech..." : "Press Record to begin"}
        </p>

        {errorMessage && (
          <p className="mt-4 text-red-600 font-medium">{errorMessage}</p>
        )}

        {audioUrl && (
          <div className="mt-6">
            <p className="text-sm text-gray-500 mb-2">Recorded audio:</p>
            <audio controls src={audioUrl} className="w-full" />
          </div>
        )}
      </div>
    </main>
  );
}
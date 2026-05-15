"use client";

import { useRef, useState } from "react";
import {
  createAudioBlob,
  createAudioUrl,
  uploadAudio,
} from "@/lib/api";

export default function HomePage() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [spanishTranscript, setSpanishTranscript] = useState("");
  const [englishInterpretation, setEnglishInterpretation] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      setErrorMessage("");
      setAudioUrl(null);

      setSpanishTranscript("");
      setEnglishInterpretation("");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = createAudioBlob(audioChunksRef.current);

        const url = createAudioUrl(audioBlob);
        setAudioUrl(url);

        stream.getTracks().forEach((track) => track.stop());

        try {
          const data = await uploadAudio(audioBlob);

          console.log("Backend Response:", data);

          setSpanishTranscript(
            data.spanish_transcript || ""
          );

          setEnglishInterpretation(
            data.english_interpretation || ""
          );
        } catch (error) {
          console.error("Upload error:", error);
          setErrorMessage("Failed to send audio to backend.");
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone access error:", error);
      setErrorMessage(
        "Microphone access was denied or unavailable."
      );
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
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white shadow-xl rounded-2xl p-10 w-full max-w-5xl">

        {/* Title */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">
            interpretit.ai
          </h1>

          <p className="text-gray-500 mb-8">
            Spanish Medical Speech Interpreter
          </p>
        </div>

        {/* Record Button */}
        <div className="flex justify-center">
          <button
            onClick={handleRecording}
            className={`px-10 py-4 rounded-xl text-white text-xl font-semibold transition duration-200 ${
              isRecording
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isRecording ? "Stop" : "Record"}
          </button>
        </div>

        {/* Recording Status */}
        <p className="mt-6 text-center text-gray-500">
          {isRecording
            ? "Recording Spanish speech..."
            : "Press Record to begin"}
        </p>

        {/* Errors */}
        {errorMessage && (
          <p className="mt-4 text-center text-red-600 font-medium">
            {errorMessage}
          </p>
        )}

        {/* Audio Playback */}
        {audioUrl && (
          <div className="mt-8">
            <p className="text-sm text-gray-500 mb-2 text-center">
              Recorded Audio
            </p>

            <audio
              controls
              src={audioUrl}
              className="w-full"
            />
          </div>
        )}

        {/* Transcript + Interpretation */}
        {(spanishTranscript || englishInterpretation) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">

            {/* Spanish Transcript */}
            <div className="bg-gray-50 rounded-xl p-6 border">
              <h2 className="text-xl font-bold mb-4 text-red-600">
                Spanish Transcript
              </h2>

              <p className="text-gray-800 whitespace-pre-wrap">
                {spanishTranscript}
              </p>
            </div>

            {/* English Interpretation */}
            <div className="bg-gray-50 rounded-xl p-6 border">
              <h2 className="text-xl font-bold mb-4 text-blue-600">
                English Interpretation
              </h2>

              <p className="text-gray-800 whitespace-pre-wrap">
                {englishInterpretation}
              </p>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}
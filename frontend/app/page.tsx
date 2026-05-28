"use client";

import { useRef, useState } from "react";
import {
  createAudioBlob,
  createAudioUrl,
  uploadAudio,
} from "@/lib/api";

const LANGUAGES = [
  { label: "Spanish", value: "es" },
  { label: "English", value: "en" },
  { label: "Mandarin", value: "zh" },
  { label: "Vietnamese", value: "vi" },
  { label: "Tagalog", value: "tl" },
  { label: "Korean", value: "ko" },
  { label: "Russian", value: "ru" },
  { label: "Tamil", value: "ta" },
];

export default function HomePage() {
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [transcription, setTranscription] = useState("");
  const [interpretation, setInterpretation] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      setErrorMessage("");
      setAudioUrl(null);
      setTranscription("");
      setInterpretation("");

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
          const data = await uploadAudio(audioBlob, selectedLanguage);

          console.log("Backend Response:", data);

          setTranscription(data.transcription || "");
          setInterpretation(data.interpretation || "");
        } catch (error) {
          console.error("Upload error:", error);
          setErrorMessage("Failed to send audio to backend.");
        }
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

  if (!selectedLanguage) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <div className="bg-white shadow-xl rounded-2xl p-10 w-full max-w-md text-center">
          <h1 className="text-4xl font-bold mb-2">interpretit.ai</h1>

          <p className="text-gray-500 mb-8">
            Select the patient&apos;s spoken language
          </p>

          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="text-black w-full border rounded-xl px-4 py-3 text-lg"
          >
            <option value="">Choose language</option>
            {LANGUAGES.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
        </div>
      </main>
    );
  }

  const selectedLanguageLabel =
    LANGUAGES.find((lang) => lang.value === selectedLanguage)?.label ||
    selectedLanguage;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white shadow-xl rounded-2xl p-10 w-full max-w-5xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">interpretit.ai</h1>

          <p className="text-gray-500 mb-2">
            Medical Speech Interpreter
          </p>

          <p className="text-sm text-gray-500 mb-8">
            Selected Language:{" "}
            <span className="font-semibold">{selectedLanguageLabel}</span>
            {" "}
            <button
              onClick={() => setSelectedLanguage("")}
              className="text-blue-600 underline ml-2"
            >
              Change
            </button>
          </p>
        </div>

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

        <p className="mt-6 text-center text-gray-500">
          {isRecording
            ? `Recording ${selectedLanguageLabel} speech...`
            : "Press Record to begin"}
        </p>

        {errorMessage && (
          <p className="mt-4 text-center text-red-600 font-medium">
            {errorMessage}
          </p>
        )}

        {audioUrl && (
          <div className="mt-8">
            <p className="text-sm text-gray-500 mb-2 text-center">
              Recorded Audio
            </p>

            <audio controls src={audioUrl} className="w-full" />
          </div>
        )}

        {(transcription || interpretation) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            <div className="bg-gray-50 rounded-xl p-6 border">
              <h2 className="text-xl font-bold mb-4 text-red-600">
                Transcription
              </h2>

              <p className="text-gray-800 whitespace-pre-wrap">
                {transcription}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 border">
              <h2 className="text-xl font-bold mb-4 text-blue-600">
                English Interpretation
              </h2>

              <p className="text-gray-800 whitespace-pre-wrap">
                {interpretation}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
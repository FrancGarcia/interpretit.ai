"use client";

import { useState } from "react";

export default function HomePage() {
  // Tracks recording state
  const [isRecording, setIsRecording] = useState(false);

  // Toggle between Record and Stop
  const handleRecording = () => {
    setIsRecording((prev) => !prev);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-xl rounded-2xl p-10 w-full max-w-md text-center">

        {/* Title */}
        <h1 className="text-4xl font-bold mb-2">
          interpretit.ai
        </h1>

        {/* Subtitle */}
        <p className="text-gray-500 mb-8">
          Spanish Medical Speech Interpreter
        </p>

        {/* Record / Stop Button */}
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

        {/* Status Text */}
        <div className="mt-6">
          {isRecording ? (
            <p className="text-red-600 font-medium">
              Recording Spanish speech...
            </p>
          ) : (
            <p className="text-gray-500">
              Press Record to begin
            </p>
          )}
        </div>

      </div>
    </main>
  );
}
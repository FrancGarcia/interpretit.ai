"use client";

import { useRef, useState } from "react";
import { createAudioBlob, createAudioUrl, uploadAudio } from "@/lib/api";

const LANGUAGES = [
  { label: "Spanish", value: "es" },
  { label: "English", value: "en" },
  { label: "Mandarin", value: "zh" },
  { label: "Vietnamese", value: "vi" },
  { label: "Tagalog", value: "tl" },
  { label: "Korean", value: "ko" },
  { label: "Russian", value: "ru" },
  { label: "Tamil", value: "ta" },
  { label: "Hindi", value: "hi" },
];

const USERS = [
  { label: "Patient", value: "patient" },
  { label: "Physician", value: "physician" },
];

type Screen = "home" | "setup" | "record" | "patients" | "patientInfo";
type UserType = "patient" | "physician" | "";

type ConversationTurn = {
  input_user: string;
  output_user: string;
  transcription: string;
  interpretation: string;
  input_language: string;
  output_language: string;
};

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>("home");

  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [inputUser, setInputUser] = useState<UserType>("");
  const [outputUser, setOutputUser] = useState<UserType>("");

  const [inputLanguage, setInputLanguage] = useState("");
  const [outputLanguage, setOutputLanguage] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [patients, setPatients] = useState<any[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [patientSearch, setPatientSearch] = useState("");

  const [saveMessage, setSaveMessage] = useState("");

  const [conversation, setConversation] = useState<ConversationTurn[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  const inputLanguageLabel =
    LANGUAGES.find((lang) => lang.value === inputLanguage)?.label ||
    inputLanguage;

  const outputLanguageLabel =
    LANGUAGES.find((lang) => lang.value === outputLanguage)?.label ||
    outputLanguage;

  const inputUserLabel =
    USERS.find((user) => user.value === inputUser)?.label || inputUser;

  const outputUserLabel =
    USERS.find((user) => user.value === outputUser)?.label || outputUser;

  const resetSession = () => {
    setSessionId(crypto.randomUUID());
    setAudioUrl(null);
    setErrorMessage("");
    setSaveMessage("");
    setConversation([]);
    audioChunksRef.current = [];
  };

  const startNewSession = () => {
    resetSession();
    setInputUser("");
    setOutputUser("");
    setInputLanguage("");
    setOutputLanguage("");
    setScreen("setup");
  };

  const loadPatients = async () => {
    try {
      setIsLoadingPatients(true);
      setErrorMessage("");
      await getPatients();
      setScreen("patients");
    } catch (error) {
      console.error("Load patients error:", error);
      setErrorMessage("Failed to load patients.");
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const continueToRecording = () => {
    if (!inputUser || !outputUser || !inputLanguage || !outputLanguage) {
      setErrorMessage(
        "Please choose the input user, input language, output user, and output language."
      );
      return;
    }

    if (inputUser === outputUser) {
      setErrorMessage("Input user and output user must be different.");
      return;
    }

    if (inputLanguage === outputLanguage) {
      setErrorMessage("Input language and output language must be different.");
      return;
    }

    setErrorMessage("");
    setSaveMessage("");
    setAudioUrl(null);
    setScreen("record");
  };

  const getPatients = async () => {
    const response = await fetch(`${backendUrl}/sessions/get_patients`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch patients");
    }

    const data = await response.json();
    setPatients(data);
  };

  const saveSession = async () => {
    if (conversation.length === 0) {
      setErrorMessage("There are no conversation turns to save.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");
      setSaveMessage("");

      const response = await fetch(`${backendUrl}/sessions/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          turns: conversation,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save session.");
      }

      setSaveMessage("Session saved successfully.");
    } catch (error) {
      console.error("Save session error:", error);
      setErrorMessage("Failed to save session to MongoDB.");
    } finally {
      setIsSaving(false);
    }
  };

  const startRecording = async () => {
    try {
      setErrorMessage("");
      setSaveMessage("");
      setAudioUrl(null);

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
          const data = await uploadAudio(
            audioBlob,
            inputLanguage,
            outputLanguage,
            inputUser,
            outputUser
          );

          const newTurn: ConversationTurn = {
            input_user: inputUser,
            output_user: outputUser,
            transcription: data.transcription || "",
            interpretation: data.interpretation || "",
            input_language: inputLanguage,
            output_language: outputLanguage,
          };

          setConversation((previousConversation) => [
            ...previousConversation,
            newTurn,
          ]);
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

  if (screen === "home") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 p-6">
        <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-10 w-full max-w-md text-center border border-gray-200 dark:border-gray-800">
          <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">
            interpretit.ai
          </h1>

          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Start an interactive conversation between a patient and physician.
          </p>

          <div className="flex flex-col gap-4">
            <button
              onClick={startNewSession}
              className="w-full min-h-[56px] bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-xl font-semibold"
            >
              New Session
            </button>

            <button
              onClick={loadPatients}
              disabled={isLoadingPatients}
              className="w-full min-h-[56px] bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-4 rounded-xl text-xl font-semibold"
            >
              {isLoadingPatients ? "Loading Patients..." : "Load Patients"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (screen === "setup") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 p-6">
        <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-10 w-full max-w-2xl text-center border border-gray-200 dark:border-gray-800">
          <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">
            interpretit.ai
          </h1>

          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Choose who is speaking, who is receiving, and the languages.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">
                Input
              </h2>

              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                Input User
              </label>

              <select
                value={inputUser}
                onChange={(e) => setInputUser(e.target.value as UserType)}
                className="text-black dark:text-white bg-white dark:bg-gray-900 w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-lg mb-5"
              >
                <option value="">Choose input user</option>
                {USERS.map((user) => (
                  <option
                    key={user.value}
                    value={user.value}
                    disabled={user.value === outputUser}
                  >
                    {user.label}
                  </option>
                ))}
              </select>

              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                Input Language
              </label>

              <select
                value={inputLanguage}
                onChange={(e) => setInputLanguage(e.target.value)}
                className="text-black dark:text-white bg-white dark:bg-gray-900 w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-lg"
              >
                <option value="">Choose input language</option>
                {LANGUAGES.map((language) => (
                  <option
                    key={language.value}
                    value={language.value}
                    disabled={language.value === outputLanguage}
                  >
                    {language.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">
                Output
              </h2>

              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                Output User
              </label>

              <select
                value={outputUser}
                onChange={(e) => setOutputUser(e.target.value as UserType)}
                className="text-black dark:text-white bg-white dark:bg-gray-900 w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-lg mb-5"
              >
                <option value="">Choose output user</option>
                {USERS.map((user) => (
                  <option
                    key={user.value}
                    value={user.value}
                    disabled={user.value === inputUser}
                  >
                    {user.label}
                  </option>
                ))}
              </select>

              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                Output Language
              </label>

              <select
                value={outputLanguage}
                onChange={(e) => setOutputLanguage(e.target.value)}
                className="text-black dark:text-white bg-white dark:bg-gray-900 w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-lg"
              >
                <option value="">Choose output language</option>
                {LANGUAGES.map((language) => (
                  <option
                    key={language.value}
                    value={language.value}
                    disabled={language.value === inputLanguage}
                  >
                    {language.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {errorMessage && (
            <p className="mt-6 text-red-600 dark:text-red-400 font-medium">
              {errorMessage}
            </p>
          )}

          <button
            onClick={continueToRecording}
            className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl text-lg font-semibold"
          >
            Continue
          </button>

          <button
            onClick={() => setScreen("home")}
            className="block mx-auto mt-4 text-blue-600 dark:text-blue-400 underline"
          >
            Back
          </button>
        </div>
      </main>
    );
  }

  if (screen === "patients") {

    const filteredPatients = patients.filter((patient) =>
      patient.session_id
        ?.toLowerCase()
        .includes(patientSearch.toLowerCase())
    );

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 p-6">
      <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-10 w-full max-w-5xl border border-gray-200 dark:border-gray-800">
        <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">
          Patients
        </h1>

        <p className="text-gray-500 dark:text-gray-400 mb-8">
          List of patients loaded from MongoDB.
        </p>

        <input
          type="text"
          value={patientSearch}
          onChange={(e) => setPatientSearch(e.target.value)}
          placeholder="Search patients..."
          className="w-full mb-4 px-5 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="max-h-[500px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-200 dark:divide-gray-700">
          {filteredPatients.length === 0 ? (
            <p className="p-6 text-gray-500 dark:text-gray-400">
              No patients found.
            </p>
          ) : (
            filteredPatients.map((patient) => (
              <button
                key={patient._id}
                onClick={() => {
                  setSelectedPatient(patient);
                  setScreen("patientInfo");
                }}
                className="w-full text-left px-6 py-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {patient.session_id}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setScreen("home")}
            className="w-64 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-lg font-semibold transition"
          >
            Back to Home
          </button>
        </div>

      </div>
    </main>
  );
}

  if (screen === "patientInfo" && selectedPatient) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 p-6">
        <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-10 w-full max-w-5xl border border-gray-200 dark:border-gray-800">
          <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">
            {selectedPatient.session_id} - Patient Information
          </h1>

          <pre className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white p-6 rounded-xl overflow-x-auto">
            {JSON.stringify(selectedPatient, null, 2)}
          </pre>

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setScreen("patients")}
              className="w-64 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl text-lg font-semibold"
            >
              Back to Patients
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 p-6">
      <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-10 w-full max-w-5xl border border-gray-200 dark:border-gray-800">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">
            interpretit.ai
          </h1>

          <p className="text-gray-500 dark:text-gray-400 mb-2">
            {inputUserLabel} to {outputUserLabel} Session
          </p>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Translating {inputUserLabel} speech from{" "}
            <span className="font-bold text-gray-800 dark:text-gray-200">
              {inputLanguageLabel}
            </span>{" "}
            to{" "}
            <span className="font-bold text-gray-800 dark:text-gray-200">
              {outputLanguageLabel}
            </span>{" "}
            for the {outputUserLabel}
            <button
              onClick={() => {
                setErrorMessage("");
                setSaveMessage("");
                setAudioUrl(null);
                setScreen("setup");
              }}
              className="text-blue-600 dark:text-blue-400 underline ml-2"
            >
              Change
            </button>
          </p>
        </div>

        <div className="flex justify-center gap-4 flex-wrap">
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

          <button
            onClick={saveSession}
            disabled={conversation.length === 0 || isSaving}
            className="px-10 py-4 rounded-xl text-white text-xl font-semibold bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save Session"}
          </button>
        </div>

        <p className="mt-6 text-center text-gray-500 dark:text-gray-400">
          {isRecording
            ? `Recording ${inputUserLabel} speech in ${inputLanguageLabel}...`
            : "Press Record to add a new conversation turn"}
        </p>

        {errorMessage && (
          <p className="mt-4 text-center text-red-600 dark:text-red-400 font-medium">
            {errorMessage}
          </p>
        )}

        {saveMessage && (
          <p className="mt-4 text-center text-green-600 dark:text-green-400 font-medium">
            {saveMessage}
          </p>
        )}

        {audioUrl && (
          <div className="mt-8">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 text-center">
              Last Recorded Audio
            </p>
            <audio controls src={audioUrl} className="w-full" />
          </div>
        )}

        {conversation.length > 0 && (
          <div className="mt-10 space-y-6">
            {conversation.map((turn, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold mb-4 text-red-600 dark:text-red-400">
                    Turn {index + 1}: {turn.input_user} Transcription
                  </h2>
                  <p className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
                    {turn.transcription}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold mb-4 text-blue-600 dark:text-blue-400">
                    Turn {index + 1}: {turn.output_user} Interpretation
                  </h2>
                  <p className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
                    {turn.interpretation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-center mt-10">
          <button
            onClick={startNewSession}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            End Session / Start New Session
          </button>
        </div>
      </div>
    </main>
  );
}
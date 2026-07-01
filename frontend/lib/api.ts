const API_BASE_URL = "http://localhost:8000";

export type InterpretResponse = {
  filename: string;
  content_type: string;
  message: string;
  transcription?: string;
  interpretation?: string;
  source_language?: string;
};

export async function uploadAudio(
  audioBlob: Blob,
  inputLanguage: string,
  outputLanguage: string,
  inputUser: string,
  outputUser: string
) {
  const formData = new FormData();

  formData.append("audio", audioBlob, "recording.webm");
  formData.append("input_language", inputLanguage);
  formData.append("output_language", outputLanguage);
  formData.append("input_user", inputUser);
  formData.append("output_user", outputUser);

  const response = await fetch("http://localhost:8000/interpret", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload audio");
  }

  return response.json();
}

export function createAudioUrl(audioBlob: Blob): string {
  return URL.createObjectURL(audioBlob);
}

export function createAudioBlob(audioChunks: Blob[]): Blob {
  return new Blob(audioChunks, {
    type: "audio/webm",
  });
}

export async function getPatients() {
  const response = await fetch("http://localhost:8000/sessions/get_patients", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch patients");
  }

  return response.json();
}
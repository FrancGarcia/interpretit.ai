const API_BASE_URL = "http://localhost:8000";

export type InterpretResponse = {
  filename: string;
  content_type: string;
  message: string;
  spanish_transcript?: string;
  english_interpretation?: string;
};

export async function uploadAudio(audioBlob: Blob): Promise<InterpretResponse> {
  const formData = new FormData();

  formData.append("audio", audioBlob, "recording.webm");

  const response = await fetch(`${API_BASE_URL}/interpret`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload audio to backend");
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
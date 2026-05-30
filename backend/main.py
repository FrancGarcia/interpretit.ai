import os
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from language_helpers import interpret_input_language_with_openai

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

openai_client = OpenAI(api_key=OPENAI_API_KEY)


@app.get("/")
def root():
    return {"message": "Backend is running"}


def transcribe_audio_with_deepgram(audio_bytes: bytes, content_type: str, input_language: str) -> str:
    if not DEEPGRAM_API_KEY:
        raise HTTPException(status_code=500, detail="Deepgram API key is missing")

    deepgram_url = (
        "https://api.deepgram.com/v1/listen"
        "?model=nova-3"
        f"&language={input_language}" # Update input language to the provided language
        "&smart_format=true"
    )

    headers = {
        "Authorization": f"Token {DEEPGRAM_API_KEY}",
        "Content-Type": content_type or "audio/webm",
    }

    response = requests.post(
        deepgram_url,
        headers=headers,
        data=audio_bytes,
    )

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text,
        )

    deepgram_data = response.json()

    transcript = (
        deepgram_data
        .get("results", {})
        .get("channels", [{}])[0]
        .get("alternatives", [{}])[0]
        .get("transcript", "")
    )

    return transcript


@app.post("/interpret")
async def interpret(audio: UploadFile = File(...), input_language: str = Form(...), output_language: str = Form(...)):
    audio_bytes = await audio.read()

    language_transcription = transcribe_audio_with_deepgram(
        audio_bytes=audio_bytes,
        content_type=audio.content_type,
        input_language=input_language
    )

    interpretation = interpret_input_language_with_openai(input_language=input_language, input_transcript=language_transcription, output_language=output_language)

    return {
        "filename": audio.filename,
        "content_type": audio.content_type,
        "transcription": language_transcription,
        "interpretation": interpretation,
        "message": "Audio transcribed and interpreted successfully",
    }
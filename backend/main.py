import os
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI

load_dotenv()

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


def transcribe_audio_with_deepgram(audio_bytes: bytes, content_type: str) -> str:
    if not DEEPGRAM_API_KEY:
        raise HTTPException(status_code=500, detail="Deepgram API key is missing")

    deepgram_url = (
        "https://api.deepgram.com/v1/listen"
        "?model=nova-3"
        "&language=es"
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


def interpret_spanish_with_openai(spanish_transcript: str) -> str:
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key is missing",
        )

    if not spanish_transcript.strip():
        return ""

    response = openai_client.responses.create(
        model="gpt-4.1-mini",
        input=(
            "You are a professional medical interpreter.\n"
            "Translate the following Spanish patient speech into "
            "clear concise English for a physician:\n\n"
            f"{spanish_transcript}"
        ),
    )

    return response.output_text


@app.post("/interpret")
async def interpret(audio: UploadFile = File(...)):
    audio_bytes = await audio.read()

    spanish_transcript = transcribe_audio_with_deepgram(
        audio_bytes=audio_bytes,
        content_type=audio.content_type,
    )

    english_interpretation = interpret_spanish_with_openai(spanish_transcript)

    return {
        "filename": audio.filename,
        "content_type": audio.content_type,
        "spanish_transcript": spanish_transcript,
        "english_interpretation": english_interpretation,
        "message": "Audio transcribed and interpreted successfully",
    }
import os
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

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


@app.get("/")
def root():
    return {"message": "Backend is running"}


@app.post("/interpret")
async def interpret(audio: UploadFile = File(...)):
    if not DEEPGRAM_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Deepgram API key is missing",
        )

    audio_bytes = await audio.read()

    deepgram_url = (
        "https://api.deepgram.com/v1/listen"
        "?model=nova-3"
        "&language=es"
        "&smart_format=true"
    )

    headers = {
        "Authorization": f"Token {DEEPGRAM_API_KEY}",
        "Content-Type": audio.content_type or "audio/webm",
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

    return {
        "filename": audio.filename,
        "content_type": audio.content_type,
        "spanish_transcript": transcript,
        "message": "Audio transcribed successfully",
    }
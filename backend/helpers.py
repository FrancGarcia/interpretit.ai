'''
Helper functions for:
    1. Transcribing audio using Deepgram API
    2. Interpreting transcriptions using OpenAI API
    3. Managing session data in MongoDB (CRUD operations)
'''

import os
import requests
from dotenv import load_dotenv
from fastapi import HTTPException
from openai import OpenAI
from typing import List
from pydantic import BaseModel
from openai import OpenAI
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai_client = OpenAI(api_key=OPENAI_API_KEY)

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB = os.getenv("MONGODB_DB", "interpretit") 

if not MONGODB_URI:
    raise RuntimeError("MongoDB URI is missing in environment variables")

mongo_client = AsyncIOMotorClient(MONGODB_URI)
db = mongo_client[MONGODB_DB]
sessions_collection = db["sessions"]

def interpret_input_language_with_openai(input_language: str, input_transcript: str, output_language: str, input_user: str, output_user: str) -> str:
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key is missing",
        )

    if not input_transcript.strip():
        return ""

    response = openai_client.responses.create(
        model="gpt-4.1-mini", # Test different OpenAI models here for future improvements
        input=(
            f"You are a professional medical interpreter that speaks both {input_language} and {output_language}.\n"
            f"Translate the following {input_language} {input_user} speech into "
            f"{output_language} for a {output_user}:\n\n"
            f"{input_transcript}"
        ),
    )

    return response.output_text

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

class ConversationTurn(BaseModel):
    input_user: str
    output_user: str
    transcription: str
    interpretation: str
    input_language: str
    output_language: str

class SaveSessionRequest(BaseModel):
    session_id: str
    turns: List[ConversationTurn]

def build_session_text(turns: List[ConversationTurn]) -> str:
    lines = []

    for turn in turns:
        input_user = turn.input_user.lower()
        output_user = turn.output_user.lower()

        lines.append(
            f"{input_user} transcription: '{turn.transcription}'"
        )
        lines.append("")
        lines.append(
            f"{output_user} interpretation: '{turn.interpretation}'"
        )
        lines.append("")

    return "\n".join(lines)
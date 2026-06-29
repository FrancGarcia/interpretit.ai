import os
import requests
from dotenv import load_dotenv
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from language_helpers import interpret_input_language_with_openai, transcribe_audio_with_deepgram

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

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB = os.getenv("MONGODB_DB", "interpretit") 

if not MONGODB_URI:
    raise RuntimeError("MongoDB URI is missing in environment variables")

mongo_client = AsyncIOMotorClient(MONGODB_URI)
db = mongo_client[MONGODB_DB]
sessions_collection = db["sessions"]

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

@app.get("/")
def root():
    return {"message": "Backend is running"}

@app.post("/interpret")
async def interpret(audio: UploadFile = File(...), input_language: str = Form(...), output_language: str = Form(...), input_user: str = Form(...), output_user: str = Form(...)):
    audio_bytes = await audio.read()

    language_transcription = transcribe_audio_with_deepgram(
        audio_bytes=audio_bytes,
        content_type=audio.content_type,
        input_language=input_language
    )

    interpretation = interpret_input_language_with_openai(input_language=input_language, input_transcript=language_transcription, output_language=output_language, input_user=input_user, output_user=output_user)

    return {
        "filename": audio.filename,
        "content_type": audio.content_type,
        "transcription": language_transcription,
        "interpretation": interpretation,
        "message": "Audio transcribed and interpreted successfully",
    }

@app.on_event("startup")
async def startup_db():
    try:
        await mongo_client.admin.command("ping")
        print("Successfully connected to MongoDB")
        print("Database:", db.name)
    except Exception as e:
        print("MongoDB connection failed")
        print(e)

@app.post("/sessions/save")
async def save_session(payload: SaveSessionRequest):
    if not payload.turns:
        raise HTTPException(status_code=400, detail="No turns to save")

    session_text = build_session_text(payload.turns)

    session_doc = {
        "session_id": payload.session_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "turns": [turn.model_dump() for turn in payload.turns],
        "session_text": session_text,
    }

    result = await sessions_collection.insert_one(session_doc)

    print("Inserted ID:", result.inserted_id)
    print("Database:", db.name)
    print("Collection:", sessions_collection.name)

    return {
        "message": "Session saved successfully",
        "session_id": payload.session_id,
        "inserted_id": str(result.inserted_id),
        "session_text": session_text,
    }
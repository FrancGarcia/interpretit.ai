'''
Main backend FastAPI application for InterpetIt.ai.
Provides endpoints for audio transcription, interpretation, and session management.
'''

from datetime import datetime
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import backend.helpers as helpers

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Backend is running"}

@app.post("/interpret")
async def interpret(audio: UploadFile = File(...), input_language: str = Form(...), output_language: str = Form(...), input_user: str = Form(...), output_user: str = Form(...)):
    audio_bytes = await audio.read()

    language_transcription = helpers.transcribe_audio_with_deepgram(
        audio_bytes=audio_bytes,
        content_type=audio.content_type,
        input_language=input_language
    )

    interpretation = helpers.interpret_input_language_with_openai(input_language=input_language, input_transcript=language_transcription, output_language=output_language, input_user=input_user, output_user=output_user)

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
        await helpers.mongo_client.admin.command("ping")
        print("Successfully connected to MongoDB")
        print("Database:", helpers.db.name)
    except Exception as e:
        print("MongoDB connection failed")
        print(e)

@app.post("/sessions/save")
async def save_session(payload: helpers.SaveSessionRequest):
    if not payload.turns:
        raise HTTPException(status_code=400, detail="No turns to save")

    session_text = helpers.build_session_text(payload.turns)

    session_doc = {
        "session_id": payload.session_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "turns": [turn.model_dump() for turn in payload.turns],
        "session_text": session_text,
    }

    result = await helpers.sessions_collection.insert_one(session_doc)

    print("Inserted ID:", result.inserted_id)
    print("Database:", helpers.db.name)
    print("Collection:", helpers.sessions_collection.name)

    return {
        "message": "Session saved successfully",
        "session_id": payload.session_id,
        "inserted_id": str(result.inserted_id),
        "session_text": session_text,
    }
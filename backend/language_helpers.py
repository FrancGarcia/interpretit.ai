'''
Helper functions with prompts for language translation and detection.
'''

import os
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI

load_dotenv()

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# print(f"Loaded Deepgram API Key: {'Yes' if DEEPGRAM_API_KEY else 'No'}")
# print(f"Loaded OpenAI API Key: {'Yes' if OPENAI_API_KEY else 'No'}")

openai_client = OpenAI(api_key=OPENAI_API_KEY)

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
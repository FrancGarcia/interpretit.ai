'''
Helper functions with prompts for language translation and detection.
'''

import os
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

openai_client = OpenAI(api_key=OPENAI_API_KEY)

def interpret_input_language_with_openai(input_language: str, input_transcript: str) -> str:
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key is missing",
        )

    if not input_transcript.strip():
        return ""

    response = openai_client.responses.create(
        model="gpt-4.1-mini",
        input=(
            "You are a professional medical interpreter.\n"
            f"Translate the following {input_language} patient speech into "
            "clear concise English for a physician:\n\n"
            f"{input_transcript}"
        ),
    )

    return response.output_text
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
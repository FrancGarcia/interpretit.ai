'''
Helper functions with prompts for language translation and detection.
'''

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

def interpret_tamil_with_openai(tamil_transcript: str) -> str:
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key is missing",
        )

    if not tamil_transcript.strip():
        return ""

    response = openai_client.responses.create(
        model="gpt-4.1-mini",
        input=(
            "You are a professional medical interpreter.\n"
            "Translate the following Tamil patient speech into "
            "clear concise English for a physician:\n\n"
            f"{tamil_transcript}"
        ),
    )

    return response.output_text
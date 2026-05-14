from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Backend is running"}


@app.post("/interpret")
async def interpret(audio: UploadFile = File(...)):
    return {
        "filename": audio.filename,
        "content_type": audio.content_type,
        "message": "Audio received successfully"
    }
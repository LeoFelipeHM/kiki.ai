from fastapi import FastAPI

app = FastAPI(title="kiki-backend")


@app.get("/health")
def health():
    return {"status": "ok"}


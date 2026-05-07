from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from presentation.api.routers import admin, auth, calendar, health, notes, settings

app = FastAPI(title="kiki-backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(calendar.router)
app.include_router(notes.router)
app.include_router(settings.router)

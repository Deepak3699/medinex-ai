import logging

from fastapi import APIRouter, Depends, HTTPException, status
from google import genai
from google.genai import types

from app.api.deps import require_roles
from app.core.config import settings
from app.models import User
from app.schemas import AssistantChatRequest, AssistantChatResponse, UserRole
from app.services.ai_tools import (
    get_bed_availability,
    get_blood_availability,
    get_doctor_availability,
    search_doctors,
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/assistant", tags=["AI hospital assistant"])

SYSTEM_INSTRUCTION = """
You are the patient-facing Medinex AI hospital assistant. Reply in the language and style used by the person, including Hindi or Hinglish.
Use the supplied hospital tools for doctor, appointment-slot, bed, and blood availability. Treat tool results as the only source of live hospital facts; say when information is unavailable.
You may explain hospital services and help find doctors, but do not diagnose, prescribe, or recommend treatment.
If the message suggests severe chest pain, difficulty breathing, uncontrolled bleeding, loss of consciousness, or another immediate emergency, advise contacting local emergency services or going to the nearest emergency department now. Do not route an emergency through routine booking.
Never claim that an appointment has been booked. Booking is completed only by the authenticated backend after the patient explicitly confirms the exact doctor and slot.
Do not request passwords, payment details, or unnecessary medical identifiers. Do not claim to read personal medical records.
""".strip()

EMERGENCY_PHRASES = (
    "severe chest pain",
    "chest pain and difficulty breathing",
    "difficulty breathing",
    "can't breathe",
    "cannot breathe",
    "uncontrolled bleeding",
    "loss of consciousness",
    "saans nahi aa",
    "saans lene mein dikkat",
    "behosh",
    "bahut khoon",
)


@router.post("/chat", response_model=AssistantChatResponse)
def chat(
    payload: AssistantChatRequest,
    _user: User = Depends(require_roles(UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN)),
) -> AssistantChatResponse:
    message = payload.message.strip()
    normalized = message.casefold()
    if any(phrase in normalized for phrase in EMERGENCY_PHRASES):
        return AssistantChatResponse(
            reply=(
                "If this is happening now, contact your local emergency services or go to the nearest emergency department immediately. "
                "Agar yeh abhi ho raha hai, turant local emergency services ya nearest emergency department se sampark karein."
            )
        )

    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The AI assistant is not configured yet. Add GEMINI_API_KEY to backend/.env.",
        )

    try:
        client = genai.Client(api_key=settings.gemini_api_key)
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=message,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                tools=[search_doctors, get_doctor_availability, get_bed_availability, get_blood_availability],
                temperature=0.2,
            ),
        )
    except Exception as exc:
        # Do not log the user's message or any patient-provided health details.
        logger.error("Gemini assistant request failed: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The assistant is temporarily unavailable. Please try again shortly.",
        ) from exc

    reply = (response.text or "").strip()
    if not reply:
        reply = "I couldn't prepare a clear answer just now. Please try rephrasing your question."
    return AssistantChatResponse(reply=reply)

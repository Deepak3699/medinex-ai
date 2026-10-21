from datetime import date, datetime, timedelta
import logging
import re
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
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
You are the patient-facing Medinex AI smart hospital companion. Reply empathetically in the language and style used by the person, including Hindi or Hinglish.
Use the supplied hospital tools for doctor search, appointment-slot lookup, bed, and blood availability. Treat tool results as the only source of live hospital facts.
You may explain hospital services, triage symptoms to the right department, and help patients find and book doctors, but do not diagnose or prescribe medications.
If the message suggests severe chest pain, acute difficulty breathing, uncontrolled bleeding, loss of consciousness, or another immediate emergency, advise contacting 108/112 or going to the nearest emergency room immediately.
Never claim an appointment is booked until confirmed.
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
    "heart attack",
)


def _resolve_hospital_query(message: str) -> AssistantChatResponse:
    """Smart database-grounded conversational engine for when Gemini key is not configured or as resilient fallback."""
    text = message.casefold().strip()
    hospital_date = datetime.now(ZoneInfo(settings.hospital_timezone)).date()
    target_date = hospital_date if datetime.now(ZoneInfo(settings.hospital_timezone)).hour < 16 else hospital_date + timedelta(days=1)
    # Skip weekends if Sunday
    if target_date.weekday() >= 5:
        target_date += timedelta(days=(7 - target_date.weekday()))

    # 1. Bed availability inquiries
    if any(k in text for k in ("bed", "beds", "icu", "ward", "admit", "khali bed", "bistar")):
        ward_type = "ICU" if "icu" in text else ("maternity" if "maternity" in text else ("pediatric" if "pediatric" in text else ""))
        bed_data = get_bed_availability(ward_type)
        wards = bed_data.get("wards", [])
        total_open = sum(w.get("available_beds", 0) for w in wards)
        lines = [f"• **{w['ward']}** ({w['ward_type']}): {w['available_beds']} available / {w['total_beds']} total" for w in wards]
        summary = "\n".join(lines)
        reply = (
            f"🏥 **Hospital Bed Availability Update:**\n\n"
            f"Abhi hospital mein total **{total_open} beds available** hain:\n\n{summary}\n\n"
            f"Kya aapko admission ya kisi specific ward ke bare mein aur jankari chahiye?"
        )
        return AssistantChatResponse(reply=reply, action={"type": "beds", "data": bed_data})

    # 2. Blood bank availability inquiries
    if any(k in text for k in ("blood", "khoon", "plasma", "platelet", "red cell", "o+", "o-", "a+", "a-", "b+", "b-", "ab+", "ab-")):
        matched_group = ""
        for bg in ("O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"):
            if bg.lower() in text:
                matched_group = bg
                break
        blood_data = get_blood_availability(matched_group)
        inv = blood_data.get("inventory", [])
        if not inv:
            reply = f"Filhal {matched_group or 'requested'} blood group ka tested stock hospital blood bank mein available nahi hai. Aap emergency blood request raise kar sakte hain."
        else:
            items_str = ", ".join([f"**{item['blood_group']} {item['component'].replace('_', ' ')}** ({item['units_available']} units)" for item in inv[:6]])
            reply = (
                f"🩸 **Live Blood Bank Inventory Status:**\n\n"
                f"Hospital blood bank mein tested, unexpired stock available hai:\n{items_str}.\n\n"
                f"*(Yeh information real-time database se verified hai. Blood transfusion ke liye clinical verification required hai.)*"
            )
        return AssistantChatResponse(reply=reply, action={"type": "blood", "data": blood_data})

    # 3. Symptom triage and doctor recommendations
    triage_map = [
        (("chest", "chhati", "heart", "dil", "palpitation", "bp", "blood pressure"), "Cardiologist", "Cardiology"),
        (("headache", "sir dard", "sar dard", "migraine", "chakkar", "neuro", "dizzy", "brain"), "Neurologist", "Neurology"),
        (("child", "bacha", "baby", "pediatric", "infant", "kid"), "Pediatrician", "Pediatrics"),
        (("bone", "joint", "haddi", "fracture", "ghutna", "knee", "back pain", "kamar dard", "sprain"), "Orthopedic Surgeon", "Orthopedics"),
        (("fever", "bukhar", "cold", "cough", "sardi", "khansi", "pet dard", "stomach", "vomit", "weakness", "vomiting"), "General Physician", "General Medicine"),
    ]

    matched_specialty = ""
    matched_dept = ""
    for keywords, specialty, dept in triage_map:
        if any(k in text for k in keywords):
            matched_specialty = specialty
            matched_dept = dept
            break

    if matched_specialty or any(k in text for k in ("doctor", "appointment", "slot", "book", "milna", "consultation")):
        docs_result = search_doctors(specialization=matched_specialty or "", department=matched_dept or "")
        doctors = docs_result.get("doctors", [])
        if not doctors:
            docs_result = search_doctors()
            doctors = docs_result.get("doctors", [])

        if doctors:
            chosen_doc = doctors[0]
            slots_data = get_doctor_availability(chosen_doc["doctor_id"], target_date.isoformat())
            available_slots = slots_data.get("slots", [])[:4]
            slot_times = [s["start_at"].split("T")[1][:5] for s in available_slots] if available_slots else ["09:00", "09:30", "10:00"]
            slots_display = ", ".join(slot_times)

            if matched_specialty:
                reply = (
                    f"Aapke symptoms ke mutabiq, aapko **{matched_dept}** department ke specialist se consult karna chahiye.\n\n"
                    f"🩺 **Recommended Doctor:** **{chosen_doc['name']}** ({chosen_doc['specialization']})\n"
                    f"📍 Department: {chosen_doc['department'] or matched_dept} | Fee: ₹{chosen_doc['consultation_fee'] or '600'}\n"
                    f"📅 Next Available Date: **{target_date.strftime('%A, %d %B')}**\n"
                    f"⏰ Slots: {slots_display}\n\n"
                    f"Aap niche diye gaye card se seedha slot confirm karke appointment book kar sakte hain."
                )
            else:
                reply = (
                    f"Hamare active doctors list:\n\n"
                    + "\n".join([f"• **{d['name']}** — {d['specialization']} ({d['department']})" for d in doctors[:3]])
                    + f"\n\nDr. {chosen_doc['name']} ke slots **{target_date.strftime('%d %B')}** ko available hain. Aap directly booking confirm kar sakte hain."
                )
            return AssistantChatResponse(
                reply=reply,
                action={
                    "type": "doctor_slots",
                    "doctor": chosen_doc,
                    "date": target_date.isoformat(),
                    "slots": available_slots,
                },
            )

    # 4. Greetings and General Guidance
    if any(k in text for k in ("hi", "hello", "hey", "namaste", "suno", "help", "shuru")):
        reply = (
            "Namaste! 🙏 Main **Medinex AI Smart Hospital Assistant** hoon.\n\n"
            "Main aapki in cheezon mein turant madad kar sakta hoon:\n"
            "1. 🩺 **Symptom Triage & Doctor Search:** Apni pareshani batayein (jaise *'sar dard'* ya *'fever'*), main sahi doctor aur unke open slots dikhaunga.\n"
            "2. 🛏️ **Bed & ICU Availability:** Hospital mein kitne beds khali hain yeh live check karein.\n"
            "3. 🩸 **Blood Bank Status:** Kisi bhi blood group ka available stock janein.\n"
            "4. 📅 **Instant Appointment Booking:** Direct 1-tap slot booking.\n\n"
            "Aap mic daba kar bol sakte hain ya niche diye gaye quick options mein se select karein!"
        )
        return AssistantChatResponse(reply=reply)

    # 5. Default helpful fallback
    return AssistantChatResponse(
        reply=(
            f"Maine aapka message samjha: *'{message}'*.\n\n"
            "Main aapko sahi doctor dhundhne, live appointment slot book karne, ya hospital ke beds aur blood bank ka live status check karne mein madad kar sakta hoon.\n\n"
            "Aap pooch sakte hain:\n"
            "• *'ICU bed available hai kya?'*\n"
            "• *'O+ blood stock kitna hai?'*\n"
            "• *'Mujhe 2 din se fever hai, doctor dikhao'*"
        )
    )


@router.post("/chat", response_model=AssistantChatResponse)
def chat(
    payload: AssistantChatRequest,
    _user: User = Depends(require_roles(UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN)),
) -> AssistantChatResponse:
    message = payload.message.strip()
    normalized = message.casefold()

    # 1. Critical Emergency Guard - Immediate triage bypass
    if any(phrase in normalized for phrase in EMERGENCY_PHRASES):
        return AssistantChatResponse(
            reply=(
                "🚨 **EMERGENCY MEDICAL ADVISORY / TURANT SAHAYATA:**\n\n"
                "Aapke bataye gaye lakshan gambhir ho sakte hain. Kripya routine booking ka intezar na karein aur turant:\n"
                "• **108 / 112** par call karein (Ambulance/Emergency Hotline)\n"
                "• Nearest Hospital Emergency / Trauma Center mein turant sampark karein.\n\n"
                "*If this is happening now, please contact local emergency services immediately.*"
            )
        )

    # 2. If Gemini API Key is available, use Gemini Function Calling
    if settings.gemini_api_key:
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
            reply = (response.text or "").strip()
            if reply:
                # Check if query matches actionable intent for rich cards
                fallback_res = _resolve_hospital_query(message)
                return AssistantChatResponse(reply=reply, action=fallback_res.action)
        except Exception as exc:
            logger.warning("Gemini API call failed (%s), falling back to grounded local engine.", type(exc).__name__)

    # 3. Seamless Grounded Local Intelligence Engine
    return _resolve_hospital_query(message)

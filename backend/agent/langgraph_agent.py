from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
import json
import os
import re
from dotenv import load_dotenv

from agent.tools import (
    log_interaction,
    edit_interaction,
    get_hcp_insights,
    smart_schedule,
    suggest_follow_up,
)

load_dotenv()

# ─────────────────────────────
# REQUIRED FIELDS
# ─────────────────────────────

REQUIRED_FIELDS = [
    "hcp_name",
    "interaction_type",
    "date",
    "time",
    "attendees",
    "topics_discussed",
    "materials_shared",
    "samples_distributed",
    "observed_hcp_sentiment",
    "outcomes",
    "follow_up_actions",
]

# ─────────────────────────────
# LLM
# ─────────────────────────────

def get_llm():
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0,
        max_tokens=300,
    )

# ─────────────────────────────
# SAFE JSON PARSER
# ─────────────────────────────

def parse_llm_json(raw):
    try:
        raw = raw.strip()
        raw = re.sub(r"```json|```", "", raw).strip()
        return json.loads(raw)
    except Exception:
        return None

# ─────────────────────────────
# GET LAST DOCTOR
# ─────────────────────────────

def get_latest_hcp_name():
    try:
        from db.database import SessionLocal
        from db.models import HCPInteraction

        db = SessionLocal()
        last = db.query(HCPInteraction).order_by(HCPInteraction.id.desc()).first()
        db.close()

        return last.hcp_name if last else ""
    except:
        return ""

# ─────────────────────────────
# EXTRACT DOCTOR NAME (SAFE)
# ─────────────────────────────

def extract_hcp_name(message):
    msg = message.lower()

    # prevent corruption during updates
    if "update" in msg:
        return ""

    match = re.search(r"(?:doctor|dr)\s+([a-zA-Z]+)", msg)
    if match:
        return f"Doctor {match.group(1).title()}"

    return ""

# ─────────────────────────────
# NORMALIZE
# ─────────────────────────────

def normalize_data(data):
    final = {}
    for f in REQUIRED_FIELDS:
        val = data.get(f) if data else ""
        final[f] = str(val).strip() if val else ""

    if final["interaction_type"].lower() == "met":
        final["interaction_type"] = "Meeting"

    if final["observed_hcp_sentiment"]:
        final["observed_hcp_sentiment"] = final["observed_hcp_sentiment"].capitalize()

    return final

# ─────────────────────────────
# INTENT DETECTION
# ─────────────────────────────

def detect_field_intent(message):
    msg = message.lower()

    if "outcome" in msg:
        return "outcomes"

    if "follow" in msg or "next visit" in msg:
        return "follow_up_actions"

    if any(w in msg for w in ["discuss", "talk", "product"]):
        return "topics_discussed"

    if "sample" in msg:
        return "samples_distributed"

    if "brochure" in msg or "material" in msg:
        return "materials_shared"

    if "time" in msg:
        return "time"

    if "date" in msg:
        return "date"

    return None

# ─────────────────────────────
# FORCE EXTRACT OUTCOME TEXT
# ─────────────────────────────

def extract_outcome_text(message):
    # "update outcome to "TEXT""
    match = re.search(r'outcome[s]?\s*(?:to|:)?\s*"(.*?)"', message, re.IGNORECASE)
    if match:
        return match.group(1)

    # update outcome: TEXT
    match = re.search(r'outcome[s]?\s*(?:to|:)?\s*(.*)', message, re.IGNORECASE)
    if match:
        return match.group(1).strip()

    return ""

# ─────────────────────────────
# SAFE MERGE (IMPROVED)
# ─────────────────────────────

def safe_merge(old_data, new_data, message):
    if not old_data:
        return {k: v for k, v in new_data.items() if v}

    merged = old_data.copy()
    target_field = detect_field_intent(message)

    for field in REQUIRED_FIELDS:
        new_val = new_data.get(field, "")

        if not new_val:
            continue

        if field == "hcp_name":
            merged[field] = new_val
            continue

        # 🔥 force update for outcomes
        if field == "outcomes" and "outcome" in message.lower():
            merged[field] = new_val
            continue

        if target_field and field == target_field:
            if field == "topics_discussed":
                existing = merged.get(field, "")
                if new_val not in existing:
                    merged[field] = existing + ", " + new_val if existing else new_val
            else:
                merged[field] = new_val

    return merged

# ─────────────────────────────
# SESSION CLASS
# ─────────────────────────────

class ConversationSession:
    def __init__(self):
        self.llm = get_llm()
        self.last_data = {}
        self.last_interaction_id = None

    def chat(self, message: str):
        try:
            message_lower = message.lower()

            # ───────── DOCTOR NAME ─────────
            hcp_name = extract_hcp_name(message)

            if not hcp_name:
                hcp_name = self.last_data.get("hcp_name") or get_latest_hcp_name()

            # ───────── SPECIAL COMMANDS ─────────

            if "insight" in message_lower:
                result = get_hcp_insights(hcp_name)
                return {"response": f"Insights for {hcp_name}", "data": result}

            if "schedule" in message_lower:
                result = smart_schedule.invoke({"hcp_name": hcp_name})
                return {"response": f"Next meeting for {hcp_name}", "data": result}

            if any(w in message_lower for w in ["next action", "what next"]):
                result = suggest_follow_up.invoke({"hcp_name": hcp_name})
                return {"response": f"Actions for {hcp_name}", "data": result}

            # ───────── LLM EXTRACTION ─────────

            system_prompt = """
                Return ONLY JSON:
                {
                "hcp_name": "",
                "interaction_type": "",
                "date": "",
                "time": "",
                "attendees": "",
                "topics_discussed": "",
                "materials_shared": "",
                "samples_distributed": "",
                "observed_hcp_sentiment": "",
                "outcomes": "",
                "follow_up_actions": ""
                }
                """

            response = self.llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=message)
            ])

            parsed = parse_llm_json(response.content)
            safe_data = normalize_data(parsed if parsed else {})

            # 🔥 FORCE OUTCOME UPDATE (CRITICAL FIX)
            if "outcome" in message_lower:
                forced_outcome = extract_outcome_text(message)
                if forced_outcome:
                    safe_data["outcomes"] = forced_outcome

            # assign doctor
            if hcp_name:
                safe_data["hcp_name"] = hcp_name

            # merge
            self.last_data = safe_merge(self.last_data, safe_data, message)

            print("CURRENT:", self.last_data)

            # ───────── SAVE ─────────

            if "save" in message_lower:
                result = log_interaction.invoke(self.last_data)

                if isinstance(result, dict) and result.get("interaction_id"):
                    self.last_interaction_id = result["interaction_id"]

                return {
                    "response": "Interaction saved successfully",
                    "data": self.last_data,
                    "interaction_logged": True
                }

            # ───────── UPDATE ─────────

            if self.last_interaction_id:
                update_data = self.last_data.copy()
                update_data["interaction_id"] = self.last_interaction_id
                edit_interaction.invoke(update_data)

                return {
                    "response": "Interaction updated successfully",
                    "data": self.last_data,
                    "interaction_logged": True
                }

            return {
                "response": "Draft updated. Say 'save' to store.",
                "data": self.last_data,
                "interaction_logged": False
            }

        except Exception as e:
            print("ERROR:", e)
            return {"response": "Error occurred"}

# ─────────────────────────────
# SESSION STORE
# ─────────────────────────────

sessions = {}

def get_or_create_session(session_id: str):
    if session_id not in sessions:
        sessions[session_id] = ConversationSession()
    return sessions[session_id]

def reset_session(session_id: str):
    if session_id in sessions:
        del sessions[session_id]
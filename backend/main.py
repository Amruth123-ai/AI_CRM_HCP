from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import traceback
from dotenv import load_dotenv

# ─────────────────────────────────────────────
# LOAD ENV
# ─────────────────────────────────────────────
load_dotenv()

# ─────────────────────────────────────────────
# DB + MODELS
# ─────────────────────────────────────────────
from db.database import init_db, get_db
from db.models import HCPInteraction

# ─────────────────────────────────────────────
# AGENT
# ─────────────────────────────────────────────
from agent.langgraph_agent import get_or_create_session

# ─────────────────────────────────────────────
# TOOLS ( DIRECT API USAGE)
# ─────────────────────────────────────────────
from agent.tools import (
    get_hcp_insights,
    smart_schedule,
    suggest_follow_up
)

# ─────────────────────────────────────────────
# APP INIT
# ─────────────────────────────────────────────
app = FastAPI(
    title="AI CRM HCP Assistant",
    version="1.0.0",
)

# SINGLE CORS (fix duplicate)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# STARTUP
# ─────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    try:
        init_db()
        print(" Database tables created successfully.")
        print(" AI CRM HCP API started!")
    except Exception as e:
        print(" ERROR during startup:", e)
        traceback.print_exc()

# ─────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────
class ChatRequest(BaseModel):
    session_id: str
    message: str

# ─────────────────────────────────────────────
# BASIC ROUTES
# ─────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "API Running"}

@app.get("/health")
def health():
    return {"status": "ok"}

# ─────────────────────────────────────────────
# CHAT (LLM FLOW)
# ─────────────────────────────────────────────
@app.post("/chat")
async def chat(req: ChatRequest):
    try:
        session = get_or_create_session(req.session_id)
        result = session.chat(req.message)

        return {
            "response": result.get("response"),
            "data": result.get("data"),
            "interaction_logged": result.get("interaction_logged", False)
        }

    except Exception as e:
        print(" ERROR:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────
# RESET CHAT
# ─────────────────────────────────────────────
@app.post("/chat/reset")
def reset_chat(session_id: str):
    try:
        reset_session(session_id)
        return {"message": "Session reset successfully"}
    except Exception as e:
        print(" ERROR in reset:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────
# INTERACTIONS CRUD
# ─────────────────────────────────────────────
@app.get("/interactions")
def list_interactions(db: Session = Depends(get_db)):
    try:
        data = db.query(HCPInteraction).order_by(HCPInteraction.created_at.desc()).all()
        return [i.to_dict() for i in data]
    except Exception as e:
        print(" ERROR fetching interactions:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/interactions/{interaction_id}")
def get_interaction(interaction_id: int, db: Session = Depends(get_db)):
    try:
        interaction = db.query(HCPInteraction).filter(HCPInteraction.id == interaction_id).first()
        if not interaction:
            raise HTTPException(status_code=404, detail="Not found")
        return interaction.to_dict()
    except Exception as e:
        print("ERROR fetching interaction:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/interactions/{interaction_id}")
def delete_interaction(interaction_id: int, db: Session = Depends(get_db)):
    try:
        interaction = db.query(HCPInteraction).filter(HCPInteraction.id == interaction_id).first()
        if not interaction:
            raise HTTPException(status_code=404, detail="Not found")

        db.delete(interaction)
        db.commit()

        return {"message": "Deleted successfully"}

    except Exception as e:
        print(" ERROR deleting interaction:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────
#  NEW: DIRECT ANALYTICS ENDPOINTS
# (NO LLM → FAST + RELIABLE)
# ─────────────────────────────────────────────

@app.get("/hcp/{hcp_name}/insights")
def hcp_insights(hcp_name: str):
    try:
        return get_hcp_insights(hcp_name)
    except Exception as e:
        print(" ERROR insights:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/hcp/{hcp_name}/schedule")
def hcp_schedule(hcp_name: str):
    try:
        return smart_schedule.invoke({"hcp_name": hcp_name})
    except Exception as e:
        print(" ERROR schedule:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/hcp/{hcp_name}/followup")
def hcp_followup(hcp_name: str):
    try:
        return suggest_follow_up.invoke({"hcp_name": hcp_name})
    except Exception as e:
        print(" ERROR followup:", e)
        raise HTTPException(status_code=500, detail=str(e))
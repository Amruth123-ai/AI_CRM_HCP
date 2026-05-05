from langchain_core.tools import tool
from db.database import SessionLocal
from db.models import HCPInteraction, SentimentEnum, InteractionTypeEnum
from datetime import datetime, timedelta
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
import json
import re
import os

def _get_db():
    return SessionLocal()


import difflib

def get_best_matching_hcp(input_name: str, db):
    """
    Strong keyword-based matching for doctor names
    """

    input_name = input_name.lower().strip()

    all_names = db.query(HCPInteraction.hcp_name).distinct().all()
    all_names = [n[0] for n in all_names if n[0]]

    if not all_names:
        return input_name

    # STEP 1: exact keyword match
    for name in all_names:
        if input_name in name.lower():
            return name

    # STEP 2: reverse match
    for name in all_names:
        if any(word in input_name for word in name.lower().split()):
            return name

    # STEP 3: fallback (first record)
    return all_names[0]


# ─────────────────────────────
# LOG INTERACTION
# ─────────────────────────────

@tool
def log_interaction(
    hcp_name: str,
    interaction_type: str,
    date: str = None,
    time: str = None,
    attendees: str = None,
    topics_discussed: str = None,
    materials_shared: str = None,
    samples_distributed: str = None,
    observed_hcp_sentiment: str = None,
    outcomes: str = None,
    follow_up_actions: str = None,
):
    """Save a new HCP interaction to database"""

    db = _get_db()

    try:
        interaction = HCPInteraction(
            hcp_name=hcp_name,
            interaction_type=InteractionTypeEnum.meeting,
            date=date,
            time=time,
            attendees=attendees,
            topics_discussed=topics_discussed,
            materials_shared=materials_shared,
            samples_distributed=samples_distributed,
            observed_hcp_sentiment=SentimentEnum.positive if observed_hcp_sentiment == "Positive" else SentimentEnum.neutral,
            outcomes=outcomes,
            follow_up_actions=follow_up_actions,
        )

        db.add(interaction)
        db.commit()
        db.refresh(interaction)

        return {
            "interaction_id": interaction.id,
            "message": "saved"
        }

    finally:
        db.close()


# ─────────────────────────────
# EDIT INTERACTION
# ─────────────────────────────

@tool
def edit_interaction(interaction_id: int, **kwargs):
    """Update an existing HCP interaction"""

    db = _get_db()

    try:
        obj = db.query(HCPInteraction).filter(HCPInteraction.id == interaction_id).first()

        if not obj:
            return {"error": "not found"}

        for key, value in kwargs.items():
            if value:
                setattr(obj, key, value)

        obj.updated_at = datetime.utcnow()
        db.commit()

        return {"message": "updated"}

    finally:
        db.close()


# ─────────────────────────────
# HCP INSIGHTS
# ─────────────────────────────



@tool
def get_hcp_insights(hcp_name: str):
    """AI-powered HCP insights with safe parsing and similarity matching"""

    from db.database import SessionLocal
    from db.models import HCPInteraction
    from agent.tools import get_best_matching_hcp  # make sure this exists

    db = SessionLocal()

    try:
        # Step 1: Match doctor name
        matched_name = get_best_matching_hcp(hcp_name, db)

        # Step 2: Fetch interactions
        interactions = db.query(HCPInteraction).filter(
            HCPInteraction.hcp_name == matched_name
        ).all()

        if not interactions:
            return {
                "hcp_name": matched_name,
                "total_interactions": 0,
                "engagement": "Low",
                "sentiment": "Neutral",
                "summary": "No interaction history available"
            }

        # Step 3: Prepare history for AI
        history = []
        for i in interactions[-5:]:  # last 5 interactions
            history.append({
                "sentiment": i.observed_hcp_sentiment,
                "outcome": i.outcomes,
                "topics": i.topics_discussed
            })

        # Step 4: Initialize LLM
        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=0
        )

        # Step 5: Prompt
        prompt = f"""
            You are an expert pharmaceutical CRM analyst.

            STRICT RULES:
            - Return ONLY valid JSON
            - Do NOT use markdown or ```
            - No explanation text

            Format:
            {{
            "engagement": "High | Medium | Low",
            "sentiment": "Positive | Neutral | Negative",
            "summary": "short insight"
            }}

            History:
            {history}
            """

        # Step 6: Call LLM
        response = llm.invoke([HumanMessage(content=prompt)])

        raw = response.content.strip()
        print(" RAW LLM OUTPUT:", raw)  # debug

        # Step 7: Clean JSON (remove ``` if present)
        cleaned = re.sub(r"```json|```", "", raw).strip()

        # Step 8: Parse safely
        try:
            ai_data = json.loads(cleaned)
        except Exception as e:
            print(" JSON PARSE ERROR:", cleaned)

            # fallback (smart fallback, not dummy)
            positive = sum(
                1 for i in interactions
                if str(i.observed_hcp_sentiment) == "Positive"
            )

            total = len(interactions)

            ai_data = {
                "engagement": "High" if positive >= total / 2 else "Medium",
                "sentiment": "Positive" if positive >= total / 2 else "Neutral",
                "summary": "Fallback: Based on historical sentiment trends"
            }

        # Step 9: Final output
        return {
            "hcp_name": matched_name,
            "total_interactions": len(interactions),
            "engagement": ai_data.get("engagement"),
            "sentiment": ai_data.get("sentiment"),
            "summary": ai_data.get("summary")
        }

    finally:
        db.close()
# ─────────────────────────────
# SMART SCHEDULE
# ─────────────────────────────

@tool
def smart_schedule(hcp_name: str):
    """AI-based smart scheduling"""

    from db.database import SessionLocal
    from db.models import HCPInteraction
    from datetime import datetime, timedelta
    import os

    db = SessionLocal()

    try:
        # fetch last interaction
        last = db.query(HCPInteraction).filter(
            HCPInteraction.hcp_name == hcp_name
        ).order_by(HCPInteraction.id.desc()).first()

        if not last:
            days = 3
            reason = "No previous interaction, using default follow-up"
        else:
            outcome = (last.outcomes or "").lower()
            sentiment = (last.observed_hcp_sentiment or "").lower()
            topics = (last.topics_discussed or "").lower()

            # AI MODEL
            llm = ChatGroq(
                model="llama-3.3-70b-versatile",
                api_key=os.getenv("GROQ_API_KEY"),
                temperature=0
            )

            prompt = f"""
You are an expert pharmaceutical CRM assistant.

Based on the following interaction, decide in how many days the next visit should happen.

Return ONLY JSON:
{{
  "days": number (1–10),
  "reason": short explanation
}}

Interaction details:
- Doctor: {hcp_name}
- Sentiment: {sentiment}
- Outcome: {outcome}
- Topics: {topics}
"""

            response = llm.invoke([HumanMessage(content=prompt)])

            import json
            try:
                data = json.loads(response.content)
                days = int(data.get("days", 3))
                reason = data.get("reason", "AI suggested follow-up")
            except:
                days = 3
                reason = "Fallback scheduling"

        next_date = datetime.now() + timedelta(days=days)

        return {
            "hcp_name": hcp_name,
            "suggested_date": next_date.strftime("%d-%m-%Y"),
            "suggested_time": "10:00 AM",
            "reason": reason
        }

    finally:
        db.close()

# ─────────────────────────────
# FOLLOW-UP
# ─────────────────────────────


@tool
def suggest_follow_up(hcp_name: str):
    """AI-powered follow-up recommendations"""

    from db.database import SessionLocal
    from db.models import HCPInteraction

    db = SessionLocal()

    try:
        # Step 1: Match doctor
        matched_name = get_best_matching_hcp(hcp_name, db)

        # Step 2: Fetch recent interactions
        interactions = db.query(HCPInteraction).filter(
            HCPInteraction.hcp_name == matched_name
        ).order_by(HCPInteraction.id.desc()).limit(5).all()

        if not interactions:
            return {
                "hcp_name": matched_name,
                "actions": ["Schedule first meeting", "Introduce products"]
            }

        # Step 3: Prepare history
        history = []
        for i in interactions:
            history.append({
                "sentiment": i.observed_hcp_sentiment,
                "outcome": i.outcomes,
                "topics": i.topics_discussed
            })

        # Step 4: AI model
        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=0
        )

        #  Step 5: Prompt
        prompt = f"""
You are an expert pharmaceutical sales assistant.

Based on the doctor interaction history, suggest next best actions.

STRICT RULES:
- Return ONLY valid JSON
- No markdown, no explanation

Format:
{{
  "actions": ["action1", "action2", "action3"]
}}

Guidelines:
- If doctor is ready to order → suggest "Collect order"
- If doctor is interested → suggest "Send brochure" or "Follow-up meeting"
- If negative → suggest "Re-engagement strategy"
- Keep actions short and practical

History:
{history}
"""

        # Step 6: Call AI
        response = llm.invoke([HumanMessage(content=prompt)])

        raw = response.content.strip()
        print(" FOLLOW-UP RAW:", raw)

        #  Step 7: Clean JSON
        cleaned = re.sub(r"```json|```", "", raw).strip()

        try:
            ai_data = json.loads(cleaned)
            actions = ai_data.get("actions", [])
        except:
            print(" FOLLOW-UP JSON ERROR:", cleaned)

            # fallback (smart)
            last = interactions[0]
            outcome = (last.outcomes or "").lower()

            if "order" in outcome:
                actions = ["Collect order", "Confirm availability"]
            else:
                actions = ["Schedule follow-up", "Share product details"]

        return {
            "hcp_name": matched_name,
            "actions": actions
        }

    finally:
        db.close()
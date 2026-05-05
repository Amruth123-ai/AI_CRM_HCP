from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()


class SentimentEnum(str, enum.Enum):
    positive = "Positive"
    neutral = "Neutral"
    negative = "Negative"


class InteractionTypeEnum(str, enum.Enum):
    meeting = "Meeting"
    call = "Call"
    visit = "Visit"


class HCPInteraction(Base):
    __tablename__ = "hcp_interactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    hcp_name = Column(String(255), nullable=False, index=True)
    interaction_type = Column(
        Enum(InteractionTypeEnum),
        nullable=False,
        default=InteractionTypeEnum.meeting,
    )
    date = Column(String(20), nullable=True)
    time = Column(String(10), nullable=True)
    attendees = Column(Text, nullable=True)
    topics_discussed = Column(Text, nullable=True)
    materials_shared = Column(Text, nullable=True)
    samples_distributed = Column(Text, nullable=True)
    observed_hcp_sentiment = Column(
        Enum(SentimentEnum),
        nullable=True,
        default=SentimentEnum.neutral,
    )
    outcomes = Column(Text, nullable=True)
    follow_up_actions = Column(Text, nullable=True)
    ai_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "HCP Name": self.hcp_name,
            "Interaction Type": self.interaction_type.value if self.interaction_type else None,
            "Date": self.date,
            "Time": self.time,
            "Attendees": self.attendees,
            "Topics Discussed": self.topics_discussed,
            "Materials Shared": self.materials_shared,
            "Samples Distributed": self.samples_distributed,
            "Observed HCP Sentiment": self.observed_hcp_sentiment.value if self.observed_hcp_sentiment else None,
            "Outcomes": self.outcomes,
            "Follow-up Actions": self.follow_up_actions,
            "AI Summary": self.ai_summary,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  sendChatMessage,
  resetChatSession,
  addUserMessage,
} from "../redux/chatSlice";
import {
  setFormFromCollected,
  updateCollectedFields,
  updateMissingFields,
  setInteractionLogged,
} from "../redux/interactionSlice";

const QUICK_PROMPTS = [
  "Met Dr. Sharma today at 10am, discussed OncoBoost efficacy, shared Phase III PDF, positive sentiment",
  "Called Dr. Patel at 2pm about safety profile, no samples distributed",
  "Visit with Dr. Mehta yesterday at 3pm, discussed dosing, neutral sentiment",
];

const FIELD_LABELS = {
  hcp_name: "HCP Name",
  interaction_type: "Type",
  date: "Date",
  time: "Time",
  attendees: "Attendees",
  topics_discussed: "Topics",
  materials_shared: "Materials",
  samples_distributed: "Samples",
  observed_hcp_sentiment: "Sentiment",
  outcomes: "Outcomes",
  follow_up_actions: "Follow-up",
};

function TypingIndicator() {
  return (
    <div className="chat-bubble assistant typing-bubble">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  const hasToolResults = msg.toolResults && msg.toolResults.length > 0;

  // Check for schedule suggestion
  const scheduleResult = msg.toolResults?.find((r) => r.suggested_date);
  const followUpResult = msg.toolResults?.find((r) => r.next_best_actions);
  const insightResult = msg.toolResults?.find((r) => r.insights);

  return (
    <div className={`chat-message-row ${isUser ? "user-row" : "assistant-row"}`}>
      {!isUser && (
        <div className="avatar ai-avatar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#4f46e5" />
            <path d="M8 12l2.5 2.5L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      )}
      <div className={`chat-bubble ${isUser ? "user" : "assistant"} ${msg.isError ? "error-bubble" : ""}`}>
        <div className="bubble-text">{msg.content}</div>

        {/* Schedule Card */}
        {scheduleResult && (
          <div className="tool-card schedule-card">
            <div className="tool-card-header"> Suggested Follow-up</div>
            <div className="tool-card-body">
              <strong>{scheduleResult.suggested_day}, {scheduleResult.suggested_date}</strong>
              <span> at {scheduleResult.suggested_time}</span>
              <p className="tool-card-note">{scheduleResult.reason}</p>
            </div>
          </div>
        )}

        {/* Follow-up Actions Card */}
        {followUpResult && (
          <div className="tool-card followup-card">
            <div className="tool-card-header">Next Best Actions</div>
            <ul className="followup-list">
              {followUpResult.next_best_actions?.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          </div>
        )}

        {/* HCP Insights Card */}
        {insightResult && insightResult.insights && (
          <div className="tool-card insights-card">
            <div className="tool-card-header">HCP Insights</div>
            <div className="insight-grid">
              <div className="insight-item">
                <span className="insight-label">Engagement</span>
                <span className={`insight-badge badge-${insightResult.insights.engagement_level?.toLowerCase()}`}>
                  {insightResult.insights.engagement_level}
                </span>
              </div>
              <div className="insight-item">
                <span className="insight-label">Sentiment</span>
                <span className={`insight-badge badge-${insightResult.insights.sentiment_trend?.dominant?.toLowerCase()}`}>
                  {insightResult.insights.sentiment_trend?.dominant}
                </span>
              </div>
              <div className="insight-item full-width">
                <span className="insight-label">Total Interactions</span>
                <span className="insight-value">{insightResult.total_interactions}</span>
              </div>
            </div>
          </div>
        )}

        <div className="bubble-time">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
      {isUser && (
        <div className="avatar user-avatar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" fill="#6366f1" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="#6366f1" />
          </svg>
        </div>
      )}
    </div>
  );
}

function FieldProgress({ collectedFields, missingFields }) {
  const totalFields = Object.keys(FIELD_LABELS).length;
  const filledCount = Object.keys(collectedFields).filter((k) => collectedFields[k]).length;
  const percent = Math.round((filledCount / totalFields) * 100);

  return (
    <div className="field-progress">
      <div className="progress-header">
        <span>Form Progress</span>
        <span className="progress-count">{filledCount}/{totalFields}</span>
      </div>
      <div className="progress-bar-bg">
        <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="field-chips">
        {Object.entries(FIELD_LABELS).map(([key, label]) => {
          const filled = collectedFields[key];
          return (
            <div key={key} className={`field-chip ${filled ? "filled" : "missing"}`}>
              <span className="chip-dot">{filled ? "●" : "○"}</span>
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ChatUI({ sessionId }) {
  const dispatch = useDispatch();
  const { messages, isTyping, collectedFields, missingFields, interactionLogged, suggestedFollowUps } =
    useSelector((s) => s.chat);

  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Sync collected fields to interaction form
  useEffect(() => {
    if (Object.keys(collectedFields).length > 0) {
      const mapped = {};
      const keyMap = {
        hcp_name: "HCP Name",
        interaction_type: "Interaction Type",
        date: "Date",
        time: "Time",
        attendees: "Attendees",
        topics_discussed: "Topics Discussed",
        materials_shared: "Materials Shared",
        samples_distributed: "Samples Distributed",
        observed_hcp_sentiment: "Observed HCP Sentiment",
        outcomes: "Outcomes",
        follow_up_actions: "Follow-up Actions",
      };
      Object.entries(collectedFields).forEach(([k, v]) => {
      if (!keyMap[k]) return;

      //  Clean invalid values
      if (!v || v === "None" || v === "null") return;

      mapped[keyMap[k]] = v;
    });
      dispatch(setFormFromCollected(mapped));
      dispatch(updateCollectedFields(collectedFields));
      dispatch(updateMissingFields(missingFields));
      dispatch(setInteractionLogged(interactionLogged));
    }
  }, [collectedFields, missingFields, interactionLogged, dispatch]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;
    setInput("");
    dispatch(addUserMessage(trimmed));
    await dispatch(sendChatMessage({ sessionId, message: trimmed }));
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    dispatch(resetChatSession(sessionId));
    inputRef.current?.focus();
  };

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const showProgress = Object.keys(collectedFields).length > 0;

  return (
    <div className="chat-ui">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="ai-pulse" />
          <div>
            <div className="chat-title">AI Assistant</div>
            <div className="chat-subtitle">Log interaction via chat</div>
          </div>
        </div>
        <button className="reset-btn" onClick={handleReset} title="Reset conversation">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>

      {/* Field Progress */}
      {showProgress && <FieldProgress collectedFields={collectedFields} missingFields={missingFields} />}

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <div className="welcome-icon">💬</div>
            <p className="welcome-text">
              Describe your interaction naturally — I'll extract all CRM fields and ask for anything missing.
            </p>
            <div className="quick-prompts">
              {QUICK_PROMPTS.map((p, i) => (
                <button key={i} className="quick-prompt-btn" onClick={() => handleQuickPrompt(p)}>
                  "{p.slice(0, 55)}..."
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {isTyping && (
          <div className="chat-message-row assistant-row">
            <div className="avatar ai-avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#4f46e5" />
                <path d="M8 12l2.5 2.5L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <TypingIndicator />
          </div>
        )}

        {interactionLogged && (
          <div className="logged-success-banner">
            <span>✅</span>
            <span>Interaction logged successfully! Fetching insights...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder="Describe interaction... (Enter to send)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
        />
        <button
          className={`chat-send-btn ${isTyping ? "disabled" : ""}`}
          onClick={handleSend}
          disabled={isTyping}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

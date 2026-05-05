import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  updateFormField,
  logInteractionDirect,
  resetForm,
  clearMessages,
  setActiveView,
} from "../redux/interactionSlice";

const SENTIMENT_OPTIONS = ["Positive", "Neutral", "Negative"];
const INTERACTION_TYPES = ["Meeting", "Call", "Visit"];

const AI_SUGGESTIONS = [
  "Schedule follow-up meeting in 2 weeks",
  "Send OncoBoost Phase III PDF",
  "Add Dr. Sharma to advisory board invite list",
];

function SentimentButton({ value, selected, onChange }) {
  const icons = { Positive: "😊", Neutral: "😐", Negative: "😟" };
  const colors = { Positive: "sentiment-pos", Neutral: "sentiment-neu", Negative: "sentiment-neg" };
  return (
    <button
      type="button"
      className={`sentiment-btn ${colors[value]} ${selected ? "selected" : ""}`}
      onClick={() => onChange(value)}
    >
      <span className="sentiment-icon">{icons[value]}</span>
      {value}
    </button>
  );
}

function FormField({ label, required, children, hint }) {
  return (
    <div className="form-field">
      <label className="field-label">
        {label}
        {required && <span className="required-star">*</span>}
      </label>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

export default function FormUI() {
  const dispatch = useDispatch();
  const { form, loading, successMessage, error, collectedFields, interactionLogged } =
    useSelector((s) => s.interaction);
  const [voiceNote, setVoiceNote] = useState(false);

  const handleChange = (field) => (e) => {
    dispatch(updateFormField({ field, value: e.target.value }));
  };

  const handleSentiment = (val) => {
    dispatch(updateFormField({ field: "observed_hcp_sentiment", value: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearMessages());
    await dispatch(logInteractionDirect(form));
  };

  const handleReset = () => {
    dispatch(resetForm());
  };

  // Figure out which fields were auto-filled by AI
  const aiFilledFields = Object.keys(collectedFields);

  return (
    <div className="form-ui">
      <div className="form-header">
        <div>
          <h2 className="form-title">Log HCP Interaction</h2>
          {aiFilledFields.length > 0 && (
            <div className="ai-autofill-badge">
              <span className="ai-badge-dot" />
              AI auto-filled {aiFilledFields.length} fields from chat
            </div>
          )}
        </div>
        {interactionLogged && (
          <div className="logged-indicator">
            <span>✅</span> Logged
          </div>
        )}
      </div>

      {/* Success / Error Banners */}
      {successMessage && (
        <div className="banner success-banner">
          {successMessage}
          <button onClick={() => dispatch(clearMessages())}>×</button>
        </div>
      )}
      {error && (
        <div className="banner error-banner">
          ⚠️ {typeof error === "string" ? error : JSON.stringify(error)}
          <button onClick={() => dispatch(clearMessages())}>×</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="interaction-form">
        {/* Section: Basic Details */}
        <div className="form-section">
          <div className="section-title">Interaction Details</div>
          <div className="form-grid two-col">
            <FormField label="HCP Name" required>
              <input
                className={`form-input ${aiFilledFields.includes("hcp_name") ? "ai-filled" : ""}`}
                type="text"
                placeholder="Search or select HCP..."
                value={form.hcp_name}
                onChange={handleChange("hcp_name")}
                required
              />
            </FormField>

            <FormField label="Interaction Type">
              <div className="type-toggle">
                {INTERACTION_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`type-btn ${form.interaction_type === t ? "active" : ""}`}
                    onClick={() => dispatch(updateFormField({ field: "interaction_type", value: t }))}
                  >
                    {t === "Meeting" ? "🤝" : t === "Call" ? "📞" : "🚗"} {t}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="Date">
              <input
                className={`form-input ${aiFilledFields.includes("date") ? "ai-filled" : ""}`}
                type="text"
                placeholder="DD-MM-YYYY"
                value={form.date}
                onChange={handleChange("date")}
              />
            </FormField>

            <FormField label="Time">
              <input
                className={`form-input ${aiFilledFields.includes("time") ? "ai-filled" : ""}`}
                type="text"
                placeholder="HH:MM"
                value={form.time}
                onChange={handleChange("time")}
              />
            </FormField>
          </div>

          <FormField label="Attendees">
            <input
              className={`form-input ${aiFilledFields.includes("attendees") ? "ai-filled" : ""}`}
              type="text"
              placeholder="Enter names or search..."
              value={form.attendees}
              onChange={handleChange("attendees")}
            />
          </FormField>
        </div>

        {/* Section: Topics */}
        <div className="form-section">
          <div className="section-title">Discussion</div>
          <FormField label="Topics Discussed">
            <div className="textarea-wrapper">
              <textarea
                className={`form-textarea ${aiFilledFields.includes("topics_discussed") ? "ai-filled" : ""}`}
                placeholder="Enter key discussion points..."
                value={form.topics_discussed}
                onChange={handleChange("topics_discussed")}
                rows={3}
              />
              <button
                type="button"
                className="voice-note-btn"
                onClick={() => setVoiceNote(!voiceNote)}
                title="Summarize from voice note"
              >
                🎙️
              </button>
            </div>
          </FormField>
          {voiceNote && (
            <div className="voice-note-hint">
              🎙️ Voice note transcription requires consent. Click to record.
            </div>
          )}
        </div>

        {/* Section: Materials & Samples */}
        <div className="form-section">
          <div className="section-title">Materials / Samples Distributed</div>
          <div className="form-grid two-col">
            <FormField label="Materials Shared">
              <div className="input-with-action">
                <input
                  className={`form-input ${aiFilledFields.includes("materials_shared") ? "ai-filled" : ""}`}
                  type="text"
                  placeholder="Search/Add materials..."
                  value={form.materials_shared}
                  onChange={handleChange("materials_shared")}
                />
                <button type="button" className="search-add-btn">🔍 Add</button>
              </div>
            </FormField>

            <FormField label="Samples Distributed">
              <div className="input-with-action">
                <input
                  className={`form-input ${aiFilledFields.includes("samples_distributed") ? "ai-filled" : ""}`}
                  type="text"
                  placeholder="Add sample..."
                  value={form.samples_distributed}
                  onChange={handleChange("samples_distributed")}
                />
                <button type="button" className="search-add-btn">+ Add</button>
              </div>
            </FormField>
          </div>
        </div>

        {/* Section: Sentiment */}
        <div className="form-section">
          <div className="section-title">Observed / Inferred HCP Sentiment</div>
          <div className="sentiment-row">
            {SENTIMENT_OPTIONS.map((s) => (
              <SentimentButton
                key={s}
                value={s}
                selected={form.observed_hcp_sentiment === s}
                onChange={handleSentiment}
              />
            ))}
          </div>
        </div>

        {/* Section: Outcomes */}
        <div className="form-section">
          <div className="section-title">Results</div>
          <FormField label="Outcomes">
            <textarea
              className={`form-textarea ${aiFilledFields.includes("outcomes") ? "ai-filled" : ""}`}
              placeholder="Key outcomes or agreements..."
              value={form.outcomes}
              onChange={handleChange("outcomes")}
              rows={2}
            />
          </FormField>

          <FormField label="Follow-up Actions">
            <textarea
              className={`form-textarea ${aiFilledFields.includes("follow_up_actions") ? "ai-filled" : ""}`}
              placeholder="Enter next steps or tasks..."
              value={form.follow_up_actions}
              onChange={handleChange("follow_up_actions")}
              rows={2}
            />
          </FormField>
        </div>

        {/* AI Suggested Follow-ups */}
        <div className="ai-suggestions">
          <div className="suggestions-label">
            <span className="ai-spark">✨</span> AI Suggested Follow-ups:
          </div>
          <ul className="suggestions-list">
            {AI_SUGGESTIONS.map((s, i) => (
              <li key={i} className="suggestion-item">
                <button
                  type="button"
                  className="suggestion-link"
                  onClick={() =>
                    dispatch(updateFormField({ field: "follow_up_actions", value: s }))
                  }
                >
                  → {s}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={handleReset}>
            Reset
          </button>
          <button
            type="submit"
            className={`btn-primary ${loading ? "loading" : ""}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" /> Logging...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Log Interaction
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

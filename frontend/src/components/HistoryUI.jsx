import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchInteractions, deleteInteractionById, fetchHCPInsights, setActiveView } from "../redux/interactionSlice";

const SENTIMENT_COLORS = { Positive: "#22c55e", Neutral: "#f59e0b", Negative: "#ef4444" };
const SENTIMENT_BG = { Positive: "#f0fdf4", Neutral: "#fffbeb", Negative: "#fef2f2" };

export default function HistoryUI() {
  const dispatch = useDispatch();
  const { interactions, loading, insights, insightsLoading } = useSelector((s) => s.interaction);
  const [search, setSearch] = useState("");
  const [selectedHCP, setSelectedHCP] = useState(null);

  useEffect(() => {
    dispatch(fetchInteractions());
  }, [dispatch]);

  const filtered = interactions.filter(
    (i) =>
      !search ||
      i["HCP Name"]?.toLowerCase().includes(search.toLowerCase()) ||
      i["Topics Discussed"]?.toLowerCase().includes(search.toLowerCase())
  );

  const handleViewInsights = (hcpName) => {
    setSelectedHCP(hcpName);
    dispatch(fetchHCPInsights(hcpName));
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this interaction?")) {
      dispatch(deleteInteractionById(id));
    }
  };

  return (
    <div className="history-ui">
      <div className="history-header">
        <h2 className="history-title">Interaction History</h2>
        <div className="history-search-wrap">
          <input
            className="history-search"
            placeholder="Search by HCP or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className="btn-primary small"
            onClick={() => dispatch(setActiveView("log"))}
          >
            + New Interaction
          </button>
        </div>
      </div>

      {loading ? (
        <div className="history-loading">
          <div className="spinner large" />
          <span>Loading interactions...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="history-empty">
          <div className="empty-icon">📋</div>
          <p>No interactions found. Start by logging one!</p>
          <button className="btn-primary" onClick={() => dispatch(setActiveView("log"))}>
            Log First Interaction
          </button>
        </div>
      ) : (
        <div className="interaction-list">
          {filtered.map((interaction) => (
            <div key={interaction.id} className="interaction-card">
              <div className="card-top">
                <div className="card-hcp">
                  <div className="hcp-avatar">{(interaction["HCP Name"] || "?")[0]}</div>
                  <div>
                    <div className="hcp-name">{interaction["HCP Name"]}</div>
                    <div className="hcp-meta">
                      <span className="type-tag">{interaction["Interaction Type"]}</span>
                      {interaction["Date"] && <span>· {interaction["Date"]}</span>}
                      {interaction["Time"] && <span>· {interaction["Time"]}</span>}
                    </div>
                  </div>
                </div>
                <div className="card-right">
                  {interaction["Observed HCP Sentiment"] && (
                    <span
                      className="sentiment-tag"
                      style={{
                        color: SENTIMENT_COLORS[interaction["Observed HCP Sentiment"]],
                        backgroundColor: SENTIMENT_BG[interaction["Observed HCP Sentiment"]],
                      }}
                    >
                      {interaction["Observed HCP Sentiment"]}
                    </span>
                  )}
                </div>
              </div>

              {interaction["Topics Discussed"] && (
                <div className="card-section">
                  <span className="card-label">Topics:</span>
                  <span className="card-value">{interaction["Topics Discussed"]}</span>
                </div>
              )}
              {interaction["Outcomes"] && (
                <div className="card-section">
                  <span className="card-label">Outcomes:</span>
                  <span className="card-value">{interaction["Outcomes"]}</span>
                </div>
              )}
              {interaction["Follow-up Actions"] && (
                <div className="card-section">
                  <span className="card-label">Follow-up:</span>
                  <span className="card-value highlight-followup">{interaction["Follow-up Actions"]}</span>
                </div>
              )}

              <div className="card-actions">
                <button
                  className="card-action-btn insights-btn"
                  onClick={() => handleViewInsights(interaction["HCP Name"])}
                >
                  📊 Insights
                </button>
                <button
                  className="card-action-btn delete-btn"
                  onClick={() => handleDelete(interaction.id)}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Insights Panel */}
      {selectedHCP && (
        <div className="insights-panel">
          <div className="insights-panel-header">
            <h3>📊 Insights: {selectedHCP}</h3>
            <button onClick={() => setSelectedHCP(null)}>×</button>
          </div>
          {insightsLoading ? (
            <div className="panel-loading"><div className="spinner" /> Loading insights...</div>
          ) : insights ? (
            <div className="insights-body">
              <div className="insight-stat-grid">
                <div className="insight-stat">
                  <div className="stat-num">{insights.total_interactions}</div>
                  <div className="stat-label">Total Interactions</div>
                </div>
                <div className="insight-stat">
                  <div className="stat-num" style={{ color: SENTIMENT_COLORS[insights.dominant_sentiment] }}>
                    {insights.dominant_sentiment}
                  </div>
                  <div className="stat-label">Dominant Sentiment</div>
                </div>
                <div className="insight-stat">
                  <div className="stat-num">{insights.engagement_level}</div>
                  <div className="stat-label">Engagement</div>
                </div>
              </div>
              {insights.sentiment_breakdown && (
                <div className="sentiment-breakdown">
                  <div className="breakdown-title">Sentiment Breakdown</div>
                  {Object.entries(insights.sentiment_breakdown).map(([k, v]) => (
                    <div key={k} className="breakdown-row">
                      <span style={{ color: SENTIMENT_COLORS[k] }}>{k}</span>
                      <div className="breakdown-bar-bg">
                        <div
                          className="breakdown-bar-fill"
                          style={{
                            width: `${insights.total_interactions > 0 ? (v / insights.total_interactions) * 100 : 0}%`,
                            backgroundColor: SENTIMENT_COLORS[k],
                          }}
                        />
                      </div>
                      <span className="breakdown-count">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

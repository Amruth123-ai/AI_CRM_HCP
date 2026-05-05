import React, { useEffect, useState } from "react";

export default function InsightsUI() {
  const [hcpName, setHcpName] = useState("");
  const [insights, setInsights] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [followUp, setFollowUp] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/interactions")
      .then(res => res.json())
      .then(data => {
        if (data.length > 0) {
          const last = data[data.length - 1];
          setHcpName(last.hcp_name);
        }
      });
  }, []);

  const callAPI = async (message) => {
    const res = await fetch("http://127.0.0.1:8000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        session_id: "insights_session"
      })
    });

    return res.json();
  };

  const fetchInsights = async () => {
    setLoading(true);

    const i = await callAPI(`show insights for ${hcpName}`);
    const s = await callAPI(`when should i meet ${hcpName} next`);
    const f = await callAPI(`what should i do next for ${hcpName}`);

    setInsights(i.data);
    setSchedule(s.data);
    setFollowUp(f.data);

    setLoading(false);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>📊 Analytics Dashboard</h2>

      <div style={{ marginBottom: "20px" }}>
        <input
          value={hcpName}
          onChange={(e) => setHcpName(e.target.value)}
          placeholder="Doctor name"
        />
        <button onClick={fetchInsights}>Load</button>
      </div>

      {loading && <p>Loading...</p>}

      {insights && (
        <div className="card">
          <h3>👨‍⚕️ HCP Insights</h3>
          <p><b>Name:</b> {insights.hcp_name}</p>
          <p><b>Total:</b> {insights.total_interactions}</p>
          <p><b>Engagement:</b> {insights.engagement}</p>
          <p><b>Sentiment:</b> {insights.sentiment}</p>
        </div>
      )}

      {schedule && (
        <div className="card">
          <h3>📅 Schedule</h3>
          <p><b>Date:</b> {schedule.suggested_date}</p>
          <p><b>Time:</b> {schedule.suggested_time}</p>
        </div>
      )}

      {followUp && (
        <div className="card">
          <h3>🎯 Actions</h3>
          <ul>
            {followUp.actions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
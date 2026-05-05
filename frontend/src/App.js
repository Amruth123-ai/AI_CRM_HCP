import React, { useEffect } from "react";
import { Provider, useDispatch, useSelector } from "react-redux";
import store from "./redux/store";
import ChatUI from "./components/ChatUI";
import FormUI from "./components/FormUI";
import HistoryUI from "./components/HistoryUI";
import { setSessionId } from "./redux/chatSlice";
import { setActiveView } from "./redux/interactionSlice";
import "./styles/app.css";
import InsightsUI from "./components/InsightsUI";

function generateSessionId() {
  return "session_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
}

function NavItem({ icon, label, view, activeView, onClick }) {
  return (
    <button
      className={`nav-item ${activeView === view ? "nav-active" : ""}`}
      onClick={() => onClick(view)}
    >
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>
    </button>
  );
}

function AppContent() {
  const dispatch = useDispatch();
  const { sessionId } = useSelector((s) => s.chat);
  const { activeView } = useSelector((s) => s.interaction);

  useEffect(() => {
    const id = generateSessionId();
    dispatch(setSessionId(id));
  }, [dispatch]);

  const handleNav = (view) => {
    dispatch(setActiveView(view));
  };

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">⚕️</div>
          <div className="logo-text">
            <div className="logo-name">HCP<span>CRM</span></div>
            <div className="logo-tagline">AI-powered</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavItem icon="📝" label="Log Interaction" view="log" activeView={activeView} onClick={handleNav} />
          <NavItem icon="📋" label="History" view="history" activeView={activeView} onClick={handleNav} />
          <NavItem icon="📊" label="Insights" view="insights" activeView={activeView} onClick={handleNav} />
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar-sm">MR</div>
            <div>
              <div className="user-name">Medical Rep</div>
              <div className="user-role">Sales Rep</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {activeView === "log" && (
          <div className="log-layout">
            <div className="form-panel">
              <FormUI />
            </div>
            <div className="chat-panel">
              {sessionId && <ChatUI sessionId={sessionId} />}
            </div>
          </div>
        )}

        {activeView === "history" && (
          <div className="single-panel">
            <HistoryUI />
          </div>
        )}

        {activeView === "insights" && (
          <div className="single-panel">
            <InsightsUI />
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API = "http://localhost:8000";

export const sendChatMessage = createAsyncThunk(
  "chat/sendMessage",
  async ({ sessionId, message }, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${API}/chat`, {
        session_id: sessionId,
        message,
      });
      return { ...res.data, userMessage: message };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const resetChatSession = createAsyncThunk(
  "chat/resetSession",
  async (sessionId) => {
    await axios.post(`${API}/chat/reset?session_id=${sessionId}`);
    return sessionId;
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    sessionId: null,
    messages: [], // { role: "user"|"assistant", content: string, timestamp: Date }
    isTyping: false,
    error: null,
    collectedFields: {},
    missingFields: [],
    interactionLogged: false,
    toolResults: [],
    suggestedFollowUps: [],
  },
  reducers: {
    setSessionId: (state, action) => {
      state.sessionId = action.payload;
    },
    addUserMessage: (state, action) => {
      state.messages.push({
        role: "user",
        content: action.payload,
        timestamp: new Date().toISOString(),
      });
    },
    clearChat: (state) => {
      state.messages = [];
      state.collectedFields = {};
      state.missingFields = [];
      state.interactionLogged = false;
      state.toolResults = [];
      state.error = null;
    },
    setSuggestedFollowUps: (state, action) => {
      state.suggestedFollowUps = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendChatMessage.pending, (state) => {
        state.isTyping = true;
        state.error = null;
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.isTyping = false;
        state.messages.push({
          role: "assistant",
          content: action.payload.response,
          timestamp: new Date().toISOString(),
          toolResults: action.payload.tool_results,
        });
        state.collectedFields = action.payload.data || {};
        state.missingFields = [];
        state.interactionLogged = action.payload.interaction_logged || true;
        state.toolResults = action.payload.tool_results || [];

        // Extract follow-up suggestions from tool results
        const followUpResult = action.payload.tool_results?.find(
          (r) => r.next_best_actions
        );
        if (followUpResult) {
          state.suggestedFollowUps = followUpResult.next_best_actions;
        }
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.isTyping = false;
        state.error = action.payload;
        state.messages.push({
          role: "assistant",
          content: "⚠️ I encountered an error. Please try again.",
          timestamp: new Date().toISOString(),
          isError: true,
        });
      })
      .addCase(resetChatSession.fulfilled, (state) => {
        state.messages = [];
        state.collectedFields = {};
        state.missingFields = [];
        state.interactionLogged = false;
        state.toolResults = [];
        state.suggestedFollowUps = [];
      });
  },
});

export const { setSessionId, addUserMessage, clearChat, setSuggestedFollowUps } = chatSlice.actions;
export default chatSlice.reducer;

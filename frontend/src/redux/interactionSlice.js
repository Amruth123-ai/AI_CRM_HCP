import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API = "http://localhost:8000";

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const fetchInteractions = createAsyncThunk(
  "interaction/fetchAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${API}/interactions`, { params });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const logInteractionDirect = createAsyncThunk(
  "interaction/logDirect",
  async (data, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${API}/interactions`, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const fetchHCPInsights = createAsyncThunk(
  "interaction/fetchInsights",
  async (hcpName, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${API}/hcp/${encodeURIComponent(hcpName)}/insights`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const deleteInteractionById = createAsyncThunk(
  "interaction/delete",
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${API}/interactions/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const interactionSlice = createSlice({
  name: "interaction",
  initialState: {
    // Form state
    form: {
      hcp_name: "",
      interaction_type: "Meeting",
      date: "",
      time: "",
      attendees: "",
      topics_discussed: "",
      materials_shared: "",
      samples_distributed: "",
      observed_hcp_sentiment: "Neutral",
      outcomes: "",
      follow_up_actions: "",
    },
    // Collected from chat
    collectedFields: {},
    missingFields: [],
    interactionLogged: false,
    // List
    interactions: [],
    // Insights
    insights: null,
    // Loading states
    loading: false,
    insightsLoading: false,
    error: null,
    successMessage: null,
    // Current view
    activeView: "log", // "log" | "history" | "insights"
  },
  reducers: {
    updateFormField: (state, action) => {
      const { field, value } = action.payload;
      state.form[field] = value;
    },
    setFormFromCollected: (state, action) => {
      const data = action.payload;
      if (data["HCP Name"]) state.form.hcp_name = data["HCP Name"];
      if (data["Interaction Type"]) state.form.interaction_type = data["Interaction Type"];
      if (data["Date"]) state.form.date = data["Date"];
      if (data["Time"]) state.form.time = data["Time"];
      if (data["Attendees"]) state.form.attendees = data["Attendees"];
      if (data["Topics Discussed"]) state.form.topics_discussed = data["Topics Discussed"];
      if (data["Materials Shared"]) state.form.materials_shared = data["Materials Shared"];
      if (data["Samples Distributed"]) state.form.samples_distributed = data["Samples Distributed"];
      if (data["Observed HCP Sentiment"]) state.form.observed_hcp_sentiment = data["Observed HCP Sentiment"];
      if (data["Outcomes"]) state.form.outcomes = data["Outcomes"];
      if (data["Follow-up Actions"]) state.form.follow_up_actions = data["Follow-up Actions"];
    },
    updateCollectedFields: (state, action) => {
      state.collectedFields = action.payload;
    },
    updateMissingFields: (state, action) => {
      state.missingFields = action.payload;
    },
    setInteractionLogged: (state, action) => {
      state.interactionLogged = action.payload;
    },
    setActiveView: (state, action) => {
      state.activeView = action.payload;
    },
    resetForm: (state) => {
      state.form = {
        hcp_name: "",
        interaction_type: "Meeting",
        date: "",
        time: "",
        attendees: "",
        topics_discussed: "",
        materials_shared: "",
        samples_distributed: "",
        observed_hcp_sentiment: "Neutral",
        outcomes: "",
        follow_up_actions: "",
      };
      state.collectedFields = {};
      state.missingFields = [];
      state.interactionLogged = false;
      state.successMessage = null;
    },
    clearMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all
      .addCase(fetchInteractions.pending, (state) => { state.loading = true; })
      .addCase(fetchInteractions.fulfilled, (state, action) => {
        state.loading = false;
        state.interactions = action.payload;
      })
      .addCase(fetchInteractions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Log direct
      .addCase(logInteractionDirect.pending, (state) => { state.loading = true; })
      .addCase(logInteractionDirect.fulfilled, (state, action) => {
        state.loading = false;
        state.interactions.unshift(action.payload);
        state.successMessage = "✅ Interaction logged successfully!";
        state.interactionLogged = true;
      })
      .addCase(logInteractionDirect.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Insights
      .addCase(fetchHCPInsights.pending, (state) => { state.insightsLoading = true; })
      .addCase(fetchHCPInsights.fulfilled, (state, action) => {
        state.insightsLoading = false;
        state.insights = action.payload;
      })
      .addCase(fetchHCPInsights.rejected, (state, action) => {
        state.insightsLoading = false;
        state.error = action.payload;
      })
      // Delete
      .addCase(deleteInteractionById.fulfilled, (state, action) => {
        state.interactions = state.interactions.filter((i) => i.id !== action.payload);
      });
  },
});

export const {
  updateFormField,
  setFormFromCollected,
  updateCollectedFields,
  updateMissingFields,
  setInteractionLogged,
  setActiveView,
  resetForm,
  clearMessages,
} = interactionSlice.actions;

export default interactionSlice.reducer;

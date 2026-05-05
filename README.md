#  AI-Powered CRM for Healthcare Professionals

An end-to-end **AI-first CRM system** that converts natural language into structured CRM data, featuring intelligent insights, automated scheduling, and personalized follow-up recommendations.

---

##  Overview

This project allows medical representatives to log HCP (Healthcare Professional) interactions using **plain English instead of manual forms**. The AI seamlessly bridges the gap between conversational input and structured database entry.

### The system automatically:
- Extracts structured data from natural language
- Auto-fills the CRM form in real-time
- Stores interaction data in a PostgreSQL database
- Generates actionable insights, meeting schedules, and follow-up tasks

---

##  Tech Stack

- **Frontend:** React, Redux Toolkit
- **Backend:** FastAPI, SQLAlchemy
- **Database:** PostgreSQL
- **AI Layer:** LLaMA (via Groq API)llama-3.3-70b-versatile

---

##  Features

-  **AI-Powered Form Filling:** Intelligent extraction of CRM fields from chat.
-  **Conversation Memory:** Session-based context tracking for incomplete fields.
-  **Save vs. Update Logic:** Dynamically creates new records or edits existing ones.
-  **HCP Insights (AI-Based):** Generates engagement levels, sentiment analysis, and summaries.
-  **Smart Scheduling:** AI suggests optimal dates and times for next meetings.
-  **Follow-up Recommendations:** Recommends the next best actions based on interaction history.
-  **Similarity-Based Doctor Search:** Easily look up HCPs.
-  **Real-Time Sync:** Redux state synchronization between chat and form views.

---

##  Project Structure

```text
ai-crm-hcp/
│
├── backend/                  # FastAPI + SQLAlchemy
│   ├── main.py
│   ├── agent/
│   │   ├── langgraph_agent.py
│   │   ├── tools.py
│   ├── db/
│       ├── models.py
│       ├── database.py
│
├── frontend/                 # React + Redux
│   ├── src/
│       ├── components/
│       ├── redux/
│       ├── App.js
```

---

##  Environment Variables

Create a `.env` file inside the **`backend/`** directory with the following variables:

```ini
# AI Configuration
GROQ_API_KEY=your_api_key_here

# PostgreSQL Database Configuration
DB_HOST=DB_HOSTNAME
DB_PORT=DB_POST
DB_NAME=DB_NAME
DB_USER=DB_USERNAME
DB_PASSWORD=DB_PASSWORD

# Application Configuration
APP_ENV=development
CORS_ORIGINS=http://localhost:3000
```

---

##  Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   ```

3. **Activate the environment:**
   - On Windows: `venv\Scripts\activate`
   - On macOS/Linux: `source venv/bin/activate`

4. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Run the server:**
   ```bash
   uvicorn main:app --reload
   ```
   **Backend URL:** [http://127.0.0.1:8000](http://127.0.0.1:8000)

---

##  Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the frontend:**
   ```bash
   npm start
   ```
   **Frontend URL:** [http://localhost:3000](http://localhost:3000)

---

##  How It Works

1. **User Input:** Medical representative types a natural language summary in the chat interface.
2. **AI Extraction:** The LLaMA LLM parses the text and extracts structured CRM fields.
3. **Redux Update:** The frontend dispatches `updateFormData(response.data)`.
4. **Form Auto-Fill:** The UI instantly reflects the extracted data via Redux state.
5. **Save / Update:** 
   - Typing "save" creates a new database record.
   - Providing updated information modifies the existing draft.

---

##  AI Tools

- **`log_interaction`**: Stores the complete interaction safely in the database.
- **`edit_interaction`**: Updates targeted fields of existing records.
- **`get_hcp_insights`**: Analyzes history to return engagement levels, sentiment, and AI-generated summaries.
- **`smart_schedule`**: Computes and suggests the next optimal meeting time.
- **`suggest_follow_up`**: Evaluates the interaction context to recommend the next best actions.

---

##  API Endpoints

| Method | Endpoint | Description |
|--------|---------|-------------|
| **POST** | `/chat` | Process natural language input |
| **GET** | `/interactions` | Retrieve all logged interactions |
| **GET** | `/hcp/{name}/insights` | Get AI insights for a specific doctor |
| **GET** | `/hcp/{name}/schedule` | Get meeting schedule recommendations |
| **GET** | `/hcp/{name}/followup` | Get next best action recommendations |

---

##  Example Flow

> **User:** *"I met Doctor Shyam today at 10 AM. We discussed the new clinical trials."*
> **System:** *Extracts data → Form auto-fills HCP Name, Time, Topics Discussed.*
> 
> **User:** *"Save."*
> **System:** *Data stored securely in PostgreSQL.*
> 
> **User:** *"Show insights."*
> **System:** *AI generates insights (e.g., "High Engagement, Positive Sentiment").*
> 
> **User:** *"What should I do next?"*
> **System:** *AI suggests follow-up actions (e.g., "Send clinical trial brochure, Schedule follow-up for next week").*

---

##  Key Highlights

- Converts **unstructured text into structured CRM data**.
- Eliminates tedious manual CRM data entry.
- Drives decision-making with AI-generated insights.
- Utilizes a modular, tool-based LangGraph/FastAPI architecture.
- Real-time seamless UI synchronization using Redux.

---

##  Notes

- Ensure your local **PostgreSQL** instance is running and matches the credentials in your `.env` file.
- The **Groq API key** is mandatory for the LLaMA model to process AI features.

---

##  Future Improvements

- Doctor conversion prediction models
- Engagement scoring and territory leaderboards
- Advanced analytics dashboard (graphs & charts)
- Recommendation ranking system for best-action pathways

---

## Author

**Amruth**  
Software Engineer | AI/ML Enthusiast

---

##  License

This project is for educational and demonstration purposes.
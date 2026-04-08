import axios from 'axios';

// Layer 6: FastAPI backend (scaled) - configurable via environment variable
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30s timeout for LLM responses
  withCredentials: false,
});

// Layer 6: Health check (API Gateway)
export const testConnection = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
      throw new Error('Cannot connect to backend server. Please ensure it is running on http://localhost:8000');
    } else if (error.response) {
      throw new Error(`Backend responded with error: ${error.response.status}`);
    } else {
      throw new Error(`Connection failed: ${error.message}`);
    }
  }
};

// Layer 6: RAG engine + Groq LLM + Session store
export const sendMessage = async (message, sessionId = null) => {
  try {
    if (!message || typeof message !== 'string' || !message.trim()) {
      throw new Error('Message must be a non-empty string');
    }
    const requestBody = { message: message.trim() };
    if (sessionId) requestBody.session_id = sessionId;
    const response = await api.post('/chat', requestBody);
    return response.data;
  } catch (error) {
    if (error.response) {
      let detail = error.response.data?.detail || 'Failed to send message';
      if (Array.isArray(detail)) detail = detail.map(d => d.msg || d).join(', ');
      throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } else if (error.request) {
      throw new Error('Unable to connect to the server. Check that the backend is running on http://localhost:8000');
    } else {
      throw new Error('An unexpected error occurred: ' + error.message);
    }
  }
};

// Layer 2→7: Live price stream (Kafka topics: travel.flights, travel.hotels)
export const getLivePrices = async () => {
  try {
    const response = await api.get('/live-prices');
    return response.data;
  } catch {
    return null; // Component falls back to mock data
  }
};

// Layer 4→7: Spark batch analytics (aggregate ratings, trend analysis, price history)
export const getAnalytics = async () => {
  try {
    const response = await api.get('/analytics');
    return response.data;
  } catch {
    return null;
  }
};

// Layer 5: Feature store - user preferences and seasonal signals
export const getUserPreferences = async (sessionId) => {
  try {
    const response = await api.get(`/preferences/${sessionId}`);
    return response.data;
  } catch {
    return null;
  }
};

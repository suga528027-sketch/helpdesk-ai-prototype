import axios from 'axios'

// Use the Vite proxy defined in vite.config.js to avoid CORS issues
const API_BASE = '/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // 60s for LLM calls
  headers: { 'Content-Type': 'application/json' },
})

export const submitTicket = (data) => api.post('/ticket/submit', data)
export const getTicket = (id) => api.get(`/ticket/${id}`)
export const getAllTickets = (params) => api.get('/tickets/all', { params })
export const getAnalytics = () => api.get('/analytics/summary')
export const getAgentAnalytics = () => api.get('/analytics/agents')
export const submitFeedback = (data) => api.post('/feedback', data)
export const getKnowledgeBase = (params) => api.get('/knowledge-base', { params })
export const getLeaderboard = () => api.get('/agents/leaderboard')
export const chatbotQuery = (query) => api.post('/chatbot/query', null, { params: { query } })
export const generateRCA = (id) => api.post(`/ticket/${id}/rca`)
export const submitTicketWithImage = (formData) => api.post('/ticket/submit-with-image', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
export const healthCheck = () => api.get('/health')

export default api

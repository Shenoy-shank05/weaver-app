import axios, { type AxiosError } from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
const ML_SERVICE_URL = process.env.NEXT_PUBLIC_ML_SERVICE_URL || "http://localhost:5001"

// Create axios instances
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
})

const mlClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: 60000,
})

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Error handling interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token")
      window.location.href = "/login"
    }
    return Promise.reject(error)
  },
)

// Auth API
export const authAPI = {
  signup: (data: { name: string; email: string; password: string }) => apiClient.post("/api/auth/signup", data),
  login: (data: { email: string; password: string }) => apiClient.post("/api/auth/login", data),
}

// Prediction API
export const predictionAPI = {
  getHistory: () => apiClient.get("/api/history"),
  deletePrediction: (id: string) => apiClient.delete(`/api/history/${id}`),
  savePrediction: (data: any) => apiClient.post("/api/save-prediction", data),
  getRecent: () => apiClient.get("/api/recent"),
}

// ML Service API
export const mlAPI = {
  predict: (data: any) => mlClient.post("/api/predict", data),
  scrape: (url: string) => mlClient.post("/api/scrape", { url }),
  batchPredict: (jobs: any[]) => mlClient.post("/api/batch-predict", { jobs }),
}

// Health checks
export const healthAPI = {
  checkBackend: () => apiClient.get("/api/health"),
  checkMLService: () => mlClient.get("/api/health"),
}

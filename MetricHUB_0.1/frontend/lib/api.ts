// Resolve API base URL
function resolveDefaultApiBase() {
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location
    // If running Next dev on 3000, talk to backend on 5001
    if (port === '3000') return `${protocol}//${hostname}:5001`
    // Otherwise use the current origin (useful when served by Flask)
    return `${protocol}//${hostname}${port ? `:${port}` : ''}`
  }
  // SSR/Build fallback
  return 'http://localhost:5001'
}

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || resolveDefaultApiBase()).replace(/\/$/, '')
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || API_BASE

function generateMockHistory(id: string) {
  const points = []
  const now = Date.now()
  const count = 300 // 5 minutes of data at 1s interval

  for (let i = 0; i < count; i++) {
    points.push({
      time: (now / 1000) - (count - i), // Unix timestamp in seconds
      values: {
        "0": Math.sin(i * 0.1) * 10 + 45 + (Math.random() * 2), // Temp approx 45C
        "1": Math.cos(i * 0.05) * 5 + 12 + (Math.random() * 0.5) // Voltage approx 12V
      }
    })
  }

  return {
    experiment_id: id,
    name: "Demo Experiment: " + id,
    collector_id: "DEMO_COLLECTOR",
    start_timestamp_utc: (now - (count * 1000)),
    status: "completed",
    history: points,
    config: {
      "0": { id: "0", name: "Reactor Temp", type: "temp", enabled: true },
      "1": { id: "1", name: "Valve Voltage", type: "volt", enabled: true }
    }
  }
}

// --- Demo Mode Helpers ---
export const DEMO_KEY = "daqpg_demo_mode"
export const isDemoMode = () => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(DEMO_KEY) === 'true'
}
export const enableDemoMode = () => {
  if (typeof window !== 'undefined') localStorage.setItem(DEMO_KEY, 'true')
}
export const disableDemoMode = () => {
  if (typeof window !== 'undefined') localStorage.removeItem(DEMO_KEY)
}
// -------------------------

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginResponse {
  success: boolean
  role: string
  message?: string
}

export interface StatusResponse {
  logged_in: boolean
  role?: string
  username?: string
}

export interface Collector {
  id: string
  status: "online" | "offline" | "running"
  last_seen: number
  latest_data?: number[]
}

export interface ExperimentConfig {
  collector_id: string
  name: string
  interval: number
  duration: number
  config: Record<
    string,
    {
      id: string
      name: string
      type: string
      enabled: boolean
    }
  >
}

export interface Experiment {
  id: string
  name: string
  collector_id: string
  start_timestamp_utc: number
  end_timestamp_utc?: number
  status: "running" | "completed"
  duration?: number
  config: Record<string, any>
}

export interface ExperimentData {
  experiment_id: string
  history: Array<{
    time: number
    values: Record<string, number>
  }>
  config: Record<string, any>
  is_running: boolean
}

// Authentication API
export const authApi = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      if (isDemoMode()) {
        return { success: true, role: 'admin', message: 'Demo Login Successful' }
      }
      const response = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      })
      if (!response.ok) throw new Error('Network response was not ok')
      return response.json()
    } catch (e) {
      console.warn("API Login failed, checking for manual demo override or fallback...", e)
      // Note: We don't auto-fallback to demo on failed login unless explicitly set, 
      // but we will let the UI handle the "Activate Demo" action.
      throw e
    }
  },

  async logout(): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/api/logout`, { credentials: 'include' })
    return response.json()
  },

  async getStatus(): Promise<StatusResponse> {
    if (isDemoMode()) {
      return { logged_in: true, role: 'admin', username: 'Demo User' }
    }
    try {
      const response = await fetch(`${API_BASE}/api/status`, { credentials: 'include' })
      if (!response.ok) throw new Error('Network error')
      return response.json()
    } catch (e) {
      return { logged_in: false }
    }
  },
}

// Data API (would integrate with Flask routes)
export const dataApi = {
  async sendData(collectorId: string, readings: number[]): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/api/data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: 'include',
      body: JSON.stringify({
        collector_id: collectorId,
        readings,
      }),
    })
    return response.json()
  },
}

// Socket.IO integration helpers
export class SocketManager {
  public socket: any = null
  private subscriptions: Set<string> = new Set()
  private pendingListeners: Record<string, Function[]> = {
    experiments_update: [],
    collectors_update: [],
    new_data: [],
    experiment_history: [],
    xlsx_generated: [],
    initial_config: [],
    connect: [],
    disconnect: [],
  }

  connect() {
    if (typeof window === "undefined") return
    if (this.socket && this.socket.connected) return

    // --- Demo Mode Injection ---
    if (isDemoMode()) {
      console.log("Starting Demo Simulation...")
      this.startDemoSimulation()
      return
    }
    // ---------------------------

    if (this.socket && !this.socket.connected) {
      try {
        this.socket.connect()
        return
      } catch { }
    }
    import("socket.io-client").then(({ io }) => {
      this.socket = io(SOCKET_URL, {
        withCredentials: true,
        transports: ["polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 500,
      })
      this.setupEventHandlers()
      Object.entries(this.pendingListeners).forEach(([event, callbacks]) => {
        callbacks.forEach((cb) => this.socket.on(event, cb))
        this.pendingListeners[event] = []
      })
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return
    this.socket.on("connect", () => {
      console.log("Connected to server")
      // Re-subscribe to any experiments after reconnect
      this.subscriptions.forEach((expId) => {
        this.socket.emit("subscribe_to_experiment", expId)
      })
    })
    this.socket.on("disconnect", () => {
      console.log("Disconnected from server")
    })
    this.socket.on("error", (error: any) => {
      console.error("Socket error:", error)
    })
  }

  // Experiment management
  startExperiment(config: ExperimentConfig) {
    if (this.socket) this.socket.emit("start_experiment", config)
  }
  stopExperiment(experimentId: string) {
    if (this.socket) this.socket.emit("stop_experiment", experimentId)
  }
  subscribeToExperiment(experimentId: string) {
    this.subscriptions.add(String(experimentId))

    if (isDemoMode()) {
      console.log("Mocking subscription for:", experimentId)
      const history = generateMockHistory(experimentId) as any
      // Use timeout to simulate network delay
      setTimeout(() => {
        this.pendingListeners.experiment_history.forEach(cb => cb(history))
      }, 500)
      return
    }

    if (this.socket) this.socket.emit("subscribe_to_experiment", experimentId)
  }
  unsubscribeFromExperiment(experimentId: string) {
    this.subscriptions.delete(String(experimentId))
    if (this.socket) this.socket.emit("unsubscribe_from_experiment", experimentId)
  }

  // Event listeners
  onExperimentsUpdate(
    callback: (data: { running: Record<string, Experiment>; completed: Record<string, Experiment> }) => void,
  ) {
    if (this.socket) this.socket.on("experiments_update", callback)
    else this.pendingListeners.experiments_update.push(callback)
  }
  onCollectorsUpdate(callback: (collectors: Record<string, Collector>) => void) {
    if (this.socket) this.socket.on("collectors_update", callback)
    else this.pendingListeners.collectors_update.push(callback)
  }
  onNewData(callback: (data: { experiment_id: string; data: any }) => void) {
    if (this.socket) this.socket.on("new_data", callback)
    else this.pendingListeners.new_data.push(callback)
  }
  onExperimentHistory(callback: (data: ExperimentData) => void) {
    if (this.socket) this.socket.on("experiment_history", callback)
    else this.pendingListeners.experiment_history.push(callback)
  }
  onInitialConfig(callback: (config: Record<string, any>) => void) {
    if (this.socket) this.socket.on("initial_config", callback)
    else this.pendingListeners.initial_config.push(callback)
  }
  onXlsxGenerated(callback: (payload: { filename: string; data: string }) => void) {
    if (this.socket) this.socket.on("xlsx_generated", callback)
    else this.pendingListeners.xlsx_generated.push(callback)
  }
  onConnect(callback: () => void) {
    if (this.socket && this.socket.connected) callback()
    this.pendingListeners.connect.push(callback)
    if (this.socket) this.socket.on("connect", callback)
  }
  onDisconnect(callback: () => void) {
    this.pendingListeners.disconnect.push(callback)
    if (this.socket) this.socket.on("disconnect", callback)
  }

  // Utility methods
  getCollectorData(collectorId: string) {
    if (this.socket) this.socket.emit("get_collector_data", collectorId)
  }
  generateXLSX(experimentId: string) {
    if (this.socket) this.socket.emit("generate_xlsx", experimentId)
  }
  deleteExperiment(experimentId: string) {
    if (this.socket) this.socket.emit("delete_experiment", experimentId)
  }

  // --- Demo Simulation ---
  private demoInterval: any = null
  private startDemoSimulation() {
    if (this.demoInterval) return

    // Simulate "Connected"
    this.pendingListeners.connect.forEach(cb => cb())

    // Mock Data
    const mockExperiments = {
      running: {},
      completed: {
        "demo-1": {
          id: "demo-1",
          name: "Demo: Reactor Temperature",
          collector_id: "LAB_01",
          start_timestamp_utc: Date.now() - 3600000,
          status: "completed",
          duration: 3600,
          config: {}
        },
        "demo-2": {
          id: "demo-2",
          name: "Demo: Vibration Analysis",
          collector_id: "LAB_02",
          start_timestamp_utc: Date.now() - 7200000,
          status: "completed",
          duration: 1800,
          config: {}
        }
      }
    } as any

    // Emit initial list
    this.pendingListeners.experiments_update.forEach(cb => cb(mockExperiments))

    // Simulate real-time data if "subscribed" (for Reports page mainly we just need the list, 
    // but if meaningful, we simulate 'experiment_history' when requested)

    // Override 'subscribe_to_experiment' logic for demo
    // We can't easily override emit() without Proxies, but we can hook into 'getCollectorData' etc.
  }
}

// Export singleton instance
export const socketManager = new SocketManager()

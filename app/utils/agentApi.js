// Agent API utilities for connecting to Render-deployed agent
const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL;

export class AgentAPI {
  static async checkStatus() {
    if (!AGENT_URL) return { online: false, error: 'Agent URL not configured' };
    
    try {
      const response = await fetch(`${AGENT_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      return {
        online: data.status === 'healthy',
        data: data
      };
    } catch (error) {
      return {
        online: false,
        error: error.message
      };
    }
  }

  static async getStats() {
    if (!AGENT_URL) return { error: 'Agent URL not configured' };
    
    try {
      const response = await fetch(`${AGENT_URL}/stats`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  }

  static async startMonitoring() {
    if (!AGENT_URL) return { error: 'Agent URL not configured' };
    
    try {
      const response = await fetch(`${AGENT_URL}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  }

  static async stopMonitoring() {
    if (!AGENT_URL) return { error: 'Agent URL not configured' };
    
    try {
      const response = await fetch(`${AGENT_URL}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  }

  static async moderateText(text) {
    if (!AGENT_URL) return { error: 'Agent URL not configured' };
    
    try {
      const response = await fetch(`${AGENT_URL}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  }
}

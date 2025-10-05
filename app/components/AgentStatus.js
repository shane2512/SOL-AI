'use client';

import { useState, useEffect } from 'react';
import { AgentAPI } from '../utils/agentApi';

export default function AgentStatus() {
  const [isOpen, setIsOpen] = useState(false);
  const [agentStatus, setAgentStatus] = useState({ online: false, loading: true });
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check agent status on component mount and periodically
  useEffect(() => {
    checkAgentStatus();
    const interval = setInterval(checkAgentStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkAgentStatus = async () => {
    const status = await AgentAPI.checkStatus();
    setAgentStatus({ ...status, loading: false });
  };

  const loadStats = async () => {
    if (!stats) {
      setIsLoading(true);
      const statsData = await AgentAPI.getStats();
      setStats(statsData);
      setIsLoading(false);
    }
  };

  const handleToggleMonitoring = async (start) => {
    setIsLoading(true);
    const result = start ? await AgentAPI.startMonitoring() : await AgentAPI.stopMonitoring();
    
    if (!result.error) {
      // Refresh status and stats
      await checkAgentStatus();
      const newStats = await AgentAPI.getStats();
      setStats(newStats);
    }
    setIsLoading(false);
  };

  const handleOpenPanel = () => {
    setIsOpen(true);
    loadStats();
  };

  return (
    <>
      {/* AI Agent Status FAB */}
      <button
        onClick={handleOpenPanel}
        className="fab"
        style={{
          position: 'fixed',
          bottom: '80px',
          left: 'var(--spacing-lg)',
          width: '64px',
          height: '64px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--spacing-xs)'
        }}
        title="AI Agent Status"
      >
        <div 
          className={`w-2 h-2 rounded-full ${agentStatus.loading ? 'animate-pulse' : ''}`}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: agentStatus.loading ? 'var(--color-yellow)' : agentStatus.online ? 'var(--color-emerald)' : 'var(--color-red)'
          }}
        ></div>
        <span style={{ fontSize: '16px' }}>🤖</span>
      </button>

      {/* Status Panel Modal */}
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div 
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: agentStatus.online ? 'var(--color-emerald)' : 'var(--color-red)'
                  }}
                ></div>
                <h3 className="text-brand text-lg">
                  {agentStatus.online ? '🟢 AI Moderator Online' : '🔴 AI Moderator Offline'}
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="btn btn-danger text-sm px-3 py-1"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {/* Status Info */}
              <div className="card">
                <h4 className="text-nav font-semibold mb-3">Status</h4>
                {agentStatus.loading ? (
                  <div className="text-mono opacity-70">Checking status...</div>
                ) : agentStatus.online ? (
                  <div className="text-emerald-400">✅ Agent is running and monitoring posts</div>
                ) : (
                  <div className="text-red-400">❌ Agent is offline or unreachable</div>
                )}
                {agentStatus.error && (
                  <div className="text-red-400 text-sm mt-2">Error: {agentStatus.error}</div>
                )}
              </div>

              {/* Statistics */}
              {agentStatus.online && (
                <div className="card">
                  <h4 className="text-nav font-semibold mb-3">Statistics</h4>
                  {isLoading ? (
                    <div className="text-mono opacity-70">Loading stats...</div>
                  ) : stats && !stats.error ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-body">Posts Processed:</span>
                        <span className="text-mono font-semibold">{stats.posts_processed || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-body">Posts Flagged:</span>
                        <span className="text-mono font-semibold text-red-400">{stats.posts_flagged || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-body">Status:</span>
                        <span className={`text-mono font-semibold ${stats.status === 'running' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                          {stats.status || 'Unknown'}
                        </span>
                      </div>
                      {stats.last_check && (
                        <div className="flex justify-between">
                          <span className="text-body">Last Check:</span>
                          <span className="text-mono font-semibold text-xs opacity-70">
                            {new Date(stats.last_check * 1000).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-red-400 text-sm">
                      {stats?.error || 'Failed to load statistics'}
                    </div>
                  )}
                </div>
              )}

              {/* Manual Controls */}
              {agentStatus.online && (
                <div className="card">
                  <h4 className="text-nav font-semibold mb-3">Manual Controls</h4>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleToggleMonitoring(true)}
                      disabled={isLoading}
                      className="btn btn-primary flex-1 text-sm"
                    >
                      {isLoading ? 'Loading...' : 'Start Monitoring'}
                    </button>
                    <button
                      onClick={() => handleToggleMonitoring(false)}
                      disabled={isLoading}
                      className="btn btn-danger flex-1 text-sm"
                    >
                      {isLoading ? 'Loading...' : 'Stop Monitoring'}
                    </button>
                  </div>
                </div>
              )}

              {/* Refresh Button */}
              <button
                onClick={() => {
                  checkAgentStatus();
                  setStats(null);
                  loadStats();
                }}
                className="btn btn-secondary w-full"
              >
                🔄 Refresh Status
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

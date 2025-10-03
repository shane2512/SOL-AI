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
      {/* Floating Button - Bottom Left */}
      <button
        onClick={handleOpenPanel}
        className="fixed bottom-4 left-4 z-50 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
        title="AI Agent Status"
      >
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${agentStatus.loading ? 'bg-yellow-400 animate-pulse' : agentStatus.online ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
      </button>

      {/* Status Panel Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${agentStatus.online ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <h3 className="text-lg font-semibold">
                    {agentStatus.online ? '🟢 AI Moderator Online' : '🔴 AI Moderator Offline'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Status Info */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="font-semibold text-gray-800 mb-2">Status</h4>
                {agentStatus.loading ? (
                  <div className="text-gray-600">Checking status...</div>
                ) : agentStatus.online ? (
                  <div className="text-green-600">✅ Agent is running and monitoring posts</div>
                ) : (
                  <div className="text-red-600">❌ Agent is offline or unreachable</div>
                )}
                {agentStatus.error && (
                  <div className="text-red-500 text-sm mt-1">Error: {agentStatus.error}</div>
                )}
              </div>

              {/* Statistics */}
              {agentStatus.online && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-semibold text-gray-800 mb-2">Statistics</h4>
                  {isLoading ? (
                    <div className="text-gray-600">Loading stats...</div>
                  ) : stats && !stats.error ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Posts Processed:</span>
                        <span className="font-semibold">{stats.posts_processed || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Posts Flagged:</span>
                        <span className="font-semibold text-red-600">{stats.posts_flagged || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className={`font-semibold ${stats.status === 'running' ? 'text-green-600' : 'text-yellow-600'}`}>
                          {stats.status || 'Unknown'}
                        </span>
                      </div>
                      {stats.last_check && (
                        <div className="flex justify-between">
                          <span>Last Check:</span>
                          <span className="font-semibold text-xs">
                            {new Date(stats.last_check * 1000).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-red-500 text-sm">
                      {stats?.error || 'Failed to load statistics'}
                    </div>
                  )}
                </div>
              )}

              {/* Manual Controls */}
              {agentStatus.online && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-semibold text-gray-800 mb-2">Manual Controls</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleToggleMonitoring(true)}
                      disabled={isLoading}
                      className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                    >
                      {isLoading ? 'Loading...' : 'Start Monitoring'}
                    </button>
                    <button
                      onClick={() => handleToggleMonitoring(false)}
                      disabled={isLoading}
                      className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
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
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
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

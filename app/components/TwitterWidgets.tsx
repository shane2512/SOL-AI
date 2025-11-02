import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

interface TwitterWidgetsProps {
  stats: {
    totalPosts: number;
    safePosts: number;
    flaggedPosts: number;
    agentStatus: string;
  };
  contracts?: any;
  account?: string;
}

export default function TwitterWidgets({ stats, contracts, account }: TwitterWidgetsProps) {
  const [tokenBalance, setTokenBalance] = useState("0");
  const [userTier, setUserTier] = useState(0);
  const [loading, setLoading] = useState(false);

  const tierNames = ["Bronze", "Silver", "Gold", "Platinum"];
  const tierEmojis = ["🥉", "🥈", "🥇", "💎"];

  useEffect(() => {
    if (contracts && account) {
      loadUserData();
    }
  }, [contracts, account]);

  const loadUserData = async () => {
    if (!contracts || !account) return;
    
    setLoading(true);
    try {
      // Get token balance
      const balance = await contracts.solToken.balanceOf(account);
      setTokenBalance(ethers.utils.formatEther(balance));

      // Get user tier
      const tier = await contracts.reputationSystem.getUserTier(account);
      setUserTier(tier);
    } catch (error) {
      console.error("Error loading user data:", error);
      // Set defaults on error
      setTokenBalance("0");
      setUserTier(0);
    } finally {
      setLoading(false);
    }
  };

  const safetyRate = stats.totalPosts > 0 
    ? ((stats.safePosts / stats.totalPosts) * 100).toFixed(1)
    : '0';

  return (
    <div className="twitter-widgets">
      {/* User Tier & Balance (if connected) */}
      {account && contracts && (
        <motion.div 
          className="twitter-widget"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="twitter-widget-header">
            <span>👤 Your Account</span>
          </div>
          
          <div className="twitter-widget-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="twitter-widget-title">Tier</div>
                <div className="twitter-widget-subtitle">
                  {tierEmojis[userTier]} {tierNames[userTier]}
                </div>
              </div>
            </div>
          </div>

          <div className="twitter-widget-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="twitter-widget-title">SOL AI Balance</div>
                <div className="twitter-widget-subtitle">
                  {loading ? '...' : `${parseFloat(tokenBalance).toFixed(2)} tokens`}
                </div>
              </div>
              <div style={{ fontSize: '24px' }}>💰</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* AI Moderation Stats */}
      <motion.div 
        className="twitter-widget"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: account ? 0.1 : 0 }}
      >
        <div className="twitter-widget-header">
          <span>🤖 AI Moderation</span>
        </div>
        
        <div className="twitter-widget-item">
          <div className="twitter-widget-title">
            Agent Status
          </div>
          <div className="twitter-widget-subtitle" style={{ 
            color: stats.agentStatus === 'active' ? 'var(--color-success)' : 'var(--color-text-secondary)' 
          }}>
            {stats.agentStatus === 'active' ? '✅ Active' : '⚠️ Inactive'}
          </div>
        </div>

        <div className="twitter-widget-item">
          <div className="twitter-widget-title">
            Safety Rate
          </div>
          <div className="twitter-widget-subtitle">
            {safetyRate}% of posts are safe
          </div>
        </div>

        <div className="twitter-widget-item">
          <div className="twitter-widget-title">
            Total Moderated
          </div>
          <div className="twitter-widget-subtitle">
            {stats.totalPosts} posts analyzed
          </div>
        </div>
      </motion.div>

      {/* Platform Stats */}
      <motion.div 
        className="twitter-widget"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="twitter-widget-header">
          <span>📊 Platform Stats</span>
        </div>
        
        <div className="twitter-widget-item">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="twitter-widget-title">Safe Posts</div>
              <div className="twitter-widget-subtitle">{stats.safePosts} posts</div>
            </div>
            <div style={{ fontSize: '24px' }}>✅</div>
          </div>
        </div>

        <div className="twitter-widget-item">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="twitter-widget-title">Flagged Posts</div>
              <div className="twitter-widget-subtitle">{stats.flaggedPosts} posts</div>
            </div>
            <div style={{ fontSize: '24px' }}>🚩</div>
          </div>
        </div>
      </motion.div>

      {/* Web3 Info */}
      <motion.div 
        className="twitter-widget"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="twitter-widget-header">
          <span>⛓️ Blockchain</span>
        </div>
        
        <div className="twitter-widget-item">
          <div className="twitter-widget-title">Network</div>
          <div className="twitter-widget-subtitle">Somnia Testnet</div>
        </div>

        <div className="twitter-widget-item">
          <div className="twitter-widget-title">Chain ID</div>
          <div className="twitter-widget-subtitle">50312</div>
        </div>

        <div className="twitter-widget-item">
          <div className="twitter-widget-title">
            <span className="twitter-badge-ai">AI Powered</span>
          </div>
          <div className="twitter-widget-subtitle">
            Toxic-BERT + Gemini
          </div>
        </div>
      </motion.div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';

const ReputationDashboard = ({ contracts, account }) => {
  const [reputationData, setReputationData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userSBT, setUserSBT] = useState(null);
  const [rewards, setRewards] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (account && contracts) {
      fetchReputationData();
      fetchLeaderboard();
      fetchUserSBT();
      fetchRewards();
    }
  }, [account, contracts]);

  const fetchReputationData = async () => {
    try {
      const reputation = await contracts.reputationSystem.getUserReputation(account);
      const currentScore = await contracts.reputationSystem.getReputationScore(account);
      const tier = await contracts.reputationSystem.getUserTier(account);
      
      setReputationData({
        score: currentScore.toString(),
        tier: tier.toString(),
        totalPosts: reputation.totalPosts.toString(),
        safePosts: reputation.safePosts.toString(),
        flaggedPosts: reputation.flaggedPosts.toString(),
        lastUpdated: new Date(Number(reputation.lastUpdated) * 1000)
      });
    } catch (error) {
      console.error('Error fetching reputation:', error);
    }
  };

  const fetchLeaderboard = async () => {
    // This would need to be implemented with events or a subgraph
    // For now, showing mock data
    setLeaderboard([
      { address: '0x1234...5678', score: 95, tier: 3, posts: 150 },
      { address: '0x2345...6789', score: 87, tier: 2, posts: 120 },
      { address: '0x3456...7890', score: 76, tier: 2, posts: 98 }
    ]);
  };

  const fetchUserSBT = async () => {
    try {
      const sbtData = await contracts.reputationSBT.getUserSBT(account);
      if (sbtData.tokenId.toString() !== '0') {
        setUserSBT({
          tokenId: sbtData.tokenId.toString(),
          tier: sbtData.tier.toString()
        });
      }
    } catch (error) {
      console.error('Error fetching SBT:', error);
    }
  };

  const fetchRewards = async () => {
    try {
      const rewardInfo = await contracts.incentiveSystem.getRewardInfo(account);
      const balance = await contracts.solToken.balanceOf(account);
      
      // Format from wei to ether (divide by 10^18)
      const formatEther = (wei) => {
        return (Number(wei) / 1e18).toString();
      };
      
      setRewards({
        pendingRewards: formatEther(rewardInfo.pendingRewards),
        totalEarned: formatEther(rewardInfo.totalEarned),
        balance: formatEther(balance),
        dailyRewardsLeft: rewardInfo.dailyRewardsLeft.toString(),
        nextClaimTime: new Date(Number(rewardInfo.nextClaimTime) * 1000)
      });
    } catch (error) {
      console.error('Error fetching rewards:', error);
    }
  };

  const updateReputation = async () => {
    try {
      setLoading(true);
      const tx = await contracts.reputationSystem.updateReputation(account);
      await tx.wait();
      await fetchReputationData();
    } catch (error) {
      console.error('Error updating reputation:', error);
    } finally {
      setLoading(false);
    }
  };

  const mintSBT = async () => {
    try {
      setLoading(true);
      const tx = await contracts.reputationSBT.mintOrUpgradeSBT(account);
      await tx.wait();
      await fetchUserSBT();
    } catch (error) {
      console.error('Error minting SBT:', error);
    } finally {
      setLoading(false);
    }
  };

  const claimRewards = async () => {
    try {
      setLoading(true);
      const tx = await contracts.incentiveSystem.claimPostRewards();
      await tx.wait();
      await fetchRewards();
    } catch (error) {
      console.error('Error claiming rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierName = (tier) => {
    const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
    return tiers[tier] || 'Bronze';
  };

  const getTierColor = (tier) => {
    const colors = ['#CD7F32', '#C0C0C0', '#FFD700', '#E5E4E2'];
    return colors[tier] || '#CD7F32';
  };

  if (loading && !reputationData) {
    return (
      <div className="reputation-dashboard loading">
        <div className="loading-spinner"></div>
        <p>Loading reputation data...</p>
      </div>
    );
  }

  return (
    <div className="reputation-dashboard">
      <div className="dashboard-header">
        <h2>Reputation Dashboard</h2>
        <button onClick={updateReputation} disabled={loading} className="update-btn">
          {loading ? 'Updating...' : 'Update Reputation'}
        </button>
      </div>

      <div className="dashboard-grid">
        {/* User Reputation Card */}
        <div className="reputation-card">
          <div className="card-header">
            <h3>Your Reputation</h3>
            {userSBT && (
              <div className="sbt-badge" style={{ backgroundColor: getTierColor(userSBT.tier) }}>
                SBT #{userSBT.tokenId}
              </div>
            )}
          </div>
          
          {reputationData && (
            <div className="reputation-stats">
              <div className="score-display">
                <div className="score-circle">
                  <span className="score">{reputationData.score}</span>
                  <span className="max-score">/100</span>
                </div>
                <div className="tier-info">
                  <span className="tier-name" style={{ color: getTierColor(reputationData.tier) }}>
                    {getTierName(reputationData.tier)}
                  </span>
                  <span className="tier-level">Tier {reputationData.tier}</span>
                </div>
              </div>
              
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Total Posts</span>
                  <span className="stat-value">{reputationData.totalPosts}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Safe Posts</span>
                  <span className="stat-value safe">{reputationData.safePosts}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Flagged Posts</span>
                  <span className="stat-value flagged">{reputationData.flaggedPosts}</span>
                </div>
              </div>
              
              {!userSBT && (
                <button onClick={mintSBT} className="mint-sbt-btn">
                  Mint Reputation SBT
                </button>
              )}
            </div>
          )}
        </div>

        {/* Rewards Card */}
        <div className="rewards-card">
          <h3>Token Rewards</h3>
          {rewards && (
            <div className="rewards-info">
              <div className="balance-display">
                <span className="balance-label">SOLAI Balance</span>
                <span className="balance-value">{parseFloat(rewards.balance).toFixed(2)}</span>
              </div>
              
              <div className="rewards-stats">
                <div className="reward-item">
                  <span className="reward-label">Pending Rewards</span>
                  <span className="reward-value">{parseFloat(rewards.pendingRewards).toFixed(2)}</span>
                </div>
                <div className="reward-item">
                  <span className="reward-label">Total Earned</span>
                  <span className="reward-value">{parseFloat(rewards.totalEarned).toFixed(2)}</span>
                </div>
                <div className="reward-item">
                  <span className="reward-label">Daily Claims Left</span>
                  <span className="reward-value">{rewards.dailyRewardsLeft}</span>
                </div>
              </div>
              
              <button 
                onClick={claimRewards} 
                disabled={loading || parseFloat(rewards.pendingRewards) === 0}
                className="claim-btn"
              >
                {loading ? 'Claiming...' : `Claim ${parseFloat(rewards.pendingRewards).toFixed(2)} SOLAI`}
              </button>
            </div>
          )}
        </div>

        {/* Leaderboard Card */}
        <div className="leaderboard-card">
          <h3>Reputation Leaderboard</h3>
          <div className="leaderboard-list">
            {leaderboard.map((user, index) => (
              <div key={user.address} className="leaderboard-item">
                <div className="rank">#{index + 1}</div>
                <div className="user-info">
                  <span className="address">{user.address}</span>
                  <span className="tier" style={{ color: getTierColor(user.tier) }}>
                    {getTierName(user.tier)}
                  </span>
                </div>
                <div className="score">{user.score}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .reputation-dashboard {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .dashboard-header h2 {
          background: linear-gradient(135deg, #00ff88, #0099ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-size: 2rem;
          font-weight: 700;
        }

        .update-btn {
          background: linear-gradient(135deg, #00ff88, #0099ff);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .update-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 255, 136, 0.3);
        }

        .update-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
        }

        .reputation-card, .rewards-card, .leaderboard-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 2rem;
          transition: all 0.3s ease;
        }

        .reputation-card:hover, .rewards-card:hover, .leaderboard-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .card-header h3 {
          color: white;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .sbt-badge {
          padding: 0.5rem 1rem;
          border-radius: 20px;
          color: white;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .score-display {
          display: flex;
          align-items: center;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .score-circle {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00ff88, #0099ff);
          color: white;
        }

        .score {
          font-size: 2rem;
          font-weight: 700;
        }

        .max-score {
          font-size: 1rem;
          opacity: 0.8;
        }

        .tier-info {
          display: flex;
          flex-direction: column;
        }

        .tier-name {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .tier-level {
          color: rgba(255, 255, 255, 0.7);
          font-size: 1rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
        }

        .stat-label {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }

        .stat-value {
          color: white;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .stat-value.safe {
          color: #00ff88;
        }

        .stat-value.flagged {
          color: #ff4757;
        }

        .mint-sbt-btn, .claim-btn {
          width: 100%;
          background: linear-gradient(135deg, #8b5cf6, #a855f7);
          color: white;
          border: none;
          padding: 1rem;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .mint-sbt-btn:hover, .claim-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(139, 92, 246, 0.3);
        }

        .claim-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .balance-display {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
        }

        .balance-label {
          color: rgba(255, 255, 255, 0.7);
          font-size: 1rem;
        }

        .balance-value {
          color: #00ff88;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .rewards-stats {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .reward-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .reward-label {
          color: rgba(255, 255, 255, 0.7);
        }

        .reward-value {
          color: white;
          font-weight: 600;
        }

        .leaderboard-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .leaderboard-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .leaderboard-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .rank {
          font-size: 1.2rem;
          font-weight: 700;
          color: #00ff88;
          min-width: 40px;
        }

        .user-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .address {
          color: white;
          font-weight: 600;
        }

        .tier {
          font-size: 0.9rem;
          font-weight: 600;
        }

        .score {
          font-size: 1.2rem;
          font-weight: 700;
          color: white;
        }

        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255, 255, 255, 0.1);
          border-left: 4px solid #00ff88;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
          
          .score-display {
            flex-direction: column;
            text-align: center;
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default ReputationDashboard;

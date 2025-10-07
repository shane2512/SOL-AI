import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const GovernancePanel = ({ contracts, account }) => {
  const [appeals, setAppeals] = useState([]);
  const [userAppeals, setUserAppeals] = useState([]);
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [appealForm, setAppealForm] = useState({ postId: '', reason: '' });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    if (account && contracts) {
      fetchAppeals();
      fetchUserAppeals();
    }
  }, [account, contracts]);

  const fetchAppeals = async () => {
    try {
      // In a real implementation, you'd fetch from events or a subgraph
      // For now, showing mock data
      setAppeals([
        {
          id: 1,
          postId: 15,
          appellant: '0x1234...5678',
          reason: 'This post was incorrectly flagged as toxic. It contains educational content about blockchain technology.',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          votingEnds: new Date(Date.now() + 24 * 60 * 60 * 1000),
          resolved: false,
          yesVotes: 45,
          noVotes: 23,
          totalVotes: 68,
          canVote: true
        },
        {
          id: 2,
          postId: 22,
          appellant: '0x2345...6789',
          reason: 'AI misunderstood the context. This was a quote from a historical document for educational purposes.',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          votingEnds: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          resolved: true,
          upheld: true,
          yesVotes: 78,
          noVotes: 34,
          totalVotes: 112
        }
      ]);
    } catch (error) {
      console.error('Error fetching appeals:', error);
    }
  };

  const fetchUserAppeals = async () => {
    try {
      // Filter appeals by current user
      const userAppealsData = appeals.filter(appeal => 
        appeal.appellant.toLowerCase() === account?.toLowerCase()
      );
      setUserAppeals(userAppealsData);
    } catch (error) {
      console.error('Error fetching user appeals:', error);
    }
  };

  const createAppeal = async () => {
    if (!appealForm.postId || !appealForm.reason) return;

    try {
      setLoading(true);
      const tx = await contracts.governanceSystem.createAppeal(
        appealForm.postId,
        appealForm.reason
      );
      await tx.wait();
      
      setAppealForm({ postId: '', reason: '' });
      await fetchAppeals();
      await fetchUserAppeals();
    } catch (error) {
      console.error('Error creating appeal:', error);
    } finally {
      setLoading(false);
    }
  };

  const vote = async (appealId, voteChoice) => {
    try {
      setLoading(true);
      const tx = await contracts.governanceSystem.vote(appealId, voteChoice);
      await tx.wait();
      await fetchAppeals();
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveAppeal = async (appealId) => {
    try {
      setLoading(true);
      const tx = await contracts.governanceSystem.resolveAppeal(appealId);
      await tx.wait();
      await fetchAppeals();
    } catch (error) {
      console.error('Error resolving appeal:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (endTime) => {
    const now = new Date();
    const diff = endTime - now;
    
    if (diff <= 0) return 'Voting ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  const getVotePercentage = (votes, total) => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  const filteredAppeals = appeals.filter(appeal => {
    if (activeTab === 'active') return !appeal.resolved;
    if (activeTab === 'resolved') return appeal.resolved;
    return true;
  });

  return (
    <div className="governance-panel">
      <div className="panel-header">
        <h2>Community Governance</h2>
        <p>Vote on content appeals and help shape the platform</p>
      </div>

      <div className="governance-tabs">
        <button 
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active Appeals ({appeals.filter(a => !a.resolved).length})
        </button>
        <button 
          className={`tab ${activeTab === 'resolved' ? 'active' : ''}`}
          onClick={() => setActiveTab('resolved')}
        >
          Resolved Appeals ({appeals.filter(a => a.resolved).length})
        </button>
        <button 
          className={`tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          Create Appeal
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'create' && (
          <div className="create-appeal-form">
            <h3>Create New Appeal</h3>
            <div className="form-group">
              <label>Post ID</label>
              <input
                type="number"
                value={appealForm.postId}
                onChange={(e) => setAppealForm({...appealForm, postId: e.target.value})}
                placeholder="Enter the ID of the flagged post"
              />
            </div>
            <div className="form-group">
              <label>Appeal Reason</label>
              <textarea
                value={appealForm.reason}
                onChange={(e) => setAppealForm({...appealForm, reason: e.target.value})}
                placeholder="Explain why you believe the post was incorrectly flagged..."
                rows={4}
              />
            </div>
            <button 
              onClick={createAppeal} 
              disabled={loading || !appealForm.postId || !appealForm.reason}
              className="create-appeal-btn"
            >
              {loading ? 'Creating Appeal...' : 'Create Appeal'}
            </button>
          </div>
        )}

        {(activeTab === 'active' || activeTab === 'resolved') && (
          <div className="appeals-list">
            {filteredAppeals.length === 0 ? (
              <div className="no-appeals">
                <p>No {activeTab} appeals found</p>
              </div>
            ) : (
              filteredAppeals.map(appeal => (
                <div key={appeal.id} className="appeal-card">
                  <div className="appeal-header">
                    <div className="appeal-info">
                      <h4>Appeal #{appeal.id} - Post #{appeal.postId}</h4>
                      <p className="appellant">by {appeal.appellant}</p>
                    </div>
                    <div className="appeal-status">
                      {appeal.resolved ? (
                        <span className={`status-badge ${appeal.upheld ? 'upheld' : 'rejected'}`}>
                          {appeal.upheld ? 'Upheld' : 'Rejected'}
                        </span>
                      ) : (
                        <span className="status-badge active">Active</span>
                      )}
                    </div>
                  </div>

                  <div className="appeal-reason">
                    <p>{appeal.reason}</p>
                  </div>

                  <div className="voting-section">
                    <div className="vote-stats">
                      <div className="vote-bar">
                        <div className="vote-progress">
                          <div 
                            className="yes-votes" 
                            style={{ width: `${getVotePercentage(appeal.yesVotes, appeal.totalVotes)}%` }}
                          ></div>
                          <div 
                            className="no-votes" 
                            style={{ width: `${getVotePercentage(appeal.noVotes, appeal.totalVotes)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="vote-numbers">
                        <span className="yes-count">Yes: {appeal.yesVotes}</span>
                        <span className="no-count">No: {appeal.noVotes}</span>
                        <span className="total-count">Total: {appeal.totalVotes}</span>
                      </div>
                    </div>

                    {!appeal.resolved && (
                      <div className="voting-actions">
                        <div className="time-remaining">
                          {getTimeRemaining(appeal.votingEnds)}
                        </div>
                        {appeal.canVote && (
                          <div className="vote-buttons">
                            <button 
                              onClick={() => vote(appeal.id, true)}
                              disabled={loading}
                              className="vote-btn yes"
                            >
                              Vote Yes
                            </button>
                            <button 
                              onClick={() => vote(appeal.id, false)}
                              disabled={loading}
                              className="vote-btn no"
                            >
                              Vote No
                            </button>
                          </div>
                        )}
                        {new Date() > appeal.votingEnds && (
                          <button 
                            onClick={() => resolveAppeal(appeal.id)}
                            disabled={loading}
                            className="resolve-btn"
                          >
                            Resolve Appeal
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="appeal-meta">
                    <span>Created: {appeal.createdAt.toLocaleDateString()}</span>
                    {appeal.resolved && (
                      <span>Resolved: {appeal.votingEnds.toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .governance-panel {
          padding: 2rem;
          max-width: 1000px;
          margin: 0 auto;
        }

        .panel-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .panel-header h2 {
          background: linear-gradient(135deg, #8b5cf6, #a855f7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .panel-header p {
          color: rgba(255, 255, 255, 0.7);
          font-size: 1.1rem;
        }

        .governance-tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .tab {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          padding: 1rem 1.5rem;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          border-bottom: 2px solid transparent;
          transition: all 0.3s ease;
        }

        .tab:hover {
          color: white;
        }

        .tab.active {
          color: #8b5cf6;
          border-bottom-color: #8b5cf6;
        }

        .create-appeal-form {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 2rem;
        }

        .create-appeal-form h3 {
          color: white;
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          color: white;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 1rem;
          color: white;
          font-size: 1rem;
          transition: all 0.3s ease;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .form-group input::placeholder,
        .form-group textarea::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .create-appeal-btn {
          background: linear-gradient(135deg, #8b5cf6, #a855f7);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
        }

        .create-appeal-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(139, 92, 246, 0.3);
        }

        .create-appeal-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .appeals-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .no-appeals {
          text-align: center;
          padding: 3rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .appeal-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 2rem;
          transition: all 0.3s ease;
        }

        .appeal-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .appeal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .appeal-info h4 {
          color: white;
          font-size: 1.2rem;
          margin-bottom: 0.25rem;
        }

        .appellant {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
        }

        .status-badge {
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .status-badge.active {
          background: linear-gradient(135deg, #00ff88, #0099ff);
          color: white;
        }

        .status-badge.upheld {
          background: linear-gradient(135deg, #00ff88, #00cc66);
          color: white;
        }

        .status-badge.rejected {
          background: linear-gradient(135deg, #ff4757, #ff3742);
          color: white;
        }

        .appeal-reason {
          margin-bottom: 1.5rem;
        }

        .appeal-reason p {
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
        }

        .voting-section {
          margin-bottom: 1rem;
        }

        .vote-stats {
          margin-bottom: 1rem;
        }

        .vote-bar {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .vote-progress {
          display: flex;
          height: 100%;
        }

        .yes-votes {
          background: linear-gradient(135deg, #00ff88, #00cc66);
        }

        .no-votes {
          background: linear-gradient(135deg, #ff4757, #ff3742);
        }

        .vote-numbers {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
        }

        .yes-count {
          color: #00ff88;
        }

        .no-count {
          color: #ff4757;
        }

        .total-count {
          color: rgba(255, 255, 255, 0.7);
        }

        .voting-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .time-remaining {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
        }

        .vote-buttons {
          display: flex;
          gap: 1rem;
        }

        .vote-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .vote-btn.yes {
          background: linear-gradient(135deg, #00ff88, #00cc66);
          color: white;
        }

        .vote-btn.no {
          background: linear-gradient(135deg, #ff4757, #ff3742);
          color: white;
        }

        .vote-btn:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .vote-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .resolve-btn {
          background: linear-gradient(135deg, #8b5cf6, #a855f7);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .resolve-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(139, 92, 246, 0.3);
        }

        .appeal-meta {
          display: flex;
          justify-content: space-between;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.9rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 1rem;
        }

        @media (max-width: 768px) {
          .governance-tabs {
            flex-direction: column;
          }
          
          .appeal-header {
            flex-direction: column;
            gap: 1rem;
          }
          
          .voting-actions {
            flex-direction: column;
            align-items: stretch;
          }
          
          .vote-buttons {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default GovernancePanel;

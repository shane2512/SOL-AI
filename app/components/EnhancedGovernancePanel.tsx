import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';

interface EnhancedGovernancePanelProps {
  contracts: any;
  account: string;
  posts: any[];
}

export default function EnhancedGovernancePanel({ contracts, account, posts }: EnhancedGovernancePanelProps) {
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [appealReason, setAppealReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAppeals();
  }, [contracts, account]);

  const loadAppeals = async () => {
    if (!contracts) return;

    try {
      setLoading(true);
      // Load active appeals from governance contract
      // This is a placeholder - implement based on your contract
      setAppeals([]);
    } catch (error) {
      console.error("Error loading appeals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppeal = async () => {
    if (!selectedPost || !appealReason.trim()) return;

    setSubmitting(true);
    try {
      const tx = await contracts.governanceSystem.createAppeal(
        selectedPost.id,
        appealReason
      );
      await tx.wait();
      
      alert("Appeal created successfully!");
      setSelectedPost(null);
      setAppealReason("");
      await loadAppeals();
    } catch (error: any) {
      console.error("Error creating appeal:", error);
      alert(error.message || "Failed to create appeal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (appealId: number, support: boolean) => {
    try {
      const tx = await contracts.governanceSystem.vote(appealId, support);
      await tx.wait();
      alert("Vote submitted!");
      await loadAppeals();
    } catch (error: any) {
      console.error("Error voting:", error);
      alert(error.message || "Failed to vote");
    }
  };

  const flaggedPosts = posts.filter(p => p.flagged);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="twitter-spinner" />
        <p style={{ marginTop: '16px', color: 'var(--color-text-secondary)' }}>Loading governance data...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>⚖️ Community Governance</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Appeal flagged posts and participate in community voting
        </p>
      </div>

      {/* Flagged Posts - Can Appeal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
        }}
      >
        <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>🚩 Flagged Posts</h3>
        
        {flaggedPosts.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '20px' }}>
            No flagged posts to appeal
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {flaggedPosts.map((post) => (
              <div
                key={post.id.toString()}
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-primary)',
                }}
              >
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                    Post #{post.id.toString()}
                  </div>
                  <div style={{ fontSize: '15px', marginBottom: '8px' }}>
                    {post.content}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    By: {post.author.slice(0, 6)}...{post.author.slice(-4)}
                  </div>
                </div>
                
                {post.author.toLowerCase() === account.toLowerCase() && (
                  <button
                    onClick={() => setSelectedPost(post)}
                    style={{
                      padding: '8px 16px',
                      background: 'var(--btn-primary-bg)',
                      border: 'none',
                      borderRadius: 'var(--radius-full)',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Create Appeal
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Create Appeal Modal */}
      {selectedPost && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedPost(null)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-primary)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              border: '1px solid var(--border-primary)',
            }}
          >
            <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>Create Appeal</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                Post Content:
              </div>
              <div style={{
                background: 'var(--bg-secondary)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '15px',
              }}>
                {selectedPost.content}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px', display: 'block' }}>
                Appeal Reason:
              </label>
              <textarea
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                placeholder="Explain why this post should not be flagged..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: 'var(--color-text-primary)',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedPost(null)}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-full)',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAppeal}
                disabled={!appealReason.trim() || submitting}
                style={{
                  padding: '10px 20px',
                  background: 'var(--btn-primary-bg)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  color: 'white',
                  fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting || !appealReason.trim() ? 0.5 : 1,
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Appeal'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Active Appeals */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          padding: '24px',
        }}
      >
        <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>📋 Active Appeals</h3>
        
        {appeals.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '20px' }}>
            No active appeals at the moment
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {appeals.map((appeal, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-primary)',
                }}
              >
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>
                    Appeal #{appeal.id}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                    {appeal.reason}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleVote(appeal.id, true)}
                    style={{
                      padding: '8px 16px',
                      background: 'var(--color-success)',
                      border: 'none',
                      borderRadius: 'var(--radius-full)',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    ✅ Support
                  </button>
                  <button
                    onClick={() => handleVote(appeal.id, false)}
                    style={{
                      padding: '8px 16px',
                      background: 'var(--color-danger)',
                      border: 'none',
                      borderRadius: 'var(--radius-full)',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          background: 'rgba(29, 155, 240, 0.1)',
          border: '1px solid var(--color-brand)',
          borderRadius: '12px',
          padding: '16px',
          marginTop: '20px',
        }}
      >
        <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          <strong style={{ color: 'var(--color-brand)' }}>ℹ️ How it works:</strong>
          <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
            <li>Only post authors can create appeals</li>
            <li>Community members vote on appeals</li>
            <li>Vote weight is based on your reputation</li>
            <li>Appeals last 3 days</li>
            <li>20% quorum required to pass</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface EnhancedReputationDashboardProps {
  contracts: any;
  account: string;
}

export default function EnhancedReputationDashboard({ contracts, account }: EnhancedReputationDashboardProps) {
  const [reputationScore, setReputationScore] = useState(0);
  const [tier, setTier] = useState(0);
  const [tokenBalance, setTokenBalance] = useState("0");
  const [hasSBT, setHasSBT] = useState(false);
  const [sbtTokenId, setSbtTokenId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const tierNames = ["Bronze", "Silver", "Gold", "Platinum"];
  const tierColors = ["#CD7F32", "#C0C0C0", "#FFD700", "#E5E4E2"];
  const tierRanges = ["0-24", "25-49", "50-74", "75-100"];

  useEffect(() => {
    loadReputationData();
  }, [contracts, account]);

  // Reload data when component becomes visible or every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (contracts && account) {
        loadReputationData();
      }
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [contracts, account]);

  const loadReputationData = async () => {
    if (!contracts || !account) return;

    try {
      setLoading(true);

      // Get reputation score (correct method name)
      const score = await contracts.reputationSystem.getReputationScore(account);
      setReputationScore(score.toNumber());

      // Get tier
      const userTier = await contracts.reputationSystem.getUserTier(account);
      setTier(userTier);

      // Get token balance
      const balance = await contracts.solToken.balanceOf(account);
      setTokenBalance(ethers.utils.formatEther(balance));

      // Check if has SBT - check both balanceOf and userTokens mapping
      try {
        const sbtBalance = await contracts.reputationSBT.balanceOf(account);
        const userToken = await contracts.reputationSBT.userTokens(account);
        const tokenId = userToken.toNumber();
        setSbtTokenId(tokenId);
        setHasSBT(sbtBalance.toNumber() > 0 || tokenId > 0);
        console.log('SBT Check:', { balance: sbtBalance.toNumber(), tokenId: tokenId, hasSBT: tokenId > 0 });
      } catch (err) {
        console.error('Error checking SBT:', err);
        setHasSBT(false);
        setSbtTokenId(0);
      }

    } catch (error) {
      console.error("Error loading reputation data:", error);
      // Set defaults on error
      setReputationScore(0);
      setTier(0);
      setTokenBalance("0");
      setHasSBT(false);
    } finally {
      setLoading(false);
    }
  };

  const getNextTierProgress = () => {
    // Match smart contract thresholds: 0, 25, 50, 75
    const tierThresholds = [0, 25, 50, 75];
    if (tier >= 3) return 100; // Max tier (Platinum)
    
    const currentMin = tierThresholds[tier];
    const nextMin = tierThresholds[tier + 1];
    const progress = ((reputationScore - currentMin) / (nextMin - currentMin)) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  const handleMintSBT = async () => {
    if (!contracts || !account) return;
    
    if (reputationScore === 0) {
      toast.error("You need reputation > 0 to mint an SBT. Create some posts first!");
      return;
    }
    
    setMinting(true);
    try {
      toast.loading("Minting your tier badge...", { id: 'mint-sbt' });
      const tx = await contracts.reputationSBT.mintOrUpgradeSBT(account);
      await tx.wait();
      toast.success(`${tierNames[tier]} badge minted successfully!`, { id: 'mint-sbt' });
      await loadReputationData();
    } catch (error: any) {
      console.error("Error minting SBT:", error);
      toast.error(error.message || "Failed to mint badge", { id: 'mint-sbt' });
    } finally {
      setMinting(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!contracts || !account) return;
    
    setClaiming(true);
    try {
      toast.loading("Claiming rewards...", { id: 'claim-rewards' });
      const tx = await contracts.incentiveSystem.claimPostRewards();
      await tx.wait();
      toast.success("Rewards claimed successfully!", { id: 'claim-rewards' });
      await loadReputationData();
    } catch (error: any) {
      console.error("Error claiming rewards:", error);
      toast.error(error.message || "Failed to claim rewards", { id: 'claim-rewards' });
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="twitter-spinner" />
        <p style={{ marginTop: '16px', color: 'var(--color-text-secondary)' }}>Loading reputation data...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Refresh Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button
          onClick={() => loadReputationData()}
          disabled={loading}
          style={{
            padding: '8px 16px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-full)',
            color: 'var(--color-text-primary)',
            fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '16px' }}>🔄</span>
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Current Tier Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '20px',
          textAlign: 'center',
          border: `2px solid ${tierColors[tier]}`,
        }}
      >
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>
          {tier === 0 && '🥉'}
          {tier === 1 && '🥈'}
          {tier === 2 && '🥇'}
          {tier === 3 && '💎'}
        </div>
        <h2 style={{ fontSize: '32px', color: tierColors[tier], marginBottom: '8px' }}>
          {tierNames[tier]} Tier
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
          {tierRanges[tier]} points
        </p>
        <p style={{ fontSize: '16px', color: 'var(--color-text-primary)' }}>
          Your Score: {reputationScore}/100
        </p>
        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {hasSBT ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
              <span style={{
                background: tierColors[tier],
                color: '#000',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '700'
              }}>
                Badge Owned
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                Token ID: #{sbtTokenId}
              </span>
            </div>
          ) : (
            <button
              onClick={handleMintSBT}
              disabled={minting}
              style={{
                padding: '10px 20px',
                background: tierColors[tier],
                border: 'none',
                borderRadius: '20px',
                color: '#000',
                fontSize: '14px',
                fontWeight: '700',
                cursor: minting ? 'not-allowed' : 'pointer',
                opacity: minting ? 0.6 : 1,
              }}
            >
              {minting ? 'Minting...' : `Mint ${tierNames[tier]} Badge`}
            </button>
          )}
        </div>
      </motion.div>

      {/* Progress to Next Tier */}
      {tier < 3 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '20px',
          }}
        >
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>
            Progress to {tierNames[tier + 1]} Tier
          </h3>
          <div style={{
            background: 'var(--bg-tertiary)',
            borderRadius: '8px',
            height: '24px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${getNextTierProgress()}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{
                height: '100%',
                background: `linear-gradient(90deg, ${tierColors[tier]}, ${tierColors[tier + 1]})`,
                borderRadius: '8px',
              }}
            />
          </div>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
            {getNextTierProgress().toFixed(0)}% complete
          </p>
        </motion.div>
      )}

      {/* SOL AI Token Balance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
        }}
      >
        <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>💰 SOL AI Tokens</h3>
        <div style={{ fontSize: '48px', fontWeight: '700', color: 'var(--color-brand)', marginBottom: '8px' }}>
          {parseFloat(tokenBalance).toFixed(2)}
        </div>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
          Earned from creating safe content
        </p>
        <button
          onClick={handleClaimRewards}
          disabled={claiming}
          style={{
            width: '100%',
            padding: '12px',
            background: 'var(--color-brand)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            color: 'white',
            fontSize: '15px',
            fontWeight: '700',
            cursor: claiming ? 'not-allowed' : 'pointer',
            opacity: claiming ? 0.6 : 1,
          }}
        >
          {claiming ? 'Claiming...' : '💰 Claim Rewards'}
        </button>
      </motion.div>

      {/* Tier Benefits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          padding: '24px',
        }}
      >
        <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>🎁 Your Tier Benefits</h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>✅</span>
            <div>
              <div style={{ fontWeight: '600' }}>Reward Multiplier</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                {tier === 0 && '1x base rewards'}
                {tier === 1 && '1.5x base rewards'}
                {tier === 2 && '2x base rewards'}
                {tier === 3 && '2.5x base rewards'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🏆</span>
            <div>
              <div style={{ fontWeight: '600' }}>Tier Badge NFT</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                {hasSBT ? 'Owned ✅' : 'Create posts to earn'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>⚖️</span>
            <div>
              <div style={{ fontWeight: '600' }}>Governance Power</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                Vote weight: {reputationScore} points
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* All Tiers Reference */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          padding: '24px',
          marginTop: '20px',
        }}
      >
        <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>📊 All Tiers</h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          {tierNames.map((name, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                background: tier === idx ? 'var(--bg-tertiary)' : 'transparent',
                borderRadius: '8px',
                border: tier === idx ? `2px solid ${tierColors[idx]}` : '2px solid transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>
                  {idx === 0 && '🥉'}
                  {idx === 1 && '🥈'}
                  {idx === 2 && '🥇'}
                  {idx === 3 && '💎'}
                </span>
                <div>
                  <div style={{ fontWeight: '600', color: tierColors[idx] }}>{name}</div>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                    {tierRanges[idx]} points
                  </div>
                </div>
              </div>
              {tier === idx && (
                <span style={{ color: 'var(--color-success)', fontWeight: '700' }}>Current</span>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

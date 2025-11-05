"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import toast, { Toaster } from "react-hot-toast";
import SocialAbi from "../contracts/abis/SocialPosts.json";
import ModeratorAbi from "../contracts/abis/Moderator.json";
import ReputationAbi from "../contracts/abis/ReputationSystem.json";
import ReputationSBTAbi from "../contracts/abis/ReputationSBT.json";
import SOLTokenAbi from "../contracts/abis/SOLToken.json";
import IncentiveAbi from "../contracts/abis/IncentiveSystem.json";
import GovernanceAbi from "../contracts/abis/GovernanceSystem.json";
import TwitterSidebar from "../components/TwitterSidebar";
import TwitterPostCard from "../components/TwitterPostCard";
import TwitterComposeBox from "../components/TwitterComposeBox";
import TwitterWidgets from "../components/TwitterWidgets";
import TwitterModal from "../components/TwitterModal";
import { TwitterLoadingSpinner, TwitterPostSkeleton, TwitterEmptyState } from "../components/TwitterLoading";
import EnhancedReputationDashboard from "../components/EnhancedReputationDashboard";
import EnhancedGovernancePanel from "../components/EnhancedGovernancePanel";
import "./globals-twitter.css";

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

const SOCIAL_ADDR = process.env.NEXT_PUBLIC_SOCIAL_POSTS_ADDRESS as string;
const MODERATOR_ADDR = process.env.NEXT_PUBLIC_MODERATOR_ADDRESS as string;
const REPUTATION_ADDR = process.env.NEXT_PUBLIC_REPUTATION_SYSTEM_ADDRESS as string;
const REPUTATION_SBT_ADDR = process.env.NEXT_PUBLIC_REPUTATION_SBT_ADDRESS as string;
const SOL_TOKEN_ADDR = process.env.NEXT_PUBLIC_SOL_TOKEN_ADDRESS as string;
const INCENTIVE_ADDR = process.env.NEXT_PUBLIC_INCENTIVE_SYSTEM_ADDRESS as string;
const GOVERNANCE_ADDR = process.env.NEXT_PUBLIC_GOVERNANCE_SYSTEM_ADDRESS as string;
const SOMNIA_RPC = process.env.NEXT_PUBLIC_SOMNIA_RPC_URL as string;
const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID as string;

export default function Home() {
  // State
  const [account, setAccount] = useState<string>("");
  const [posts, setPosts] = useState<Array<{id: bigint; author: string; content: string; flagged: boolean; timestamp: number}>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activePage, setActivePage] = useState<string>("home");
  const [showComposeModal, setShowComposeModal] = useState<boolean>(false);
  const [usernameCache, setUsernameCache] = useState<{[key: string]: string}>({});
  
  // Contracts
  const [provider, setProvider] = useState<any>(null);
  const [signer, setSigner] = useState<any>(null);
  const [socialContract, setSocialContract] = useState<any>(null);
  const [contracts, setContracts] = useState<any>(null);

  // Initialize Web3
  useEffect(() => {
    initWeb3();
    
    // Cleanup event listeners on unmount
    return () => {
      if (typeof window.ethereum !== 'undefined') {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  const initWeb3 = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(web3Provider);

        // Setup contract for reading (using RPC provider, not wallet)
        const rpcProvider = new ethers.providers.JsonRpcProvider(SOMNIA_RPC);
        const abi = Array.isArray(SocialAbi) ? SocialAbi : (SocialAbi as any).abi;
        const contract = new ethers.Contract(SOCIAL_ADDR, abi, rpcProvider);
        setSocialContract(contract);

        // Load posts
        await loadPosts(contract);

        // Listen for account changes
        window.ethereum.on('accountsChanged', async (accounts: string[]) => {
          if (accounts.length === 0) {
            // User disconnected wallet
            setAccount("");
            setSigner(null);
            setContracts(null);
            toast("Wallet disconnected");
          } else {
            // User switched accounts
            setAccount(accounts[0]);
            const web3Signer = web3Provider.getSigner();
            setSigner(web3Signer);
            await initializeContracts(web3Signer);
            toast("Account switched");
          }
        });

        // Listen for chain changes
        window.ethereum.on('chainChanged', () => {
          window.location.reload();
        });
      }
    } catch (error) {
      console.error("Error initializing Web3:", error);
      toast.error("Failed to initialize Web3");
    } finally {
      setIsLoading(false);
    }
  };

  const initializeContracts = async (web3Signer: any) => {
    try {
      // Extract ABIs
      const socialAbi = Array.isArray(SocialAbi) ? SocialAbi : (SocialAbi as any).abi;
      const moderatorAbi = Array.isArray(ModeratorAbi) ? ModeratorAbi : (ModeratorAbi as any).abi;
      const reputationAbi = Array.isArray(ReputationAbi) ? ReputationAbi : (ReputationAbi as any).abi;
      const reputationSBTAbi = Array.isArray(ReputationSBTAbi) ? ReputationSBTAbi : (ReputationSBTAbi as any).abi;
      const solTokenAbi = Array.isArray(SOLTokenAbi) ? SOLTokenAbi : (SOLTokenAbi as any).abi;
      const incentiveAbi = Array.isArray(IncentiveAbi) ? IncentiveAbi : (IncentiveAbi as any).abi;
      const governanceAbi = Array.isArray(GovernanceAbi) ? GovernanceAbi : (GovernanceAbi as any).abi;

      // Initialize all contracts
      const allContracts = {
        socialPosts: new ethers.Contract(SOCIAL_ADDR, socialAbi, web3Signer),
        moderator: new ethers.Contract(MODERATOR_ADDR, moderatorAbi, web3Signer),
        reputationSystem: new ethers.Contract(REPUTATION_ADDR, reputationAbi, web3Signer),
        reputationSBT: new ethers.Contract(REPUTATION_SBT_ADDR, reputationSBTAbi, web3Signer),
        solToken: new ethers.Contract(SOL_TOKEN_ADDR, solTokenAbi, web3Signer),
        incentiveSystem: new ethers.Contract(INCENTIVE_ADDR, incentiveAbi, web3Signer),
        governanceSystem: new ethers.Contract(GOVERNANCE_ADDR, governanceAbi, web3Signer)
      };

      setContracts(allContracts);
      console.log("✅ All contracts initialized");
    } catch (error) {
      console.error("Error initializing contracts:", error);
    }
  };

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        toast.error("Please install MetaMask!");
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      // Check if on correct network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      // Convert decimal chain ID to hex
      const somniaChainId = '0x' + parseInt(CHAIN_ID).toString(16); // Convert from env
      
      console.log('Current chain ID:', chainId);
      console.log('Expected chain ID:', somniaChainId, `(${CHAIN_ID})`);
      
      if (chainId !== somniaChainId) {
        try {
          // Try to switch to Somnia network
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: somniaChainId }],
          });
        } catch (switchError: any) {
          // Network not added, add it
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: somniaChainId,
                  chainName: 'Somnia Testnet',
                  nativeCurrency: {
                    name: 'Somnia Testnet Token',
                    symbol: 'STT',
                    decimals: 18
                  },
                  rpcUrls: [SOMNIA_RPC],
                  blockExplorerUrls: null
                }],
              });
            } catch (addError) {
              toast.error("Failed to add Somnia network");
              return;
            }
          } else {
            toast.error("Please switch to Somnia network");
            return;
          }
        }
      }
      
      setAccount(accounts[0]);
      const web3Signer = provider.getSigner();
      setSigner(web3Signer);
      
      // Initialize all contracts with signer
      await initializeContracts(web3Signer);
      
      toast.success("Wallet connected!");
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      toast.error(error.message || "Failed to connect wallet");
    }
  };

  const loadPosts = async (contract: any) => {
    try {
      const totalPosts = await contract.totalPosts();
      const loadedPosts = [];

      for (let i = totalPosts.toNumber(); i >= 1; i--) {
        try {
          const post = await contract.getPost(i);
          loadedPosts.push({
            id: post[0],
            author: post[1],
            content: post[2],
            flagged: post[3],
            timestamp: post[4].toNumber()
          });
        } catch (err) {
          console.error(`Error loading post ${i}:`, err);
        }
      }

      setPosts(loadedPosts);
      
      // Load usernames
      const uniqueAuthors = [...new Set(loadedPosts.map(p => p.author))];
      for (const author of uniqueAuthors) {
        fetchUsername(author, contract);
      }
    } catch (error) {
      console.error("Error loading posts:", error);
    }
  };

  const fetchUsername = async (address: string, contract: any) => {
    try {
      const username = await contract.getUsername(address);
      if (username && username.trim() !== '') {
        setUsernameCache(prev => ({
          ...prev,
          [address.toLowerCase()]: username
        }));
      }
    } catch (error) {
      console.error(`Error fetching username for ${address}:`, error);
    }
  };

  const getDisplayName = (address: string) => {
    if (!address) return 'Unknown';
    if (usernameCache[address.toLowerCase()]) {
      return usernameCache[address.toLowerCase()];
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleCreatePost = async (content: string) => {
    if (!account) {
      toast.error("Please connect your wallet first!");
      return;
    }

    if (!signer) {
      toast.error("Signer not available");
      return;
    }

    setIsSubmitting(true);
    try {
      const abi = Array.isArray(SocialAbi) ? SocialAbi : (SocialAbi as any).abi;
      const contractWithSigner = new ethers.Contract(SOCIAL_ADDR, abi, signer);
      
      // Step 1: Create post
      const tx = await contractWithSigner.createPost(content);
      toast.loading("Creating post...", { id: 'create-post' });
      
      const receipt = await tx.wait();
      toast.success("Post created!", { id: 'create-post' });
      
      // Step 2: Update reputation
      if (contracts?.reputationSystem) {
        try {
          toast.loading("Updating reputation...", { id: 'reputation' });
          const repTx = await contracts.reputationSystem.updateReputation(account);
          await repTx.wait();
          toast.success("Reputation updated!", { id: 'reputation' });
          
          // Step 3: Check tier and mint/upgrade SBT if needed
          try {
            const tier = await contracts.reputationSystem.getUserTier(account);
            const hasSBT = await contracts.reputationSBT.balanceOf(account);
            
            if (hasSBT.toNumber() === 0) {
              // Mint first SBT
              toast.loading("Minting your tier badge...", { id: 'sbt' });
              const sbtTx = await contracts.reputationSBT.mint(account, tier);
              await sbtTx.wait();
              toast.success(`${['Bronze', 'Silver', 'Gold', 'Platinum'][tier]} badge minted!`, { id: 'sbt' });
            }
          } catch (sbtError) {
            console.error("SBT minting error:", sbtError);
          }
          
          // Step 4: Trigger incentive distribution for safe posts
          try {
            toast.loading("Processing rewards...", { id: 'rewards' });
            const incentiveTx = await contracts.incentiveSystem.distributeReward(account);
            await incentiveTx.wait();
            
            // Get reward amount
            const balance = await contracts.solToken.balanceOf(account);
            const formatted = ethers.utils.formatEther(balance);
            toast.success(`Rewards earned! Balance: ${parseFloat(formatted).toFixed(2)} SOL AI`, { id: 'rewards' });
          } catch (rewardError) {
            console.error("Reward distribution error:", rewardError);
            toast.dismiss('rewards');
          }
          
        } catch (repError) {
          console.error("Reputation update error:", repError);
          toast.error("Failed to update reputation", { id: 'reputation' });
        }
      }
      
      // Reload posts after a short delay to allow blockchain to index
      toast.loading("Loading new post...", { id: 'reload' });
      setTimeout(async () => {
        await loadPosts(socialContract);
        toast.success("Feed updated!", { id: 'reload' });
      }, 2000); // Wait 2 seconds for blockchain to index
      
      setShowComposeModal(false);
      
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast.error(error.message || "Failed to create post", { id: 'create-post' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate stats
  const stats = {
    totalPosts: posts.length,
    safePosts: posts.filter(p => !p.flagged).length,
    flaggedPosts: posts.filter(p => p.flagged).length,
    agentStatus: 'active'
  };

  // Filter posts based on active page
  const filteredPosts = activePage === 'flagged' 
    ? posts.filter(p => p.flagged)
    : posts.filter(p => !p.flagged); // Only show safe posts in home view

  return (
    <>
      <Toaster position="top-center" />
      
      {/* Mobile Header (visible only on mobile) */}
      <div className="mobile-header" style={{ display: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src="/Untitled_design-removebg-preview.png" 
            alt="SOL-AI Logo" 
            style={{ width: '32px', height: '32px' }}
          />
          <div className="mobile-header-title">SOL-AI</div>
        </div>
        <button 
          className={`mobile-wallet-btn ${account ? 'connected' : ''}`}
          onClick={connectWallet}
        >
          {account ? `${account.slice(0, 4)}...${account.slice(-4)}` : 'Connect'}
        </button>
      </div>

      <div className="twitter-layout">
        {/* Left Sidebar */}
        <TwitterSidebar
          account={account}
          onNavigate={setActivePage}
          activePage={activePage}
          flaggedCount={stats.flaggedPosts}
          onPostClick={() => account ? setShowComposeModal(true) : toast.error("Connect wallet first!")}
          onWalletClick={connectWallet}
        />

        {/* Center Timeline */}
        <div className="twitter-timeline">
          {/* Header */}
          <div className="twitter-timeline-header">
            <div className="twitter-timeline-title">
              {activePage === 'home' && 'Home'}
              {activePage === 'flagged' && 'Flagged Posts'}
              {activePage === 'reputation' && 'Reputation Dashboard'}
              {activePage === 'governance' && 'Governance'}
              {activePage === 'profile' && 'Profile'}
            </div>
          </div>

          {/* Tabs */}
          {activePage === 'home' && (
            <div className="twitter-tabs">
              <button className="twitter-tab active">For you</button>
            </div>
          )}

          {/* Compose Box (only on home) */}
          {activePage === 'home' && account && (
            <TwitterComposeBox
              onPost={handleCreatePost}
              userAddress={account}
              isSubmitting={isSubmitting}
            />
          )}

          {/* Loading State */}
          {isLoading && (
            <>
              <TwitterPostSkeleton />
              <TwitterPostSkeleton />
              <TwitterPostSkeleton />
            </>
          )}

          {/* Reputation Page */}
          {activePage === 'reputation' && (
            !account ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Connect Wallet</h3>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
                  Connect your wallet to view your reputation dashboard
                </p>
                <button className="twitter-btn-primary" onClick={connectWallet}>
                  Connect Wallet
                </button>
              </div>
            ) : contracts ? (
              <EnhancedReputationDashboard contracts={contracts} account={account} />
            ) : (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div className="twitter-spinner" />
                <p style={{ marginTop: '16px', color: 'var(--color-text-secondary)' }}>
                  Initializing contracts...
                </p>
              </div>
            )
          )}

          {/* Profile Page */}
          {activePage === 'profile' && (
            <div style={{ padding: '20px' }}>
              {!account ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Connect Wallet</h3>
                  <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
                    Connect your wallet to view your profile
                  </p>
                  <button className="twitter-btn-primary" onClick={connectWallet}>
                    Connect Wallet
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                      <div className="twitter-avatar" style={{ width: '80px', height: '80px', fontSize: '32px' }}>
                        {account.slice(2, 4).toUpperCase()}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '24px', marginBottom: '4px' }}>
                          {getDisplayName(account)}
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                          {account}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>Your Posts</h3>
                    {posts.filter(p => p.author.toLowerCase() === account.toLowerCase()).length === 0 ? (
                      <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '20px' }}>
                        No posts yet. Create your first post!
                      </p>
                    ) : (
                      posts.filter(p => p.author.toLowerCase() === account.toLowerCase()).map((post) => (
                        <TwitterPostCard
                          key={post.id.toString()}
                          post={post}
                          authorName={getDisplayName(post.author)}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Governance Page */}
          {activePage === 'governance' && (
            !account ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Connect Wallet</h3>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
                  Connect your wallet to participate in governance
                </p>
                <button className="twitter-btn-primary" onClick={connectWallet}>
                  Connect Wallet
                </button>
              </div>
            ) : contracts ? (
              <EnhancedGovernancePanel contracts={contracts} account={account} posts={posts} />
            ) : (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div className="twitter-spinner" />
                <p style={{ marginTop: '16px', color: 'var(--color-text-secondary)' }}>
                  Initializing contracts...
                </p>
              </div>
            )
          )}

          {/* Posts (Home and Flagged pages) */}
          {(activePage === 'home' || activePage === 'flagged') && (
            <>
              {!isLoading && filteredPosts.length === 0 && (
                <TwitterEmptyState 
                  message={activePage === 'flagged' ? "No flagged posts yet" : "No posts yet. Be the first to post!"} 
                />
              )}

              {!isLoading && filteredPosts.map((post) => (
                <TwitterPostCard
                  key={post.id.toString()}
                  post={post}
                  authorName={getDisplayName(post.author)}
                />
              ))}
            </>
          )}
        </div>

        {/* Right Widgets */}
        <TwitterWidgets stats={stats} contracts={contracts} account={account} />
      </div>

      {/* Compose Modal */}
      <TwitterModal
        isOpen={showComposeModal}
        onClose={() => setShowComposeModal(false)}
        title="Create Post"
      >
        <TwitterComposeBox
          onPost={async (content) => {
            await handleCreatePost(content);
          }}
          userAddress={account}
          isSubmitting={isSubmitting}
        />
      </TwitterModal>
    </>
  );
}

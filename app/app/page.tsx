"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import SocialAbi from "../contracts/abis/SocialPosts.json";
import ModeratorAbi from "../contracts/abis/Moderator.json";
import ReputationAbi from "../contracts/abis/ReputationSystem.json";
import ReputationSBTAbi from "../contracts/abis/ReputationSBT.json";
import IncentiveAbi from "../contracts/abis/IncentiveSystem.json";
import GovernanceAbi from "../contracts/abis/GovernanceSystem.json";
import ReputationDashboard from "../components/ReputationDashboard";
import GovernancePanel from "../components/GovernancePanel";
import { AgentAPI } from '../utils/agentApi';
import { createFeedRanking } from '../utils/feedRanking';
import { DirectRpcProvider, DirectContract } from '../utils/directRpc';
import "./globals.css";

const SOCIAL_ADDR = process.env.NEXT_PUBLIC_SOCIAL_POSTS_ADDRESS as string;
const MODERATOR_ADDR = process.env.NEXT_PUBLIC_MODERATOR_ADDRESS as string;
const REPUTATION_ADDR = process.env.NEXT_PUBLIC_REPUTATION_SYSTEM_ADDRESS as string;
const REPUTATION_SBT_ADDR = process.env.NEXT_PUBLIC_REPUTATION_SBT_ADDRESS as string;
const SOL_TOKEN_ADDR = process.env.NEXT_PUBLIC_SOL_TOKEN_ADDRESS as string;
const INCENTIVE_ADDR = process.env.NEXT_PUBLIC_INCENTIVE_SYSTEM_ADDRESS as string;
const GOVERNANCE_ADDR = process.env.NEXT_PUBLIC_GOVERNANCE_SYSTEM_ADDRESS as string;
const SOMNIA_RPC = process.env.NEXT_PUBLIC_SOMNIA_RPC_URL as string;
const SOMNIA_WSS = process.env.NEXT_PUBLIC_SOMNIA_WSS_URL as string;

// Debug environment variables
console.log("🔧 Environment Variables:", {
  SOCIAL_ADDR,
  MODERATOR_ADDR,
  SOMNIA_RPC,
  SOMNIA_WSS
});

export default function Home() {
  const [account, setAccount] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [postInput, setPostInput] = useState<string>("");
  const [posts, setPosts] = useState<Array<{id: bigint; author: string; content: string; flagged: boolean}>>([]);
  const [flaggedPosts, setFlaggedPosts] = useState<Array<{id: bigint; author: string; content: string; flagged: boolean}>>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [showEventLog, setShowEventLog] = useState<boolean>(false);
  const [showFlaggedPosts, setShowFlaggedPosts] = useState<boolean>(false);
  const [showCreatePost, setShowCreatePost] = useState<boolean>(false);
  const [notification, setNotification] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<{name: string; bio: string; avatar: string}>({name: "", bio: "", avatar: ""});
  const [editingProfile, setEditingProfile] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [showReputationDashboard, setShowReputationDashboard] = useState<boolean>(false);
  const [showGovernance, setShowGovernance] = useState<boolean>(false);
  const [feedVariant, setFeedVariant] = useState<string>('ranked');
  const [rankedPosts, setRankedPosts] = useState<Array<any>>([]);
  const [contracts, setContracts] = useState<any>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const getDisplayName = (address: string) => {
    if (userProfile.name && address.toLowerCase() === account.toLowerCase()) {
      return userProfile.name;
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getUserName = (address: string) => {
    if (userProfile.name && address.toLowerCase() === account.toLowerCase()) {
      return userProfile.name;
    }
    return getDisplayName(address);
  };

  const calculateReputation = (address: string) => {
    if (!address) return 0;
    
    const userPosts = posts.filter(p => p.author.toLowerCase() === address.toLowerCase());
    const totalPosts = userPosts.length;
    const safePosts = userPosts.filter(p => !p.flagged).length;
    const flaggedPosts = userPosts.filter(p => p.flagged).length;
    
    if (totalPosts === 0) return 0;
    
    // Base reputation calculation
    let reputation = 0;
    
    // Points for posting (1 point per post, max 50 points)
    reputation += Math.min(totalPosts * 1, 50);
    
    // Bonus for safe posts (2 points per safe post, max 40 points)
    reputation += Math.min(safePosts * 2, 40);
    
    // Penalty for flagged posts (-5 points per flagged post)
    reputation -= flaggedPosts * 5;
    
    // Safety ratio bonus (up to 10 points for 100% safe posts)
    const safetyRatio = totalPosts > 0 ? safePosts / totalPosts : 0;
    reputation += Math.floor(safetyRatio * 10);
    
    // Ensure reputation is between 0 and 100
    return Math.max(0, Math.min(100, reputation));
  };

  const saveProfile = () => {
    if (account) {
      localStorage.setItem(`profile_${account}`, JSON.stringify(userProfile));
      setEditingProfile(false);
      setStatus("Profile updated successfully!");
    }
  };

  const loadProfile = (address: string) => {
    const saved = localStorage.getItem(`profile_${address}`);
    if (saved) {
      setUserProfile(JSON.parse(saved));
    } else {
      setUserProfile({name: "", bio: "", avatar: ""});
    }
  };

  const rpcProvider = useMemo(() => {
    console.log("🌐 Creating RPC provider:", SOMNIA_RPC);
    // Ethers v5 syntax - much simpler and better for custom networks
    return new ethers.providers.JsonRpcProvider(SOMNIA_RPC);
  }, []);
  
  const wssProvider = useMemo(() => {
    console.log("🔌 Creating WSS provider:", SOMNIA_WSS);
    // Ethers v5 WebSocket provider
    return new ethers.providers.WebSocketProvider(SOMNIA_WSS);
  }, []);

  const socialRead = useMemo(() => {
    console.log("📄 Creating socialRead contract:", SOCIAL_ADDR);
    return new ethers.Contract(SOCIAL_ADDR, SocialAbi, rpcProvider);
  }, [rpcProvider]);
  
  const moderatorRead = useMemo(() => {
    console.log("🛡️ Creating moderatorRead contract:", MODERATOR_ADDR);
    return new ethers.Contract(MODERATOR_ADDR, ModeratorAbi, rpcProvider);
  }, [rpcProvider]);

  const [socialWrite, setSocialWrite] = useState<ethers.Contract | null>(null);

  function pushLog(s: string) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${s}`;
    setLogs((prev) => [...prev, logEntry].slice(-200));
    console.log('Event logged:', logEntry); // Debug log
  }

  async function connectWallet() {
    try {
      const anyWindow = window as any;
      if (!anyWindow.ethereum) {
        alert("MetaMask not found");
        return;
      }
      const provider = new ethers.providers.Web3Provider(anyWindow.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      const socialWriteContract = new ethers.Contract(SOCIAL_ADDR, SocialAbi, signer);
      setSocialWrite(socialWriteContract);
      
      // Set up contracts object for new components
      setContracts({
        socialPosts: socialWriteContract,
        moderator: new ethers.Contract(MODERATOR_ADDR, ModeratorAbi, signer),
        reputationSystem: new ethers.Contract(REPUTATION_ADDR, ReputationAbi.abi, signer),
        reputationSBT: new ethers.Contract(REPUTATION_SBT_ADDR, ReputationSBTAbi.abi, signer),
        solToken: new ethers.Contract(SOL_TOKEN_ADDR, IncentiveAbi.abi, signer),
        incentiveSystem: new ethers.Contract(INCENTIVE_ADDR, IncentiveAbi.abi, signer),
        governanceSystem: new ethers.Contract(GOVERNANCE_ADDR, GovernanceAbi.abi, signer)
      });
      
      loadProfile(address);
      setStatus("Wallet connected");
    } catch (e: any) {
      setStatus(e.message || String(e));
    }
  }

  async function loadPosts() {
    try {
      console.log("🔄 Starting to load posts with direct RPC...");
      setStatus("Loading posts...");
      
      // Use direct RPC to completely bypass ethers.js ENS issues
      const directProvider = new DirectRpcProvider(SOMNIA_RPC);
      const directContract = new DirectContract(SOCIAL_ADDR, directProvider);
      
      console.log("📞 Calling totalPosts() via direct RPC...");
      const total: bigint = await directContract.totalPosts();
      console.log(`📊 Total posts: ${total}`);
      
      const arr: Array<{id: bigint; author: string; content: string; flagged: boolean}> = [];
      
      if (total > 0n) {
        console.log(`🔄 Loading ${total} posts...`);
        for (let i = 1n; i <= total; i++) {
          try {
            console.log(`📖 Loading post ${i}...`);
            const p = await directContract.getPost(i);
            console.log(`✅ Post ${i}:`, { id: p.id, author: p.author, content: p.content.substring(0, 50), flagged: p.flagged });
            arr.push({ id: p.id, author: p.author, content: p.content, flagged: p.flagged });
          } catch (postError) {
            console.error(`❌ Error loading post ${i}:`, postError);
          }
        }
      } else {
        console.log("ℹ️ No posts found - this is normal for a new deployment");
      }
      
      console.log(`📝 Setting ${arr.length} posts to state`);
      const reversed = arr.reverse();
      console.log(`📝 Reversed array length: ${reversed.length}`);
      console.log(`📝 First 3 posts:`, reversed.slice(0, 3).map(p => ({ id: String(p.id), content: p.content.substring(0, 20) })));
      
      setPosts(reversed);
      setFlaggedPosts(arr.filter(p => p.flagged));
      setRankedPosts(arr);
      
      if (total === 0n) {
        setStatus("No posts yet - connect wallet and create the first post!");
      } else {
        setStatus(`Loaded ${arr.length} posts successfully`);
      }
      console.log("✅ Posts loaded successfully via direct RPC");
    } catch (e: any) {
      const errorMsg = `RPC Error: ${e.message || String(e)}`;
      setStatus(errorMsg);
      console.error("❌ Load posts error:", e);
      console.error("❌ Error details:", {
        message: e.message,
        code: e.code,
        data: e.data,
        stack: e.stack
      });
    }
  }

  async function submitPost() {
    if (!socialWrite) return alert("Connect wallet first");
    if (!postInput.trim()) return;
    try {
      setStatus("Submitting post...");
      const tx = await socialWrite.createPost(postInput.trim());
      await tx.wait();
      setPostInput("");
      setShowCreatePost(false);
      setStatus("Post submitted");
      await loadPosts();
      
      // Check if the post gets flagged (wait a bit for AI processing)
      setTimeout(async () => {
        const newTotal = await socialRead.totalPosts();
        const latestPost = await socialRead.getPost(newTotal);
        if (latestPost.flagged && latestPost.author.toLowerCase() === account.toLowerCase()) {
          setNotification("⚠️ Your post has been flagged by our AI moderation system for potentially toxic content.");
          setTimeout(() => setNotification(""), 5000);
        }
      }, 10000); // Wait 10 seconds for AI processing
      
    } catch (e: any) {
      setStatus(e.message || String(e));
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  // Temporarily disable polling to isolate ENS issues
  // useEffect(() => {
  //   // Use polling instead of WebSocket subscriptions for Somnia compatibility
  //   const pollForUpdates = async () => {
  //     try {
  //       const currentTotal = await socialRead.totalPosts();
  //       const currentPostsLength = posts.length;
        
  //       if (Number(currentTotal) > currentPostsLength) {
  //         pushLog(`New posts detected: ${currentTotal} total`);
  //         loadPosts();
  //       }
  //     } catch (error) {
  //       console.error("Polling error:", error);
  //     }
  //   };

  //   // Poll every 10 seconds for new posts
  //   const pollInterval = setInterval(pollForUpdates, 10000);
    
  //   return () => {
  //     clearInterval(pollInterval);
  //   };
  // }, [posts.length]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  // Filter posts based on active filter, search query, and feed variant
  const filteredPosts = useMemo(() => {
    console.log(`🔍 Filtering posts: total=${posts.length}, ranked=${rankedPosts.length}, variant=${feedVariant}, filter=${activeFilter}`);
    let filtered = feedVariant === 'ranked' ? rankedPosts : posts;
    console.log(`🔍 After variant selection: ${filtered.length} posts`);
    
    // Apply filter
    switch (activeFilter) {
      case "safe":
        filtered = filtered.filter(p => !p.flagged);
        break;
      case "my":
        filtered = filtered.filter(p => p.author.toLowerCase() === account.toLowerCase());
        break;
      case "recent":
        filtered = filtered.slice(0, 10);
        break;
      case "trending":
        // This would use the trending algorithm from feedRanking
        filtered = filtered.filter(p => !p.flagged).slice(0, 20);
        break;
      default:
        // Show all posts by default (both safe and flagged)
        break;
    }
    console.log(`🔍 After filter (${activeFilter}): ${filtered.length} posts`);
    
    // Apply search
    if (searchQuery.trim()) {
      filtered = filtered.filter(p => 
        p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.author.toLowerCase().includes(searchQuery.toLowerCase())
      );
      console.log(`🔍 After search: ${filtered.length} posts`);
    }
    
    console.log(`🔍 Final filtered posts: ${filtered.length}`);
    return filtered;
  }, [posts, rankedPosts, activeFilter, searchQuery, account, feedVariant]);

  // Generate avatar initials from address
  const getAvatarInitials = (address: string) => {
    return address.slice(2, 4).toUpperCase();
  };

  return (
    <div className="app-layout">
      {/* Notification */}
      {notification && (
        <div className={`notification notification-error animate-fade-in`}>
          {notification}
        </div>
      )}

      {/* Mobile Overlay */}
      {sidebarOpen && <div className="mobile-overlay" onClick={() => setSidebarOpen(false)}></div>}
      
      {/* Sidebar Navigation */}
      <nav className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <h1 className="logo-text">SOL AI</h1>
            <span className="logo-subtitle">Decentralized Social</span>
          </div>
        </div>

        <div className="nav-section">
          <h3 className="nav-section-title">Main</h3>
          <div className="nav-items">
            <button className={`nav-item ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => {setActiveFilter('all'); setSidebarOpen(false);}}>
              <span className="nav-label">Feed</span>
            </button>
            <button className={`nav-item ${showProfile ? 'active' : ''}`} onClick={() => {setShowProfile(true); setSidebarOpen(false);}}>
              <span className="nav-label">Profile</span>
            </button>
            <button className={`nav-item ${showReputationDashboard ? 'active' : ''}`} onClick={() => {setShowReputationDashboard(true); setSidebarOpen(false);}}>
              <span className="nav-label">Reputation</span>
            </button>
            <button className="nav-item" onClick={() => {setShowEventLog(true); setSidebarOpen(false);}}>
              <span className="nav-label">Analytics</span>
            </button>
          </div>
        </div>

        <div className="nav-section">
          <h3 className="nav-section-title">AI Moderation</h3>
          <div className="nav-items">
            <button className="nav-item" onClick={() => {setShowFlaggedPosts(true); setSidebarOpen(false);}}>
              <span className="nav-label">Moderation</span>
              {flaggedPosts.length > 0 && (
                <span className="nav-badge">{flaggedPosts.length}</span>
              )}
            </button>
          </div>
        </div>

        <div className="nav-section">
          <h3 className="nav-section-title">Governance</h3>
          <div className="nav-items">
            <button className={`nav-item ${showGovernance ? 'active' : ''}`} onClick={() => {setShowGovernance(true); setSidebarOpen(false);}}>
              <span className="nav-label">Appeals</span>
            </button>
          </div>
        </div>


        <div className="sidebar-footer">
          <div className="wallet-section">
            <button onClick={connectWallet} className={`wallet-btn ${account ? 'connected' : ''}`}>
              <div className="wallet-status">
                <span className="wallet-icon">{account ? '●' : '○'}</span>
                <span className="wallet-text">{account ? 'Connected' : 'Connect Wallet'}</span>
              </div>
              {account && (
                <div className="wallet-address">{getDisplayName(account)}</div>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <button 
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          
          <div className="search-container">
            <input
              type="text"
              placeholder="Search posts and users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="header-actions">
            <button className="create-post-btn" onClick={() => setShowCreatePost(true)}>
              <span>+</span>
              <span>New Post</span>
            </button>
          </div>
        </header>

        {/* Content Grid */}
        <div className="content-grid">
          {/* Left Column - Profile/Stats */}
          <aside className="left-sidebar">
            <div className="profile-card">
              <div className="profile-header">
                <div className="profile-avatar">
                  {account ? getAvatarInitials(account) : '?'}
                </div>
                <div className="profile-info">
                  <h3 className="profile-name">{account ? getUserName(account) : 'Anonymous'}</h3>
                  <p className="profile-handle">@{account ? account.slice(-6) : 'connect'}</p>
                  {!account && (
                    <button onClick={connectWallet} className="connect-wallet-btn">
                      Connect Wallet
                    </button>
                  )}
                </div>
              </div>
              
              <div className="profile-stats">
                <div className="stat">
                  <span className="stat-value">{posts.filter(p => p.author.toLowerCase() === account.toLowerCase()).length}</span>
                  <span className="stat-label">Posts</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{posts.filter(p => p.author.toLowerCase() === account.toLowerCase() && !p.flagged).length}</span>
                  <span className="stat-label">Safe</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{calculateReputation(account)}</span>
                  <span className="stat-label">Reputation</span>
                </div>
              </div>
            </div>

          </aside>

          {/* Center Column - Feed */}
          <div className="feed-container">
            {/* Feed Header */}
            <div className="feed-header">
              <div className="feed-controls">
                <div className="feed-tabs">
                  <button className={`feed-tab ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>All Posts</button>
                  <button className={`feed-tab ${activeFilter === 'safe' ? 'active' : ''}`} onClick={() => setActiveFilter('safe')}>Safe Only</button>
                  <button className={`feed-tab ${activeFilter === 'recent' ? 'active' : ''}`} onClick={() => setActiveFilter('recent')}>Recent</button>
                  <button className={`feed-tab ${activeFilter === 'trending' ? 'active' : ''}`} onClick={() => setActiveFilter('trending')}>Trending</button>
                </div>
                <div className="feed-variant-selector">
                  <select 
                    value={feedVariant} 
                    onChange={(e) => setFeedVariant(e.target.value)}
                    className="variant-select"
                  >
                    <option value="chronological">Chronological</option>
                    <option value="ranked">Algorithm</option>
                  </select>
                </div>
              </div>
              <button onClick={loadPosts} className="refresh-btn" title="Refresh Feed">
                ↻
              </button>
            </div>

            {/* Post Feed */}
            <div className="post-feed">
              {filteredPosts.map((post) => (
                <article key={String(post.id)} className="post-card">
                  <div className="post-header">
                    <div className="post-avatar">
                      {getAvatarInitials(post.author)}
                    </div>
                    <div className="post-meta">
                      <div className="post-author">
                        <span className="author-name">{getUserName(post.author)}</span>
                        <span className="post-id">#{String(post.id)}</span>
                      </div>
                      <div className="post-time">Just now</div>
                    </div>
                    <div className="post-badges">
                      <div className={`moderation-badge ${post.flagged ? 'flagged' : 'safe'}`}>
                        {post.flagged ? 'Flagged' : 'Safe'}
                      </div>
                      {post.rankingScore && (
                        <div className="ranking-badge" title={`Ranking Score: ${post.rankingScore.toFixed(2)}`}>
                          ⭐ {post.rankingScore.toFixed(1)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="post-content">
                    {post.content}
                  </div>
                  
                </article>
              ))}
              
              {filteredPosts.length === 0 && (
                <div className="empty-state">
                  <h3 className="empty-title">No posts found</h3>
                  <p className="empty-description">
                    {searchQuery ? 'Try adjusting your search terms' : 'Be the first to create a post!'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - AI Moderation Status */}
          <aside className="right-sidebar">
            <div className="ai-status-card">
              <div className="status-header">
                <h3 className="status-title">AI Moderation Status</h3>
              </div>
              
              <div className="status-content">
                <div className="status-metric">
                  <div className="metric-header">
                    <span className="metric-label">Flags today</span>
                  </div>
                  <div className="metric-value">{flaggedPosts.length}</div>
                </div>

                <div className="recent-decisions">
                  <h4 className="decisions-title">Recent Flagged Posts</h4>
                  <div className="decision-list">
                    {flaggedPosts.slice(0, 3).map((post) => (
                      <div key={String(post.id)} className="decision-item warning">
                        <div className="decision-icon">⚠️</div>
                        <div className="decision-content">
                          <div className="decision-type">Post #{String(post.id)}</div>
                          <div className="decision-desc">{post.content.substring(0, 30)}...</div>
                        </div>
                      </div>
                    ))}
                    {flaggedPosts.length === 0 && (
                      <div className="text-center py-4 opacity-70">
                        <p className="text-sm">No flagged posts</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="tokenized-engagement">
                  <h4 className="engagement-title">Tokenized Engagement</h4>
                  <div className="engagement-content">
                    <div className="creator-rewards">
                      <div className="reward-title">Creator Rewards</div>
                      <div className="reward-desc">Earn tokens for quality content</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Flagged Posts Modal */}
      {showFlaggedPosts && (
        <div className="modal-overlay" onClick={() => setShowFlaggedPosts(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-brand text-xl">
                ⚠️ Flagged Posts ({flaggedPosts.length})
              </h3>
              <button
                onClick={() => setShowFlaggedPosts(false)}
                className="btn btn-danger text-sm px-3 py-1"
              >
                ✕ Close
              </button>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {flaggedPosts.length === 0 ? (
                <div className="text-center py-12 opacity-70">
                  <div className="text-4xl mb-4">🎉</div>
                  <h4 className="text-lg mb-2">No flagged posts!</h4>
                  <p className="text-sm">All posts are following community guidelines</p>
                </div>
              ) : (
                flaggedPosts.map((post) => (
                  <div key={String(post.id)} className="card border-red-500 border-opacity-30">
                    <div className="post-header">
                      <div className="post-avatar">
                        {getAvatarInitials(post.author)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-body font-medium">
                            {getDisplayName(post.author)}
                          </span>
                          <span className="text-mono text-xs opacity-50">
                            #{String(post.id)}
                          </span>
                        </div>
                      </div>
                      <div className="badge badge-flagged">
                        🚩 Flagged by AI
                      </div>
                    </div>
                    
                    <div className="post-content">
                      {post.content}
                    </div>
                    
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="modal-overlay" onClick={() => setShowCreatePost(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-brand text-xl mb-6">Create a Post</h3>
            
            <textarea
              value={postInput}
              onChange={(e) => setPostInput(e.target.value)}
              placeholder="Share your thoughts with the decentralized world..."
              className="input textarea mb-4"
              rows={4}
            />
            
            <div className="flex justify-between items-center">
              <div className="text-mono text-sm opacity-70">
                {postInput.length}/280 characters
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowCreatePost(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitPost} 
                  disabled={!postInput.trim()}
                  className="btn btn-primary"
                >
                  Post to Blockchain
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Profile Modal */}
      {showProfile && (
        <div className="modal-overlay" onClick={() => setShowProfile(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3 className="modal-title">👤 Profile Settings</h3>
              <button
                onClick={() => setShowProfile(false)}
                className="close-btn"
              >
                ✕
              </button>
            </div>

            {!account ? (
              <div className="profile-connect">
                <div className="connect-prompt">
                  <div className="connect-icon">🔗</div>
                  <h4>Connect Your Wallet</h4>
                  <p>Connect your wallet to customize your profile and start posting on SOL AI.</p>
                  <button onClick={connectWallet} className="connect-btn">
                    Connect Wallet
                  </button>
                </div>
              </div>
            ) : (
              <div className="profile-content">
                <div className="profile-section">
                  <div className="profile-avatar-large">
                    {getAvatarInitials(account)}
                  </div>
                  <div className="profile-address">
                    <span className="address-label">Wallet Address:</span>
                    <span className="address-value">{account}</span>
                  </div>
                </div>

                <div className="profile-form">
                  <div className="form-group">
                    <label className="form-label">Display Name</label>
                    <input
                      type="text"
                      value={userProfile.name}
                      onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                      placeholder="Enter your display name"
                      className="form-input"
                      disabled={!editingProfile}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bio</label>
                    <textarea
                      value={userProfile.bio}
                      onChange={(e) => setUserProfile({...userProfile, bio: e.target.value})}
                      placeholder="Tell us about yourself..."
                      className="form-textarea"
                      rows={3}
                      disabled={!editingProfile}
                    />
                  </div>
                </div>

                <div className="profile-stats-modal">
                  <div className="stat-item">
                    <span className="stat-number">{posts.filter(p => p.author.toLowerCase() === account.toLowerCase()).length}</span>
                    <span className="stat-text">Posts Created</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{posts.filter(p => p.author.toLowerCase() === account.toLowerCase() && !p.flagged).length}</span>
                    <span className="stat-text">Safe Posts</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{posts.filter(p => p.author.toLowerCase() === account.toLowerCase() && p.flagged).length}</span>
                    <span className="stat-text">Flagged Posts</span>
                  </div>
                </div>

                <div className="profile-actions">
                  {!editingProfile ? (
                    <button
                      onClick={() => setEditingProfile(true)}
                      className="edit-btn"
                    >
                      ✏️ Edit Profile
                    </button>
                  ) : (
                    <div className="edit-actions">
                      <button
                        onClick={() => {
                          setEditingProfile(false);
                          loadProfile(account);
                        }}
                        className="cancel-btn"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveProfile}
                        className="save-btn"
                      >
                        💾 Save Changes
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event Log Modal */}
      {showEventLog && (
        <div className="modal-overlay" onClick={() => setShowEventLog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📊 Live Event Log</h3>
              <button
                onClick={() => setShowEventLog(false)}
                className="close-btn"
              >
                ✕
              </button>
            </div>

            <div className="event-log-container">
              {logs.length === 0 ? (
                <div className="empty-log">
                  <div className="empty-icon">🔍</div>
                  <h4>Waiting for events...</h4>
                  <p>Events will appear here when posts are created or flagged</p>
                </div>
              ) : (
                <div ref={logRef} className="log-entries">
                  {logs.map((log, i) => (
                    <div key={i} className="log-entry">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="log-actions">
              <button
                onClick={() => setLogs([])}
                className="secondary-btn"
              >
                Clear Log
              </button>
              <button
                onClick={() => {
                  const logText = logs.join('\n');
                  const blob = new Blob([logText], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'sol-ai-event-log.txt';
                  a.click();
                }}
                className="secondary-btn"
              >
                Export Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reputation Dashboard Modal */}
      {showReputationDashboard && (
        <div className="modal-overlay" onClick={() => setShowReputationDashboard(false)}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🏆 Reputation Dashboard</h3>
              <button
                onClick={() => setShowReputationDashboard(false)}
                className="close-btn"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {contracts ? (
                <ReputationDashboard contracts={contracts} account={account} />
              ) : (
                <div className="connect-prompt">
                  <p>Connect your wallet to view reputation dashboard</p>
                  <button onClick={connectWallet} className="connect-btn">
                    Connect Wallet
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Governance Panel Modal */}
      {showGovernance && (
        <div className="modal-overlay" onClick={() => setShowGovernance(false)}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">⚖️ Community Governance</h3>
              <button
                onClick={() => setShowGovernance(false)}
                className="close-btn"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {contracts ? (
                <GovernancePanel contracts={contracts} account={account} />
              ) : (
                <div className="connect-prompt">
                  <p>Connect your wallet to participate in governance</p>
                  <button onClick={connectWallet} className="connect-btn">
                    Connect Wallet
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

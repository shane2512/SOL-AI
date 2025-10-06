"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserProvider, Contract, JsonRpcProvider, JsonRpcSigner, WebSocketProvider } from "ethers";
import SocialAbi from "../contracts/abis/SocialPosts.json";
import ModeratorAbi from "../contracts/abis/Moderator.json";
import "./globals.css";

const SOCIAL_ADDR = process.env.NEXT_PUBLIC_SOCIAL_POSTS_ADDRESS as string;
const MODERATOR_ADDR = process.env.NEXT_PUBLIC_MODERATOR_ADDRESS as string;
const SOMNIA_RPC = process.env.NEXT_PUBLIC_SOMNIA_RPC_URL as string;
const SOMNIA_WSS = process.env.NEXT_PUBLIC_SOMNIA_WSS_URL as string;

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

  const rpcProvider = useMemo(() => new JsonRpcProvider(SOMNIA_RPC), []);
  const wssProvider = useMemo(() => new WebSocketProvider(SOMNIA_WSS), []);

  const socialRead = useMemo(() => new Contract(SOCIAL_ADDR, SocialAbi, rpcProvider), [rpcProvider]);
  const moderatorRead = useMemo(() => new Contract(MODERATOR_ADDR, ModeratorAbi, rpcProvider), [rpcProvider]);

  const [socialWrite, setSocialWrite] = useState<Contract | null>(null);

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
      const provider = new BrowserProvider(anyWindow.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      setSocialWrite(new Contract(SOCIAL_ADDR, SocialAbi, signer as unknown as JsonRpcSigner));
      loadProfile(address);
      setStatus("Wallet connected");
    } catch (e: any) {
      setStatus(e.message || String(e));
    }
  }

  async function loadPosts() {
    try {
      setStatus("Loading posts...");
      const total: bigint = await socialRead.totalPosts();
      const arr: Array<{id: bigint; author: string; content: string; flagged: boolean}> = [];
      for (let i = 1n; i <= total; i++) {
        const p = await socialRead.getPost(i);
        arr.push({ id: p.id, author: p.author, content: p.content, flagged: p.flagged });
      }
      setPosts(arr.reverse());
      setFlaggedPosts(arr.filter(p => p.flagged));
      setStatus(`Loaded ${total} posts`);
    } catch (e: any) {
      setStatus(`RPC Error: ${e.message || String(e)}`);
      console.error("Load posts error:", e);
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

  useEffect(() => {
    const social = new Contract(SOCIAL_ADDR, SocialAbi, wssProvider);
    const onCreated = (id: bigint, author: string, content: string) => {
      pushLog(`PostCreated id=${id} author=${author} content=${content}`);
      loadPosts();
    };
    const onFlagged = (id: bigint, moderator: string) => {
      pushLog(`PostFlagged id=${id} by=${moderator}`);
      loadPosts();
      
      // Check if this is the current user's post
      socialRead.getPost(id).then(post => {
        if (post.author.toLowerCase() === account.toLowerCase()) {
          setNotification("⚠️ Your post has been flagged by our AI moderation system for potentially toxic content.");
          setTimeout(() => setNotification(""), 5000);
        }
      }).catch(console.error);
    };

    social.on("PostCreated", onCreated);
    social.on("PostFlagged", onFlagged);

    const mod = new Contract(MODERATOR_ADDR, ModeratorAbi, wssProvider);
    const onModFlag = (id: bigint, agent: string, scoreBp: bigint, model: string) => {
      pushLog(`Moderator.PostFlagged id=${id} agent=${agent} scoreBp=${scoreBp} model=${model}`);
    };
    mod.on("PostFlagged", onModFlag);

    return () => {
      social.removeAllListeners();
      mod.removeAllListeners();
      wssProvider.destroy();
    };
  }, [wssProvider]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  // Filter posts based on active filter and search query
  const filteredPosts = useMemo(() => {
    let filtered = posts;
    
    // Apply filter
    switch (activeFilter) {
      case "safe":
        filtered = posts.filter(p => !p.flagged);
        break;
      case "my":
        filtered = posts.filter(p => p.author.toLowerCase() === account.toLowerCase());
        break;
      case "recent":
        filtered = posts.slice(0, 10);
        break;
      default:
        filtered = posts.filter(p => !p.flagged); // Show only safe posts by default
    }
    
    // Apply search
    if (searchQuery.trim()) {
      filtered = filtered.filter(p => 
        p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.author.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [posts, activeFilter, searchQuery, account]);

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

      {/* Sidebar Navigation */}
      <nav className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <h1 className="logo-text">SOL AI</h1>
            <span className="logo-subtitle">Decentralized Social</span>
          </div>
        </div>

        <div className="nav-section">
          <h3 className="nav-section-title">Main</h3>
          <div className="nav-items">
            <button className={`nav-item ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>
              <span className="nav-label">Feed</span>
            </button>
            <button className={`nav-item ${showProfile ? 'active' : ''}`} onClick={() => setShowProfile(true)}>
              <span className="nav-label">Profile</span>
            </button>
            <button className="nav-item" onClick={() => setShowEventLog(true)}>
              <span className="nav-label">Analytics</span>
            </button>
          </div>
        </div>

        <div className="nav-section">
          <h3 className="nav-section-title">AI Moderation</h3>
          <div className="nav-items">
            <button className="nav-item" onClick={() => setShowFlaggedPosts(true)}>
              <span className="nav-label">Moderation</span>
              {flaggedPosts.length > 0 && (
                <span className="nav-badge">{flaggedPosts.length}</span>
              )}
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
              <div className="feed-tabs">
                <button className={`feed-tab ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>All Posts</button>
                <button className={`feed-tab ${activeFilter === 'safe' ? 'active' : ''}`} onClick={() => setActiveFilter('safe')}>Safe Only</button>
                <button className={`feed-tab ${activeFilter === 'recent' ? 'active' : ''}`} onClick={() => setActiveFilter('recent')}>Recent</button>
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
                    <div className={`moderation-badge ${post.flagged ? 'flagged' : 'safe'}`}>
                      {post.flagged ? 'Flagged' : 'Safe'}
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
                  <h4 className="decisions-title">Recent Decisions</h4>
                  <div className="decision-list">
                    <div className="decision-item warning">
                      <div className="decision-icon">⚠️</div>
                      <div className="decision-content">
                        <div className="decision-type">Policy: Spoofing Risk</div>
                        <div className="decision-desc">Suspicious link detected</div>
                      </div>
                    </div>
                    <div className="decision-item warning">
                      <div className="decision-icon">⚠️</div>
                      <div className="decision-content">
                        <div className="decision-type">Policy: Low-effort</div>
                        <div className="decision-desc">Spam content flagged</div>
                      </div>
                    </div>
                    <div className="decision-item warning">
                      <div className="decision-icon">⚠️</div>
                      <div className="decision-content">
                        <div className="decision-type">Policy: Promotional</div>
                        <div className="decision-desc">Transparency required</div>
                      </div>
                    </div>
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
    </div>
  );
}

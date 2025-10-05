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
  const logRef = useRef<HTMLDivElement>(null);

  const getDisplayName = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
      setAccount(await signer.getAddress());
      setSocialWrite(new Contract(SOCIAL_ADDR, SocialAbi, signer as unknown as JsonRpcSigner));
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
    <div className="min-h-screen">
      {/* Notification */}
      {notification && (
        <div className={`notification notification-error animate-fade-in`}>
          {notification}
        </div>
      )}

      {/* Header Navigation */}
      <header className="card mb-8 sticky top-4 z-50">
        <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-0 lg:justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-4">
            <h1 className="text-brand text-2xl lg:text-3xl text-neon-green">SOL AI</h1>
          </div>

          {/* Center: Search Bar */}
          <div className="w-full lg:flex-1 lg:max-w-md lg:mx-8">
            <input
              type="text"
              placeholder="Search posts or users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input text-sm w-full"
            />
          </div>

          {/* Right: Wallet & Profile */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <button 
              onClick={connectWallet} 
              className={`btn text-sm ${account ? 'btn-primary' : 'btn-secondary'}`}
            >
              {account ? '🟢 Connected' : '🔗 Connect Wallet'}
            </button>
            
            {account && (
              <div className="flex items-center gap-2">
                <div className="post-avatar text-xs">
                  {getAvatarInitials(account)}
                </div>
                <span className="text-mono text-xs lg:text-sm opacity-70">
                  {getDisplayName(account)}
                </span>
              </div>
            )}
            
            <span className="text-mono text-xs opacity-50 hidden lg:block">
              Somnia Testnet
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <div className="container px-4 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Main Feed */}
          <main className="flex-1 min-w-0">
            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2 lg:gap-4 mb-6 justify-center lg:justify-start">
              {[
                { key: 'all', label: 'All Posts' },
                { key: 'safe', label: 'Safe Only' },
                { key: 'my', label: 'My Posts' },
                { key: 'recent', label: 'Recent Activity' }
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`filter-btn text-xs lg:text-sm ${activeFilter === filter.key ? 'active' : ''}`}
                >
                  {filter.label}
                </button>
              ))}
              
              <button 
                onClick={loadPosts} 
                className="btn btn-secondary text-xs px-3 py-1 lg:px-4 lg:py-2"
              >
                🔄 Refresh
              </button>
            </div>

            {/* Post Feed */}
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <article key={String(post.id)} className="post-card">
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
                      <span className="text-mono text-xs opacity-50">
                        Just now
                      </span>
                    </div>
                    <div className={`badge ${post.flagged ? 'badge-flagged' : 'badge-safe'}`}>
                      {post.flagged ? '🚩 Flagged' : '✅ Safe'}
                    </div>
                  </div>
                  
                  <div className="post-content">
                    {post.content}
                  </div>
                  
                  <div className="post-actions">
                    <button className="post-action">
                      <span>❤️</span>
                      <span>Like</span>
                    </button>
                    <button className="post-action">
                      <span>↗️</span>
                      <span>Share</span>
                    </button>
                    <button className="post-action">
                      <span>🚨</span>
                      <span>Report</span>
                    </button>
                    <button className="post-action">
                      <span>🔗</span>
                      <span>Blockchain</span>
                    </button>
                  </div>
                </article>
              ))}
              
              {filteredPosts.length === 0 && (
                <div className="card text-center py-12">
                  <div className="text-4xl mb-4">📭</div>
                  <h3 className="text-xl mb-2">No posts found</h3>
                  <p className="opacity-70">
                    {searchQuery ? 'Try adjusting your search terms' : 'Be the first to create a post!'}
                  </p>
                </div>
              )}
            </div>
          </main>

          {/* Sidebar - Responsive */}
          <aside className="w-full lg:w-64 lg:flex-shrink-0 space-y-4">
            {/* Mobile: Horizontal scroll, Desktop: Vertical stack */}
            <div className="flex lg:flex-col gap-4 lg:gap-0 lg:space-y-4 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0">
              <div className="card min-w-64 lg:min-w-0 flex-shrink-0 lg:flex-shrink">
                <h3 className="text-nav font-semibold mb-4">Moderation</h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => setShowFlaggedPosts(true)}
                    className="w-full text-left p-3 rounded-lg hover:bg-white hover:bg-opacity-5 transition-colors flex items-center justify-between"
                  >
                    <span className="text-sm">Flagged Content</span>
                    {flaggedPosts.length > 0 && (
                      <span className="badge badge-flagged text-xs">
                        {flaggedPosts.length}
                      </span>
                    )}
                  </button>
                  <button className="w-full text-left p-3 rounded-lg hover:bg-white hover:bg-opacity-5 transition-colors">
                    <span className="text-sm">Moderation Log</span>
                  </button>
                  <button className="w-full text-left p-3 rounded-lg hover:bg-white hover:bg-opacity-5 transition-colors">
                    <span className="text-sm">Community Guidelines</span>
                  </button>
                </div>
              </div>
              
              <div className="card min-w-64 lg:min-w-0 flex-shrink-0 lg:flex-shrink">
                <h3 className="text-nav font-semibold mb-4">Status</h3>
                <div className="text-mono text-sm opacity-70">
                  {status || 'Ready'}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

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
                    
                    <div className="flex gap-2 mt-4">
                      <button className="btn btn-secondary text-sm">
                        Appeal Flag
                      </button>
                      <button className="btn btn-danger text-sm">
                        Hide Post
                      </button>
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
            <h3 className="text-brand text-xl mb-6">✍️ Create a Post</h3>
            
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
                  🚀 Post to Blockchain
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Buttons */}
      <button
        onClick={() => setShowCreatePost(true)}
        className="fab fab-bottom-right"
        title="Create New Post"
      >
        ✍️
      </button>

      <button
        onClick={() => setShowEventLog(true)}
        className="fab fab-bottom-left"
        title="View Event Log"
      >
        📊
      </button>

      {/* Event Log Modal */}
      {showEventLog && (
        <div className="modal-overlay" onClick={() => setShowEventLog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-brand text-xl">📊 Live Event Log</h3>
              <button
                onClick={() => setShowEventLog(false)}
                className="btn btn-danger text-sm px-3 py-1"
              >
                ✕ Close
              </button>
            </div>
            
            <div 
              ref={logRef}
              className="bg-black bg-opacity-30 border border-white border-opacity-10 rounded-lg p-4 max-h-96 overflow-y-auto"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {logs.length === 0 ? (
                <div className="text-center py-12 opacity-50">
                  <div className="text-2xl mb-2">🔍</div>
                  <p className="text-sm">Waiting for events...</p>
                  <p className="text-xs mt-2 opacity-70">
                    Events will appear here when posts are created or flagged
                  </p>
                </div>
              ) : (
                logs.map((log, i) => (
                  <div 
                    key={i} 
                    className="mb-2 p-2 bg-white bg-opacity-5 rounded border-l-2 border-emerald-500 text-xs"
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
            
            <div className="flex gap-2 mt-4">
              <button className="btn btn-secondary text-sm">
                Clear Log
              </button>
              <button className="btn btn-secondary text-sm">
                Export Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserProvider, Contract, JsonRpcProvider, JsonRpcSigner, WebSocketProvider } from "ethers";
import SocialAbi from "../contracts/abis/SocialPosts.json";
import ModeratorAbi from "../contracts/abis/Moderator.json";

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

  const buttonStyle = {
    padding: '12px 24px',
    borderRadius: '12px',
    border: 'none',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    color: 'white',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
  };

  const cardStyle = {
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
    backdropFilter: 'blur(20px)',
    padding: '24px',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  };

  return (
    <div>
      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.4)',
          zIndex: 9999,
          maxWidth: '400px',
          fontSize: '14px',
          fontWeight: 600
        }}>
          {notification}
        </div>
      )}

      {/* Navigation Bar */}
      <div style={{ 
        display: 'flex', 
        gap: 16, 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '32px',
        padding: '20px',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button 
            onClick={connectWallet} 
            style={buttonStyle}
            onMouseOver={(e) => (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => (e.target as HTMLButtonElement).style.transform = 'translateY(0)'}
          >
            {account ? '🟢 Connected' : '🔗 Connect Wallet'}
          </button>
          <div style={{ 
            opacity: 0.9, 
            fontSize: '14px',
            padding: '8px 16px',
            background: account ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            borderRadius: '8px',
            border: `1px solid ${account ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}>
            {account ? `${getDisplayName(account)}` : 'Not connected'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => setShowCreatePost(!showCreatePost)}
            style={{
              ...buttonStyle,
              background: showCreatePost ? 'linear-gradient(135deg, #059669, #047857)' : 'linear-gradient(135deg, #10b981, #059669)',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            ✍️ {showCreatePost ? 'Cancel' : 'Create Post'}
          </button>
          
          <button
            onClick={() => setShowFlaggedPosts(!showFlaggedPosts)}
            style={{
              ...buttonStyle,
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
              position: 'relative'
            }}
          >
            ⚠️ Flagged Posts
            {flaggedPosts.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                background: '#fbbf24',
                color: '#92400e',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {flaggedPosts.length}
              </span>
            )}
          </button>
        </div>

        <div style={{ 
          opacity: 0.8,
          fontSize: '14px',
          fontWeight: 500
        }}>
          {status}
        </div>
      </div>

      {/* Create Post Section - Only show when button is clicked */}
      {showCreatePost && (
        <div style={{...cardStyle, marginBottom: '32px'}}>
          <h3 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 600, 
            marginBottom: '20px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            ✍️ Create a Post
          </h3>
          <textarea
            value={postInput}
            onChange={(e) => setPostInput(e.target.value)}
            placeholder="Share your thoughts with the decentralized world..."
            rows={4}
            style={{ 
              width: '100%', 
              padding: '16px', 
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(0, 0, 0, 0.2)',
              color: '#e6edf3',
              fontSize: '16px',
              fontFamily: 'Inter, system-ui, sans-serif',
              resize: 'vertical',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
            <div style={{ fontSize: '14px', opacity: 0.6 }}>
              {postInput.length}/280 characters
            </div>
            <button 
              onClick={submitPost} 
              disabled={!postInput.trim()}
              style={{
                ...buttonStyle,
                background: postInput.trim() ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(107, 114, 128, 0.5)',
                cursor: postInput.trim() ? 'pointer' : 'not-allowed',
                boxShadow: postInput.trim() ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
              }}
            >
              🚀 Post
            </button>
          </div>
        </div>
      )}

      {/* Flagged Posts Modal */}
      {showFlaggedPosts && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}
        onClick={() => setShowFlaggedPosts(false)}
        >
          <div 
            style={{
              ...cardStyle,
              maxWidth: '800px',
              width: '100%',
              maxHeight: '80vh',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 600, 
                margin: 0,
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                ⚠️ Flagged Posts ({flaggedPosts.length})
              </h3>
              <button
                onClick={() => setShowFlaggedPosts(false)}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#ef4444',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                ✕ Close
              </button>
            </div>
            <div style={{ 
              maxHeight: '60vh', 
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}>
              {flaggedPosts.length === 0 ? (
                <div style={{ opacity: 0.5, textAlign: 'center', padding: '40px 0' }}>
                  🎉 No flagged posts!
                  <br />
                  <small style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                    All posts are following community guidelines
                  </small>
                </div>
              ) : (
                flaggedPosts.map((p) => (
                  <div key={String(p.id)} style={{ 
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '16px', 
                    borderRadius: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <span style={{ 
                        fontWeight: 700, 
                        fontSize: '14px',
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}>
                        #{String(p.id)}
                      </span>
                      <span style={{ 
                        opacity: 0.7, 
                        fontSize: '12px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        padding: '4px 8px',
                        borderRadius: '6px'
                      }} title={p.author}>
                        {getDisplayName(p.author)}
                      </span>
                      <span style={{ 
                        marginLeft: 'auto',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        color: 'white'
                      }}>
                        🚩 Flagged by AI
                      </span>
                    </div>
                    <div style={{ 
                      whiteSpace: 'pre-wrap', 
                      lineHeight: 1.5,
                      fontSize: '14px',
                      opacity: 0.9
                    }}>
                      {p.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div style={cardStyle}>
        <h3 style={{ 
          fontSize: '1.5rem', 
          fontWeight: 600, 
          marginBottom: '20px',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          💬 All Posts Feed
        </h3>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <button 
            onClick={loadPosts} 
            style={{
              ...buttonStyle,
              padding: '8px 16px',
              fontSize: '12px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
            }}
          >
            🔄 Refresh
          </button>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              ...buttonStyle,
              padding: '8px 16px',
              fontSize: '12px',
              background: 'linear-gradient(135deg, #6b7280, #4b5563)',
              boxShadow: '0 2px 8px rgba(107, 114, 128, 0.3)'
            }}
          >
            ⚡ Hard Refresh
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 600, overflowY: 'auto' }}>
          {posts.filter(p => !p.flagged).map((p) => (
            <div key={String(p.id)} style={{ 
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              padding: '16px', 
              borderRadius: '12px',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ 
                  fontWeight: 700, 
                  fontSize: '14px',
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  #{String(p.id)}
                </span>
                <span style={{ 
                  opacity: 0.7, 
                  fontSize: '12px',
                  background: 'rgba(107, 114, 128, 0.2)',
                  padding: '4px 8px',
                  borderRadius: '6px'
                }} title={p.author}>
                  {getDisplayName(p.author)}
                </span>
                <span style={{ 
                  marginLeft: 'auto',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: 'white'
                }}>
                  ✅ Safe
                </span>
              </div>
              <div style={{ 
                whiteSpace: 'pre-wrap', 
                lineHeight: 1.5,
                fontSize: '14px',
                opacity: 0.9
              }}>
                {p.content}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Event Log Button */}
      <button
        onClick={() => setShowEventLog(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
          color: 'white',
          fontSize: '20px',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
          transition: 'all 0.3s ease',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseOver={(e) => {
          (e.target as HTMLButtonElement).style.transform = 'scale(1.1)';
          (e.target as HTMLButtonElement).style.boxShadow = '0 12px 32px rgba(139, 92, 246, 0.6)';
        }}
        onMouseOut={(e) => {
          (e.target as HTMLButtonElement).style.transform = 'scale(1)';
          (e.target as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(139, 92, 246, 0.4)';
        }}
        title="View Event Log"
      >
        📊
      </button>

      {/* Event Log Modal */}
      {showEventLog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}
        onClick={() => setShowEventLog(false)}
        >
          <div 
            style={{
              ...cardStyle,
              maxWidth: '800px',
              width: '100%',
              maxHeight: '80vh',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 600, 
                margin: 0,
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                📊 Live Event Log
              </h3>
              <button
                onClick={() => setShowEventLog(false)}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#ef4444',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                ✕ Close
              </button>
            </div>
            <div ref={logRef} style={{ 
              maxHeight: '60vh', 
              overflowY: 'auto', 
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              padding: '16px', 
              borderRadius: '12px', 
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace', 
              fontSize: '12px',
              lineHeight: 1.4
            }}>
              {logs.length === 0 ? (
                <div style={{ opacity: 0.5, textAlign: 'center', padding: '40px 0' }}>
                  🔍 Waiting for events...
                  <br />
                  <small style={{ fontSize: '11px', marginTop: '8px', display: 'block' }}>
                    Events will appear here when posts are created or flagged
                  </small>
                </div>
              ) : (
                logs.map((l, i) => (
                  <div key={i} style={{ 
                    marginBottom: '8px',
                    padding: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '6px',
                    borderLeft: '3px solid #8b5cf6'
                  }}>
                    {l}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { motion } from 'framer-motion';

interface TwitterSidebarProps {
  account: string;
  onNavigate: (page: string) => void;
  activePage: string;
  flaggedCount: number;
  onPostClick: () => void;
  onWalletClick: () => void;
}

export default function TwitterSidebar({ 
  account, 
  onNavigate, 
  activePage, 
  flaggedCount,
  onPostClick,
  onWalletClick 
}: TwitterSidebarProps) {
  
  const getInitials = (address: string) => {
    if (!address) return '??';
    return address.slice(2, 4).toUpperCase();
  };

  const navItems = [
    { id: 'home', icon: 'H', label: 'Home' },
    { id: 'flagged', icon: 'F', label: 'Flagged', badge: flaggedCount },
    { id: 'reputation', icon: 'R', label: 'Reputation' },
    { id: 'governance', icon: 'G', label: 'Governance' },
    { id: 'profile', icon: 'P', label: 'Profile' },
  ];

  return (
    <div className="twitter-sidebar">
      {/* Logo */}
      <motion.div 
        className="twitter-logo"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="twitter-logo-text">SOL-AI</div>
      </motion.div>

      {/* Navigation */}
      <nav className="twitter-nav">
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            className={`twitter-nav-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="twitter-nav-icon">{item.icon}</span>
            <span className="twitter-nav-label">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <motion.span 
                className="twitter-nav-badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500 }}
              >
                {item.badge}
              </motion.span>
            )}
          </motion.button>
        ))}
      </nav>

      {/* Post Button */}
      <motion.button
        className="twitter-post-btn"
        onClick={onPostClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="twitter-post-btn-text">Post</span>
        <span className="twitter-post-btn-icon">+</span>
      </motion.button>

      {/* User Menu */}
      <motion.button
        className={`twitter-user-menu ${account ? 'connected' : ''}`}
        onClick={onWalletClick}
        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="twitter-avatar" style={!account ? { background: 'var(--bg-secondary)' } : {}}>
          {account ? getInitials(account) : 'W'}
        </div>
        <div className="twitter-user-info">
          <div className="twitter-user-name">
            {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Connect Wallet'}
          </div>
          <div className="twitter-user-handle">
            {account ? '@user' : 'Not connected'}
          </div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
        </svg>
      </motion.button>
    </div>
  );
}

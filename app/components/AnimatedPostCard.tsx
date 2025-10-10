"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface Post {
  id: bigint;
  author: string;
  content: string;
  flagged: boolean;
  rankingScore?: number;
}

interface AnimatedPostCardProps {
  post: Post;
  index: number;
  getAvatarInitials: (address: string) => string;
  getUserName: (address: string) => string;
}

export default function AnimatedPostCard({
  post,
  index,
  getAvatarInitials,
  getUserName,
}: AnimatedPostCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{
        duration: 0.3,
        delay: index * 0.05, // Stagger effect
        ease: "easeOut",
      }}
      whileHover={{ scale: 1.01 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="post-card"
      style={{
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glassmorphism glow effect on hover */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(124, 58, 237, 0.15), transparent 50%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="post-header">
          <motion.div
            className="post-avatar"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {getAvatarInitials(post.author)}
          </motion.div>
          <div className="post-meta">
            <div className="post-author">
              <span className="author-name">{getUserName(post.author)}</span>
              <motion.span
                className="post-id"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                #{String(post.id)}
              </motion.span>
            </div>
            <div className="post-time">Just now</div>
          </div>
          <div className="post-badges">
            <motion.div
              className={`moderation-badge ${post.flagged ? "flagged" : "safe"}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                delay: 0.3,
              }}
            >
              {post.flagged ? "Flagged" : "Safe"}
            </motion.div>
            {post.rankingScore && (
              <motion.div
                className="ranking-badge"
                title={`Ranking Score: ${post.rankingScore.toFixed(2)}`}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  delay: 0.4,
                }}
              >
                ⭐ {post.rankingScore.toFixed(1)}
              </motion.div>
            )}
          </div>
        </div>

        <motion.div
          className="post-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          {post.content}
        </motion.div>
      </div>
    </motion.article>
  );
}

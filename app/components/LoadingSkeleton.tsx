"use client";

import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export function PostSkeleton() {
  return (
    <div className="post-card">
      <div className="post-header">
        <Skeleton circle width={48} height={48} baseColor="#1a1a2e" highlightColor="#2a2a4e" />
        <div className="post-meta" style={{ flex: 1 }}>
          <Skeleton width={120} height={16} baseColor="#1a1a2e" highlightColor="#2a2a4e" />
          <Skeleton width={80} height={12} baseColor="#1a1a2e" highlightColor="#2a2a4e" style={{ marginTop: 4 }} />
        </div>
        <Skeleton width={60} height={24} borderRadius={12} baseColor="#1a1a2e" highlightColor="#2a2a4e" />
      </div>
      <div className="post-content">
        <Skeleton count={2} baseColor="#1a1a2e" highlightColor="#2a2a4e" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="profile-card">
      <div className="profile-header">
        <Skeleton circle width={64} height={64} baseColor="#1a1a2e" highlightColor="#2a2a4e" />
        <div style={{ flex: 1, marginLeft: 12 }}>
          <Skeleton width={100} height={20} baseColor="#1a1a2e" highlightColor="#2a2a4e" />
          <Skeleton width={80} height={14} baseColor="#1a1a2e" highlightColor="#2a2a4e" style={{ marginTop: 4 }} />
        </div>
      </div>
      <div className="profile-stats" style={{ marginTop: 16 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="stat">
            <Skeleton width={40} height={24} baseColor="#1a1a2e" highlightColor="#2a2a4e" />
            <Skeleton width={50} height={12} baseColor="#1a1a2e" highlightColor="#2a2a4e" style={{ marginTop: 4 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="ai-status-card">
      <div className="status-header">
        <Skeleton width={180} height={20} baseColor="#1a1a2e" highlightColor="#2a2a4e" />
      </div>
      <div className="status-content">
        <Skeleton height={60} baseColor="#1a1a2e" highlightColor="#2a2a4e" style={{ marginBottom: 16 }} />
        <Skeleton count={3} height={40} baseColor="#1a1a2e" highlightColor="#2a2a4e" style={{ marginBottom: 8 }} />
      </div>
    </div>
  );
}

import { motion } from 'framer-motion';

export function TwitterLoadingSpinner() {
  return (
    <div className="twitter-loading">
      <div className="twitter-spinner" />
    </div>
  );
}

export function TwitterPostSkeleton() {
  return (
    <div className="twitter-tweet" style={{ opacity: 0.6 }}>
      <div className="twitter-tweet-content">
        {/* Avatar Skeleton */}
        <motion.div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--surface-2)',
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />

        {/* Content Skeleton */}
        <div style={{ flex: 1 }}>
          {/* Header */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <motion.div
              style={{
                width: '120px',
                height: '16px',
                borderRadius: '4px',
                background: 'var(--surface-2)',
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              style={{
                width: '80px',
                height: '16px',
                borderRadius: '4px',
                background: 'var(--surface-2)',
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            />
          </div>

          {/* Text Lines */}
          <motion.div
            style={{
              width: '100%',
              height: '16px',
              borderRadius: '4px',
              background: 'var(--surface-2)',
              marginBottom: '8px',
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
          />
          <motion.div
            style={{
              width: '80%',
              height: '16px',
              borderRadius: '4px',
              background: 'var(--surface-2)',
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </div>
    </div>
  );
}

export function TwitterEmptyState({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '60px 20px',
        textAlign: 'center',
        color: 'var(--color-text-secondary)',
      }}
    >
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
      <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--color-text-primary)' }}>
        Nothing to see here
      </div>
      <div style={{ fontSize: '15px' }}>{message}</div>
    </motion.div>
  );
}

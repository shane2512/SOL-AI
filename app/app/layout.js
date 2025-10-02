export const metadata = { title: 'Somnia AI Moderation' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ 
        fontFamily: 'Inter, system-ui, sans-serif', 
        margin: 0, 
        background: 'linear-gradient(135deg, #0f1419 0%, #1a1f2e 50%, #0f1419 100%)',
        minHeight: '100vh',
        color: '#e6edf3'
      }}>
        <div style={{ 
          maxWidth: 1200, 
          margin: '0 auto', 
          padding: '32px 24px',
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(10px)',
          borderRadius: '24px',
          marginTop: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ 
              fontSize: '2.5rem', 
              fontWeight: 700, 
              background: 'linear-gradient(135deg, #00d4ff 0%, #7c3aed 50%, #f59e0b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '12px'
            }}>
              🛡️ AI Social Moderator
            </h1>
            <p style={{ 
              opacity: 0.8, 
              fontSize: '1.1rem',
              background: 'linear-gradient(90deg, #64748b, #94a3b8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Somnia Testnet • Decentralized • Transparent • AI-Powered
            </p>
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}

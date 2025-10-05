import AgentStatus from '../components/AgentStatus';
import './globals.css';

export const metadata = { 
  title: 'SOL AI - Decentralized Social Media',
  description: 'AI-powered content moderation on blockchain'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <AgentStatus />
      </body>
    </html>
  );
}

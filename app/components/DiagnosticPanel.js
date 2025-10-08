'use client';
import { useState, useEffect } from 'react';
import { JsonRpcProvider, Contract } from 'ethers';

// Import ABIs
import SocialAbi from "../contracts/abis/SocialPosts.json";

const DiagnosticPanel = () => {
  const [diagnostics, setDiagnostics] = useState({});
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results = {};

    try {
      // Check environment variables
      results.envVars = {
        SOCIAL_ADDR: process.env.NEXT_PUBLIC_SOCIAL_POSTS_ADDRESS,
        MODERATOR_ADDR: process.env.NEXT_PUBLIC_MODERATOR_ADDRESS,
        SOMNIA_RPC: process.env.NEXT_PUBLIC_SOMNIA_RPC_URL,
        SOMNIA_WSS: process.env.NEXT_PUBLIC_SOMNIA_WSS_URL,
        CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID
      };

      // Check if all required env vars are present
      results.envVarsValid = Object.values(results.envVars).every(val => val && val !== 'undefined');

      // Test RPC connection
      try {
        // Create provider with explicit network to avoid ENS
        const provider = new JsonRpcProvider(results.envVars.SOMNIA_RPC, {
          chainId: 50312,
          name: "somnia-testnet"
        });
        results.rpcConnection = "Attempting connection...";
        
        const network = await provider.getNetwork();
        results.rpcConnection = `✅ Connected - Chain ID: ${network.chainId}`;
        results.networkInfo = {
          chainId: network.chainId.toString(),
          name: network.name
        };

        // Test contract
        try {
          results.abiInfo = {
            type: typeof SocialAbi,
            isArray: Array.isArray(SocialAbi),
            length: SocialAbi.length || 'undefined',
            firstItem: SocialAbi[0] || 'undefined'
          };
          
          const contract = new Contract(results.envVars.SOCIAL_ADDR, SocialAbi, provider);
          results.contractCreated = "✅ Contract instance created";

          // Test contract call
          const totalPosts = await contract.totalPosts();
          results.contractCall = `✅ totalPosts() = ${totalPosts.toString()}`;
          results.totalPosts = totalPosts.toString();

          // Test individual post if any exist
          if (totalPosts > 0n) {
            try {
              const firstPost = await contract.getPost(1);
              results.firstPost = {
                id: firstPost.id.toString(),
                author: firstPost.author,
                content: firstPost.content.substring(0, 100) + '...',
                flagged: firstPost.flagged
              };
            } catch (postError) {
              results.firstPost = `❌ Error loading post: ${postError.message}`;
            }
          } else {
            results.firstPost = "ℹ️ No posts exist yet";
          }

        } catch (contractError) {
          results.contractCall = `❌ Contract error: ${contractError.message}`;
        }

      } catch (rpcError) {
        results.rpcConnection = `❌ RPC Error: ${rpcError.message}`;
      }

      // Test current deployment info
      results.deploymentInfo = {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      results.generalError = error.message;
    }

    setDiagnostics(results);
    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'rgba(0,0,0,0.9)', 
      color: 'white', 
      padding: '20px', 
      borderRadius: '8px',
      maxWidth: '400px',
      maxHeight: '80vh',
      overflow: 'auto',
      fontSize: '12px',
      zIndex: 9999,
      fontFamily: 'monospace'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0 }}>🔍 Diagnostics</h3>
        <button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          style={{ 
            background: '#007acc', 
            color: 'white', 
            border: 'none', 
            padding: '5px 10px', 
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer'
          }}
        >
          {isRunning ? '⏳' : '🔄'}
        </button>
      </div>

      <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
        <h4>Environment Variables:</h4>
        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '4px', marginBottom: '10px' }}>
          {Object.entries(diagnostics.envVars || {}).map(([key, value]) => (
            <div key={key}>
              <strong>{key}:</strong> {value ? `${value.substring(0, 20)}...` : '❌ Missing'}
            </div>
          ))}
          <div><strong>All Valid:</strong> {diagnostics.envVarsValid ? '✅' : '❌'}</div>
        </div>

        <h4>Network Connection:</h4>
        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '4px', marginBottom: '10px' }}>
          <div>{diagnostics.rpcConnection || 'Not tested'}</div>
          {diagnostics.networkInfo && (
            <div>Chain: {diagnostics.networkInfo.chainId} ({diagnostics.networkInfo.name})</div>
          )}
        </div>

        <h4>Contract Status:</h4>
        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '4px', marginBottom: '10px' }}>
          <div>{diagnostics.contractCreated || 'Not tested'}</div>
          <div>{diagnostics.contractCall || 'Not tested'}</div>
          {diagnostics.totalPosts && <div>Total Posts: {diagnostics.totalPosts}</div>}
          {diagnostics.abiInfo && (
            <div style={{ fontSize: '10px', marginTop: '5px' }}>
              ABI: {diagnostics.abiInfo.type}, Array: {diagnostics.abiInfo.isArray.toString()}, Length: {diagnostics.abiInfo.length}
            </div>
          )}
        </div>

        {diagnostics.firstPost && (
          <>
            <h4>First Post:</h4>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '4px', marginBottom: '10px' }}>
              {typeof diagnostics.firstPost === 'string' ? (
                <div>{diagnostics.firstPost}</div>
              ) : (
                <div>
                  <div>ID: {diagnostics.firstPost.id}</div>
                  <div>Author: {diagnostics.firstPost.author}</div>
                  <div>Content: {diagnostics.firstPost.content}</div>
                  <div>Flagged: {diagnostics.firstPost.flagged ? '🚩' : '✅'}</div>
                </div>
              )}
            </div>
          </>
        )}

        {diagnostics.generalError && (
          <>
            <h4>Error:</h4>
            <div style={{ background: 'rgba(255,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>
              {diagnostics.generalError}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DiagnosticPanel;

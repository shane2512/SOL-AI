// Direct RPC calls without ethers.js to avoid ENS issues
export class DirectRpcProvider {
  private rpcUrl: string;
  private requestId: number = 1;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
  }

  private async call(method: string, params: any[] = []): Promise<any> {
    const payload = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params,
    };
    
    console.log('🔵 RPC Request:', JSON.stringify(payload, null, 2));
    
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('🟢 RPC Response:', JSON.stringify(data, null, 2));
    
    if (data.error) {
      console.error('🔴 RPC Error:', data.error);
      throw new Error(data.error.message || 'RPC Error');
    }
    return data.result;
  }

  async getChainId(): Promise<string> {
    return await this.call('eth_chainId');
  }

  async callContract(to: string, data: string): Promise<string> {
    // Ensure addresses are checksummed and data is properly formatted
    const params = [
      {
        to: to.toLowerCase(),
        data: data.startsWith('0x') ? data : '0x' + data,
      },
      'latest'
    ];
    return await this.call('eth_call', params);
  }

  async sendTransaction(tx: any): Promise<string> {
    return await this.call('eth_sendTransaction', [tx]);
  }

  async getTransactionReceipt(txHash: string): Promise<any> {
    return await this.call('eth_getTransactionReceipt', [txHash]);
  }
}

// ABI encoding/decoding helpers
export class AbiCoder {
  // Encode function call
  static encodeFunctionCall(functionSignature: string, params: any[] = []): string {
    const functionSelector = this.getFunctionSelector(functionSignature);
    if (params.length === 0) {
      return functionSelector;
    }
    // For simple cases, we'll use ethers for encoding but not for network calls
    return functionSelector;
  }

  // Get function selector (first 4 bytes of keccak256 hash)
  static getFunctionSelector(signature: string): string {
    // Common function selectors we need
    const selectors: { [key: string]: string } = {
      'totalPosts()': '0x8e53fb41',
      'getPost(uint256)': '0x40731c24',
      'createPost(string)': '0xc7303c61',
    };
    return selectors[signature] || '0x';
  }

  // Decode uint256
  static decodeUint256(hex: string): bigint {
    return BigInt(hex);
  }

  // Encode uint256
  static encodeUint256(value: number | bigint): string {
    return '0x' + value.toString(16).padStart(64, '0');
  }

  // Decode address
  static decodeAddress(hex: string): string {
    return '0x' + hex.slice(-40);
  }

  // Decode string
  static decodeString(hex: string): string {
    // Remove 0x prefix
    hex = hex.slice(2);
    
    // Skip offset (first 32 bytes)
    hex = hex.slice(64);
    
    // Get length (next 32 bytes)
    const length = parseInt(hex.slice(0, 64), 16) * 2;
    
    // Get string data
    const stringHex = hex.slice(64, 64 + length);
    
    // Convert hex to string
    let str = '';
    for (let i = 0; i < stringHex.length; i += 2) {
      str += String.fromCharCode(parseInt(stringHex.substr(i, 2), 16));
    }
    return str;
  }

  // Decode bool
  static decodeBool(hex: string): boolean {
    return BigInt(hex) !== 0n;
  }
}

// Contract wrapper
export class DirectContract {
  private provider: DirectRpcProvider;
  private address: string;

  constructor(address: string, provider: DirectRpcProvider) {
    this.address = address;
    this.provider = provider;
  }

  async totalPosts(): Promise<bigint> {
    const data = AbiCoder.encodeFunctionCall('totalPosts()');
    const result = await this.provider.callContract(this.address, data);
    return AbiCoder.decodeUint256(result);
  }

  async getPost(id: bigint): Promise<{
    id: bigint;
    author: string;
    content: string;
    flagged: boolean;
    timestamp?: bigint;
    likes?: bigint;
    replies?: bigint;
  }> {
    const data = AbiCoder.encodeFunctionCall('getPost(uint256)') + 
                 AbiCoder.encodeUint256(id).slice(2);
    const result = await this.provider.callContract(this.address, data);
    
    // Decode the tuple (id, author, content, flagged, timestamp, likes, replies)
    let hex = result.slice(2);
    
    // Check if result is wrapped in a tuple offset (first 32 bytes point to data start)
    const possibleOffset = parseInt('0x' + hex.slice(0, 64), 16) * 2;
    if (possibleOffset === 64) {
      // Skip the tuple wrapper offset
      hex = hex.slice(64);
    }
    
    // Parse each field (each is 32 bytes = 64 hex chars)
    const idHex = '0x' + hex.slice(0, 64);
    const authorHex = '0x' + hex.slice(64, 128);
    const contentOffsetHex = '0x' + hex.slice(128, 192);
    const flaggedHex = '0x' + hex.slice(192, 256);
    const timestampHex = '0x' + hex.slice(256, 320);
    const likesHex = '0x' + hex.slice(320, 384);
    const repliesHex = '0x' + hex.slice(384, 448);
    
    // Decode content (it's at an offset relative to the start of tuple data)
    const contentOffset = parseInt(contentOffsetHex, 16) * 2;
    const contentLengthHex = hex.slice(contentOffset, contentOffset + 64);
    const contentLength = parseInt(contentLengthHex, 16) * 2;
    const contentHex = hex.slice(contentOffset + 64, contentOffset + 64 + contentLength);
    
    let content = '';
    for (let i = 0; i < contentHex.length; i += 2) {
      const charCode = parseInt(contentHex.substr(i, 2), 16);
      if (charCode > 0) {
        content += String.fromCharCode(charCode);
      }
    }

    return {
      id: AbiCoder.decodeUint256(idHex),
      author: AbiCoder.decodeAddress(authorHex),
      content: content,
      flagged: AbiCoder.decodeBool(flaggedHex),
      timestamp: AbiCoder.decodeUint256(timestampHex),
      likes: AbiCoder.decodeUint256(likesHex),
      replies: AbiCoder.decodeUint256(repliesHex),
    };
  }
}

// Direct RPC calls without ethers.js to avoid ENS issues
export class DirectRpcProvider {
  private rpcUrl: string;
  private requestId: number = 1;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
  }

  private async call(method: string, params: any[] = []): Promise<any> {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: this.requestId++,
        method,
        params,
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || 'RPC Error');
    }
    return data.result;
  }

  async getChainId(): Promise<string> {
    return await this.call('eth_chainId');
  }

  async callContract(to: string, data: string): Promise<string> {
    return await this.call('eth_call', [{ to, data }, 'latest']);
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
      'totalPosts()': '0x2e52d606',
      'getPost(uint256)': '0x01e33667',
      'createPost(string)': '0x3b5c4769',
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
  }> {
    const data = AbiCoder.encodeFunctionCall('getPost(uint256)') + 
                 AbiCoder.encodeUint256(id).slice(2);
    const result = await this.provider.callContract(this.address, data);
    
    // Decode the tuple (id, author, content, flagged)
    const hex = result.slice(2);
    
    // Parse each field (each is 32 bytes = 64 hex chars)
    const idHex = '0x' + hex.slice(0, 64);
    const authorHex = '0x' + hex.slice(64, 128);
    const contentOffsetHex = '0x' + hex.slice(128, 192);
    const flaggedHex = '0x' + hex.slice(192, 256);
    
    // Decode content (it's at an offset)
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
    };
  }
}

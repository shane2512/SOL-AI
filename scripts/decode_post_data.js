// Decode the post data from the RPC response to see the actual values
const testData = "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000da4626fce97748b7a78b613c754419c5e3fdadca00000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000876616e616b6b616d000000000000000000000000000000000000000000000000";

const hex = testData.slice(2);

// Parse each field (each is 32 bytes = 64 hex chars)
const idHex = '0x' + hex.slice(0, 64);
const authorHex = '0x' + hex.slice(64, 128);
const contentOffsetHex = '0x' + hex.slice(128, 192);
const flaggedHex = '0x' + hex.slice(192, 256);
const timestampHex = '0x' + hex.slice(256, 320);
const likesHex = '0x' + hex.slice(320, 384);
const repliesHex = '0x' + hex.slice(384, 448);

console.log('Decoded Post Data:');
console.log('ID:', parseInt(idHex, 16));
console.log('Author:', '0x' + authorHex.slice(-40));
console.log('Content Offset:', parseInt(contentOffsetHex, 16));
console.log('Flagged (raw):', flaggedHex);
console.log('Flagged (bool):', parseInt(flaggedHex, 16) !== 0);
console.log('Timestamp:', parseInt(timestampHex, 16));
console.log('Likes:', parseInt(likesHex, 16));
console.log('Replies:', parseInt(repliesHex, 16));

// Decode content
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

console.log('Content:', content);
console.log('\n✅ Post is', parseInt(flaggedHex, 16) !== 0 ? 'FLAGGED' : 'SAFE');

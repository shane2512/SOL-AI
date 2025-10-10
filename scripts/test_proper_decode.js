// Test proper decoding based on Solidity ABI encoding rules
// getPost returns: (uint256 id, address author, string content, bool flagged, uint256 timestamp, uint256 likes, uint256 replies)

const testData = "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000da4626fce97748b7a78b613c754419c5e3fdadca00000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000876616e616b6b616d000000000000000000000000000000000000000000000000";

const hex = testData.slice(2);

console.log('Total hex length:', hex.length);
console.log('Expected fields: id, author, contentOffset, flagged, timestamp, likes, replies');
console.log('');

// When a function returns a tuple, it's wrapped in an extra offset
const tupleOffset = parseInt('0x' + hex.slice(0, 64), 16) * 2;
console.log('Tuple offset:', tupleOffset);

// Start reading from the tuple offset
const data = hex.slice(tupleOffset);

// Now decode: id, author, contentOffset, flagged, timestamp, likes, replies
const id = parseInt('0x' + data.slice(0, 64), 16);
const author = '0x' + data.slice(64 + 24, 128); // address is last 20 bytes
const contentOffset = parseInt('0x' + data.slice(128, 192), 16) * 2;
const flagged = parseInt('0x' + data.slice(192, 256), 16) !== 0;
const timestamp = parseInt('0x' + data.slice(256, 320), 16);
const likes = parseInt('0x' + data.slice(320, 384), 16);
const replies = parseInt('0x' + data.slice(384, 448), 16);

console.log('ID:', id);
console.log('Author:', author);
console.log('Content Offset:', contentOffset);
console.log('Flagged:', flagged);
console.log('Timestamp:', timestamp);
console.log('Likes:', likes);
console.log('Replies:', replies);

// Decode content at offset (relative to start of tuple data)
const contentLengthHex = data.slice(contentOffset, contentOffset + 64);
const contentLength = parseInt('0x' + contentLengthHex, 16) * 2;
const contentHex = data.slice(contentOffset + 64, contentOffset + 64 + contentLength);

let content = '';
for (let i = 0; i < contentHex.length; i += 2) {
  const charCode = parseInt(contentHex.substr(i, 2), 16);
  if (charCode > 0) {
    content += String.fromCharCode(charCode);
  }
}

console.log('Content:', content);
console.log('\n✅ Post is', flagged ? 'FLAGGED ⚠️' : 'SAFE ✅');

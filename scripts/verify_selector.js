const { ethers } = require('ethers');

// Calculate the correct function selector
const iface = new ethers.utils.Interface([
  'function totalPosts() view returns (uint256)',
  'function getPost(uint256) view returns (uint256, address, string, bool, uint256, uint256, uint256)',
  'function createPost(string)'
]);

console.log('Function Selectors:');
console.log('totalPosts():', iface.getSighash('totalPosts'));
console.log('getPost(uint256):', iface.getSighash('getPost'));
console.log('createPost(string):', iface.getSighash('createPost'));

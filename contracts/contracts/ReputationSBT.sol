// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ReputationSystem.sol";

contract ReputationSBT is ERC721, Ownable {
    ReputationSystem public reputationSystem;
    
    mapping(address => uint256) public userTokens; // user => tokenId
    mapping(uint256 => uint256) public tokenTiers; // tokenId => tier
    mapping(uint256 => string) public tierMetadata; // tier => metadata URI
    
    uint256 private _tokenIdCounter = 1;
    
    event SBTMinted(address indexed user, uint256 indexed tokenId, uint256 tier);
    event SBTUpgraded(address indexed user, uint256 indexed tokenId, uint256 oldTier, uint256 newTier);
    
    constructor(address _reputationSystem) ERC721("SOL AI Reputation", "SOLREP") Ownable(msg.sender) {
        reputationSystem = ReputationSystem(_reputationSystem);
        
        // Set default metadata URIs for tiers
        tierMetadata[0] = "ipfs://QmBronzeTier"; // Bronze
        tierMetadata[1] = "ipfs://QmSilverTier"; // Silver
        tierMetadata[2] = "ipfs://QmGoldTier";   // Gold
        tierMetadata[3] = "ipfs://QmPlatinumTier"; // Platinum
    }
    
    function mintOrUpgradeSBT(address user) external {
        uint256 currentTier = reputationSystem.getUserTier(user);
        uint256 existingTokenId = userTokens[user];
        
        if (existingTokenId == 0) {
            // Mint new SBT
            uint256 tokenId = _tokenIdCounter++;
            _mint(user, tokenId);
            
            userTokens[user] = tokenId;
            tokenTiers[tokenId] = currentTier;
            
            emit SBTMinted(user, tokenId, currentTier);
        } else {
            // Upgrade existing SBT
            uint256 oldTier = tokenTiers[existingTokenId];
            if (currentTier > oldTier) {
                tokenTiers[existingTokenId] = currentTier;
                emit SBTUpgraded(user, existingTokenId, oldTier, currentTier);
            }
        }
    }
    
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        uint256 tier = tokenTiers[tokenId];
        return tierMetadata[tier];
    }
    
    function getUserSBT(address user) external view returns (uint256 tokenId, uint256 tier) {
        tokenId = userTokens[user];
        if (tokenId != 0) {
            tier = tokenTiers[tokenId];
        }
    }
    
    function setTierMetadata(uint256 tier, string memory metadataURI) external onlyOwner {
        require(tier <= 3, "Invalid tier");
        tierMetadata[tier] = metadataURI;
    }
    
    // Override transfer functions to make tokens soulbound (non-transferable)
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0)) but prevent transfers
        require(from == address(0), "Soulbound tokens cannot be transferred");
        
        return super._update(to, tokenId, auth);
    }
    
    function approve(address, uint256) public pure override {
        revert("Soulbound tokens cannot be approved");
    }
    
    function setApprovalForAll(address, bool) public pure override {
        revert("Soulbound tokens cannot be approved");
    }
    
    function transferFrom(address, address, uint256) public pure override {
        revert("Soulbound tokens cannot be transferred");
    }
    
    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("Soulbound tokens cannot be transferred");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SocialPosts.sol";

contract ReputationSystem is Ownable {
    ISocialPosts public socialPosts;
    
    struct UserReputation {
        uint256 score;
        uint256 totalPosts;
        uint256 safePosts;
        uint256 flaggedPosts;
        uint256 lastUpdated;
        uint256 tier; // 0: Bronze, 1: Silver, 2: Gold, 3: Platinum
    }
    
    mapping(address => UserReputation) public userReputations;
    mapping(uint256 => uint256) public tierThresholds; // tier => min score
    
    // Reputation scoring constants
    uint256 public constant BASE_POINTS_PER_POST = 1;
    uint256 public constant MAX_BASE_POINTS = 50;
    uint256 public constant SAFE_POST_BONUS = 2;
    uint256 public constant MAX_SAFE_BONUS = 40;
    uint256 public constant FLAGGED_POST_PENALTY = 5;
    uint256 public constant MAX_SAFETY_BONUS = 10;
    
    event ReputationUpdated(address indexed user, uint256 newScore, uint256 newTier);
    event TierUpgraded(address indexed user, uint256 oldTier, uint256 newTier);
    
    constructor(address _socialPosts) Ownable(msg.sender) {
        socialPosts = ISocialPosts(_socialPosts);
        
        // Set tier thresholds
        tierThresholds[0] = 0;   // Bronze: 0-24
        tierThresholds[1] = 25;  // Silver: 25-49
        tierThresholds[2] = 50;  // Gold: 50-74
        tierThresholds[3] = 75;  // Platinum: 75+
    }
    
    function calculateReputation(address user) public view returns (uint256) {
        uint256 totalPosts = socialPosts.getUserPostCount(user);
        uint256 safePosts = socialPosts.getUserSafePostCount(user);
        uint256 flaggedPosts = socialPosts.getUserFlaggedPostCount(user);
        
        if (totalPosts == 0) return 0;
        
        // Base points (1 per post, max 50)
        uint256 basePoints = totalPosts > MAX_BASE_POINTS ? MAX_BASE_POINTS : totalPosts;
        
        // Safe post bonus (2 per safe post, max 40)
        uint256 safeBonus = safePosts * SAFE_POST_BONUS;
        if (safeBonus > MAX_SAFE_BONUS) safeBonus = MAX_SAFE_BONUS;
        
        // Flagged post penalty (5 per flagged post)
        uint256 flaggedPenalty = flaggedPosts * FLAGGED_POST_PENALTY;
        
        // Safety ratio bonus (up to 10 points for 100% safe posts)
        uint256 safetyRatio = (safePosts * 100) / totalPosts;
        uint256 safetyBonus = (safetyRatio * MAX_SAFETY_BONUS) / 100;
        
        // Calculate total score
        uint256 totalScore = basePoints + safeBonus + safetyBonus;
        
        // Apply penalty (ensure no underflow)
        if (totalScore > flaggedPenalty) {
            totalScore -= flaggedPenalty;
        } else {
            totalScore = 0;
        }
        
        // Cap at 100
        return totalScore > 100 ? 100 : totalScore;
    }
    
    function updateReputation(address user) external {
        uint256 newScore = calculateReputation(user);
        uint256 oldTier = userReputations[user].tier;
        uint256 newTier = getTierFromScore(newScore);
        
        userReputations[user] = UserReputation({
            score: newScore,
            totalPosts: socialPosts.getUserPostCount(user),
            safePosts: socialPosts.getUserSafePostCount(user),
            flaggedPosts: socialPosts.getUserFlaggedPostCount(user),
            lastUpdated: block.timestamp,
            tier: newTier
        });
        
        emit ReputationUpdated(user, newScore, newTier);
        
        if (newTier > oldTier) {
            emit TierUpgraded(user, oldTier, newTier);
        }
    }
    
    function getTierFromScore(uint256 score) public view returns (uint256) {
        if (score >= tierThresholds[3]) return 3; // Platinum
        if (score >= tierThresholds[2]) return 2; // Gold
        if (score >= tierThresholds[1]) return 1; // Silver
        return 0; // Bronze
    }
    
    function getTierName(uint256 tier) public pure returns (string memory) {
        if (tier == 3) return "Platinum";
        if (tier == 2) return "Gold";
        if (tier == 1) return "Silver";
        return "Bronze";
    }
    
    function getUserReputation(address user) external view returns (UserReputation memory) {
        return userReputations[user];
    }
    
    function getReputationScore(address user) external view returns (uint256) {
        return calculateReputation(user);
    }
    
    function getUserTier(address user) external view returns (uint256) {
        uint256 score = calculateReputation(user);
        return getTierFromScore(score);
    }
    
    function setTierThreshold(uint256 tier, uint256 threshold) external onlyOwner {
        require(tier <= 3, "Invalid tier");
        tierThresholds[tier] = threshold;
    }
}

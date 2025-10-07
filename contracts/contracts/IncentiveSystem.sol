// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ReputationSystem.sol";
import "./SocialPosts.sol";

contract SOLToken is ERC20, Ownable {
    constructor() ERC20("SOL AI Token", "SOLAI") Ownable(msg.sender) {
        _mint(msg.sender, 1000000 * 10**decimals()); // 1M initial supply
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

contract IncentiveSystem is Ownable {
    SOLToken public solToken;
    ReputationSystem public reputationSystem;
    ISocialPosts public socialPosts;
    
    // Reward rates (in wei, 18 decimals)
    uint256 public baseRewardPerPost = 1 * 10**18; // 1 SOLAI per safe post
    uint256 public tierMultiplier = 50; // 50% bonus per tier level
    uint256 public engagementReward = 0.1 * 10**18; // 0.1 SOLAI per like/reply
    
    // Anti-Sybil measures
    mapping(address => uint256) public lastRewardTime;
    mapping(address => uint256) public dailyRewardCount;
    mapping(address => uint256) public lastRewardDay;
    uint256 public maxDailyRewards = 10;
    uint256 public minTimeBetweenRewards = 300; // 5 minutes
    
    // Tracking
    mapping(address => uint256) public totalRewardsEarned;
    mapping(address => uint256) public lastProcessedPost;
    
    event RewardClaimed(address indexed user, uint256 amount, string reason);
    event EngagementReward(address indexed user, uint256 amount, uint256 postId);
    
    constructor(
        address _solToken,
        address _reputationSystem,
        address _socialPosts
    ) Ownable(msg.sender) {
        solToken = SOLToken(_solToken);
        reputationSystem = ReputationSystem(_reputationSystem);
        socialPosts = ISocialPosts(_socialPosts);
    }
    
    function claimPostRewards() external {
        address user = msg.sender;
        require(canClaimReward(user), "Cannot claim reward yet");
        
        uint256[] memory userPosts = socialPosts.getUserPosts(user);
        uint256 lastProcessed = lastProcessedPost[user];
        uint256 rewardAmount = 0;
        uint256 processedCount = 0;
        
        // Process new posts since last claim
        for (uint256 i = lastProcessed; i < userPosts.length && processedCount < maxDailyRewards; i++) {
            (, , , bool flagged, , , ) = socialPosts.getPost(userPosts[i]);
            
            if (!flagged) {
                uint256 reward = calculatePostReward(user);
                rewardAmount += reward;
                processedCount++;
            }
        }
        
        if (rewardAmount > 0) {
            // Update tracking
            lastProcessedPost[user] = userPosts.length;
            updateRewardLimits(user, processedCount);
            totalRewardsEarned[user] += rewardAmount;
            
            // Mint and transfer rewards
            solToken.mint(user, rewardAmount);
            emit RewardClaimed(user, rewardAmount, "Post rewards");
        }
    }
    
    function claimEngagementReward(uint256 postId) external {
        require(canClaimReward(msg.sender), "Cannot claim reward yet");
        
        (, , , bool flagged, , , ) = socialPosts.getPost(postId);
        require(!flagged, "Cannot reward engagement on flagged posts");
        
        uint256 reward = engagementReward;
        uint256 userTier = reputationSystem.getUserTier(msg.sender);
        
        // Apply tier multiplier
        reward += (reward * userTier * tierMultiplier) / 100;
        
        updateRewardLimits(msg.sender, 1);
        totalRewardsEarned[msg.sender] += reward;
        
        solToken.mint(msg.sender, reward);
        emit EngagementReward(msg.sender, reward, postId);
    }
    
    function calculatePostReward(address user) public view returns (uint256) {
        uint256 baseReward = baseRewardPerPost;
        uint256 userTier = reputationSystem.getUserTier(user);
        
        // Apply tier multiplier: Bronze=0%, Silver=50%, Gold=100%, Platinum=150%
        uint256 bonus = (baseReward * userTier * tierMultiplier) / 100;
        
        return baseReward + bonus;
    }
    
    function canClaimReward(address user) public view returns (bool) {
        // Check time limits
        if (block.timestamp < lastRewardTime[user] + minTimeBetweenRewards) {
            return false;
        }
        
        // Check daily limits
        uint256 currentDay = block.timestamp / 86400; // seconds per day
        if (currentDay == lastRewardDay[user] && dailyRewardCount[user] >= maxDailyRewards) {
            return false;
        }
        
        return true;
    }
    
    function updateRewardLimits(address user, uint256 rewardCount) internal {
        uint256 currentDay = block.timestamp / 86400;
        
        if (currentDay != lastRewardDay[user]) {
            // New day, reset counter
            dailyRewardCount[user] = rewardCount;
            lastRewardDay[user] = currentDay;
        } else {
            // Same day, increment counter
            dailyRewardCount[user] += rewardCount;
        }
        
        lastRewardTime[user] = block.timestamp;
    }
    
    function getRewardInfo(address user) external view returns (
        uint256 pendingRewards,
        uint256 nextClaimTime,
        uint256 dailyRewardsLeft,
        uint256 totalEarned
    ) {
        // Calculate pending rewards
        uint256[] memory userPosts = socialPosts.getUserPosts(user);
        uint256 lastProcessed = lastProcessedPost[user];
        
        for (uint256 i = lastProcessed; i < userPosts.length; i++) {
            (, , , bool flagged, , , ) = socialPosts.getPost(userPosts[i]);
            if (!flagged) {
                pendingRewards += calculatePostReward(user);
            }
        }
        
        // Calculate next claim time
        nextClaimTime = lastRewardTime[user] + minTimeBetweenRewards;
        if (nextClaimTime < block.timestamp) {
            nextClaimTime = block.timestamp;
        }
        
        // Calculate daily rewards left
        uint256 currentDay = block.timestamp / 86400;
        if (currentDay == lastRewardDay[user]) {
            dailyRewardsLeft = maxDailyRewards > dailyRewardCount[user] 
                ? maxDailyRewards - dailyRewardCount[user] 
                : 0;
        } else {
            dailyRewardsLeft = maxDailyRewards;
        }
        
        totalEarned = totalRewardsEarned[user];
    }
    
    // Admin functions
    function setRewardRates(
        uint256 _baseRewardPerPost,
        uint256 _tierMultiplier,
        uint256 _engagementReward
    ) external onlyOwner {
        baseRewardPerPost = _baseRewardPerPost;
        tierMultiplier = _tierMultiplier;
        engagementReward = _engagementReward;
    }
    
    function setAntiSybilLimits(
        uint256 _maxDailyRewards,
        uint256 _minTimeBetweenRewards
    ) external onlyOwner {
        maxDailyRewards = _maxDailyRewards;
        minTimeBetweenRewards = _minTimeBetweenRewards;
    }
}

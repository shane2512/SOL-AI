// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ReputationSystem.sol";
import "./SocialPosts.sol";

contract GovernanceSystem is Ownable {
    ReputationSystem public reputationSystem;
    ISocialPosts public socialPosts;
    
    struct Appeal {
        uint256 postId;
        address appellant;
        string reason;
        uint256 createdAt;
        uint256 votingEnds;
        bool resolved;
        bool upheld; // true if appeal successful
        uint256 totalVotes;
        uint256 yesVotes;
        uint256 noVotes;
    }
    
    struct Vote {
        bool hasVoted;
        bool vote; // true for yes, false for no
        uint256 weight; // voting weight based on reputation
    }
    
    mapping(uint256 => Appeal) public appeals; // appealId => Appeal
    mapping(uint256 => mapping(address => Vote)) public votes; // appealId => voter => Vote
    mapping(uint256 => bool) public postAppealed; // postId => appealed
    
    uint256 public appealCounter;
    uint256 public votingPeriod = 3 days;
    uint256 public minReputationToVote = 25; // Silver tier minimum
    uint256 public quorumPercentage = 20; // 20% of eligible voters
    
    event AppealCreated(uint256 indexed appealId, uint256 indexed postId, address indexed appellant);
    event VoteCast(uint256 indexed appealId, address indexed voter, bool vote, uint256 weight);
    event AppealResolved(uint256 indexed appealId, bool upheld, uint256 totalVotes);
    event PostUnflagged(uint256 indexed postId, uint256 indexed appealId);
    
    constructor(address _reputationSystem, address _socialPosts) Ownable(msg.sender) {
        reputationSystem = ReputationSystem(_reputationSystem);
        socialPosts = ISocialPosts(_socialPosts);
    }
    
    function createAppeal(uint256 postId, string memory reason) external {
        (, address author, , bool flagged, , , ) = socialPosts.getPost(postId);
        require(flagged, "Post is not flagged");
        require(author == msg.sender, "Only post author can appeal");
        require(!postAppealed[postId], "Post already appealed");
        require(bytes(reason).length > 0, "Reason required");
        
        appealCounter++;
        uint256 appealId = appealCounter;
        
        appeals[appealId] = Appeal({
            postId: postId,
            appellant: msg.sender,
            reason: reason,
            createdAt: block.timestamp,
            votingEnds: block.timestamp + votingPeriod,
            resolved: false,
            upheld: false,
            totalVotes: 0,
            yesVotes: 0,
            noVotes: 0
        });
        
        postAppealed[postId] = true;
        
        emit AppealCreated(appealId, postId, msg.sender);
    }
    
    function vote(uint256 appealId, bool voteChoice) external {
        Appeal storage appeal = appeals[appealId];
        require(!appeal.resolved, "Appeal already resolved");
        require(block.timestamp <= appeal.votingEnds, "Voting period ended");
        require(!votes[appealId][msg.sender].hasVoted, "Already voted");
        
        uint256 voterReputation = reputationSystem.getReputationScore(msg.sender);
        require(voterReputation >= minReputationToVote, "Insufficient reputation to vote");
        
        // Quadratic voting weight based on reputation
        uint256 voteWeight = calculateVoteWeight(voterReputation);
        
        votes[appealId][msg.sender] = Vote({
            hasVoted: true,
            vote: voteChoice,
            weight: voteWeight
        });
        
        appeal.totalVotes += voteWeight;
        if (voteChoice) {
            appeal.yesVotes += voteWeight;
        } else {
            appeal.noVotes += voteWeight;
        }
        
        emit VoteCast(appealId, msg.sender, voteChoice, voteWeight);
    }
    
    function resolveAppeal(uint256 appealId) external {
        Appeal storage appeal = appeals[appealId];
        require(!appeal.resolved, "Appeal already resolved");
        require(block.timestamp > appeal.votingEnds, "Voting period not ended");
        
        // Check if quorum is met
        uint256 eligibleVoters = getEligibleVoterCount();
        uint256 requiredQuorum = (eligibleVoters * quorumPercentage) / 100;
        
        bool quorumMet = appeal.totalVotes >= requiredQuorum;
        bool appealSuccessful = quorumMet && (appeal.yesVotes > appeal.noVotes);
        
        appeal.resolved = true;
        appeal.upheld = appealSuccessful;
        
        // If appeal is successful, unflag the post
        if (appealSuccessful) {
            // Note: This would require modifying SocialPosts contract to have an unflag function
            // For now, we emit an event that can be handled off-chain
            emit PostUnflagged(appeal.postId, appealId);
        }
        
        emit AppealResolved(appealId, appealSuccessful, appeal.totalVotes);
    }
    
    function calculateVoteWeight(uint256 reputation) public pure returns (uint256) {
        // Quadratic voting: weight = sqrt(reputation) * 10
        // This prevents high-reputation users from dominating
        if (reputation == 0) return 0;
        
        // Simple approximation of square root for gas efficiency
        uint256 weight = 1;
        if (reputation >= 100) weight = 10;
        else if (reputation >= 81) weight = 9;
        else if (reputation >= 64) weight = 8;
        else if (reputation >= 49) weight = 7;
        else if (reputation >= 36) weight = 6;
        else if (reputation >= 25) weight = 5;
        else if (reputation >= 16) weight = 4;
        else if (reputation >= 9) weight = 3;
        else if (reputation >= 4) weight = 2;
        
        return weight * 10; // Scale up for more granular voting
    }
    
    function getEligibleVoterCount() public view returns (uint256) {
        // This is a simplified implementation
        // In practice, you'd need to track all users with sufficient reputation
        // For now, return a reasonable estimate
        return 100; // Placeholder
    }
    
    function getAppeal(uint256 appealId) external view returns (Appeal memory) {
        return appeals[appealId];
    }
    
    function getVote(uint256 appealId, address voter) external view returns (Vote memory) {
        return votes[appealId][voter];
    }
    
    function canVote(address voter, uint256 appealId) external view returns (bool) {
        Appeal memory appeal = appeals[appealId];
        if (appeal.resolved || block.timestamp > appeal.votingEnds) return false;
        if (votes[appealId][voter].hasVoted) return false;
        
        uint256 reputation = reputationSystem.getReputationScore(voter);
        return reputation >= minReputationToVote;
    }
    
    function getAppealStatus(uint256 appealId) external view returns (
        bool isActive,
        bool canResolve,
        uint256 timeLeft,
        uint256 yesPercentage,
        uint256 noPercentage,
        bool quorumMet
    ) {
        Appeal memory appeal = appeals[appealId];
        
        isActive = !appeal.resolved && block.timestamp <= appeal.votingEnds;
        canResolve = !appeal.resolved && block.timestamp > appeal.votingEnds;
        
        if (block.timestamp <= appeal.votingEnds) {
            timeLeft = appeal.votingEnds - block.timestamp;
        }
        
        if (appeal.totalVotes > 0) {
            yesPercentage = (appeal.yesVotes * 100) / appeal.totalVotes;
            noPercentage = (appeal.noVotes * 100) / appeal.totalVotes;
        }
        
        uint256 eligibleVoters = getEligibleVoterCount();
        uint256 requiredQuorum = (eligibleVoters * quorumPercentage) / 100;
        quorumMet = appeal.totalVotes >= requiredQuorum;
    }
    
    // Admin functions
    function setVotingPeriod(uint256 _votingPeriod) external onlyOwner {
        votingPeriod = _votingPeriod;
    }
    
    function setMinReputationToVote(uint256 _minReputation) external onlyOwner {
        minReputationToVote = _minReputation;
    }
    
    function setQuorumPercentage(uint256 _quorumPercentage) external onlyOwner {
        require(_quorumPercentage <= 100, "Invalid percentage");
        quorumPercentage = _quorumPercentage;
    }
}

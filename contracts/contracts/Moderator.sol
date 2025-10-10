// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SocialPosts.sol";

contract Moderator is Ownable {
    ISocialPosts public social;
    mapping(address => bool) public agents;
    
    event AgentSet(address indexed agent, bool allowed);
    event PostFlagged(uint256 indexed id, address indexed agent, uint256 scoreBp, string model);
    
    constructor(address socialAddress, address initialOwner) Ownable(initialOwner) {
        social = ISocialPosts(socialAddress);
    }
    
    function setAgent(address agent, bool allowed) external onlyOwner {
        agents[agent] = allowed;
        emit AgentSet(agent, allowed);
    }
    
    function flagPost(uint256 id, uint256 scoreBp, string memory model) external {
        require(agents[msg.sender], "Not authorized agent");
        
        social.flagFromModerator(id);
        emit PostFlagged(id, msg.sender, scoreBp, model);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface ISocialPosts {
    function createPost(string memory content) external;
    function flagFromModerator(uint256 id) external;
    function getPost(uint256 id) external view returns (uint256, address, string memory, bool, uint256, uint256, uint256);
    function totalPosts() external view returns (uint256);
    function getUserPosts(address user) external view returns (uint256[] memory);
    function getUserPostCount(address user) external view returns (uint256);
    function getUserSafePostCount(address user) external view returns (uint256);
    function getUserFlaggedPostCount(address user) external view returns (uint256);
    function setUsername(string memory username) external;
    function getUsername(address user) external view returns (string memory);
}

contract SocialPosts is ISocialPosts, Ownable {
    struct Post {
        uint256 id;
        address author;
        string content;
        bool flagged;
        uint256 timestamp;
        uint256 likes;
        uint256 replies;
    }
    
    mapping(uint256 => Post) public posts;
    mapping(address => uint256[]) public userPosts;
    mapping(address => uint256) public userPostCount;
    mapping(address => uint256) public userSafePostCount;
    mapping(address => uint256) public userFlaggedPostCount;
    mapping(address => string) public usernames;
    
    uint256 public totalPosts;
    address public moderator;
    
    event PostCreated(uint256 indexed id, address indexed author, string content);
    event PostFlagged(uint256 indexed id, address indexed moderator);
    event PostLiked(uint256 indexed id, address indexed user);
    event UsernameSet(address indexed user, string username);
    
    constructor(address _moderator) Ownable(msg.sender) {
        moderator = _moderator;
    }
    
    function createPost(string memory content) external {
        require(bytes(content).length > 0, "Content cannot be empty");
        require(bytes(content).length <= 280, "Content too long");
        
        totalPosts++;
        uint256 postId = totalPosts;
        
        posts[postId] = Post({
            id: postId,
            author: msg.sender,
            content: content,
            flagged: false,
            timestamp: block.timestamp,
            likes: 0,
            replies: 0
        });
        
        userPosts[msg.sender].push(postId);
        userPostCount[msg.sender]++;
        userSafePostCount[msg.sender]++;
        
        emit PostCreated(postId, msg.sender, content);
    }
    
    function flagFromModerator(uint256 id) external {
        require(msg.sender == moderator, "Only moderator can flag");
        require(id > 0 && id <= totalPosts, "Invalid post ID");
        require(!posts[id].flagged, "Post already flagged");
        
        posts[id].flagged = true;
        address author = posts[id].author;
        
        // Update user stats
        if (userSafePostCount[author] > 0) {
            userSafePostCount[author]--;
        }
        userFlaggedPostCount[author]++;
        
        emit PostFlagged(id, msg.sender);
    }
    
    function likePost(uint256 id) external {
        require(id > 0 && id <= totalPosts, "Invalid post ID");
        posts[id].likes++;
        emit PostLiked(id, msg.sender);
    }
    
    function getPost(uint256 id) external view returns (uint256, address, string memory, bool, uint256, uint256, uint256) {
        require(id > 0 && id <= totalPosts, "Invalid post ID");
        Post memory post = posts[id];
        return (post.id, post.author, post.content, post.flagged, post.timestamp, post.likes, post.replies);
    }
    
    function getUserPosts(address user) external view returns (uint256[] memory) {
        return userPosts[user];
    }
    
    function getUserPostCount(address user) external view returns (uint256) {
        return userPostCount[user];
    }
    
    function getUserSafePostCount(address user) external view returns (uint256) {
        return userSafePostCount[user];
    }
    
    function getUserFlaggedPostCount(address user) external view returns (uint256) {
        return userFlaggedPostCount[user];
    }
    
    function setModerator(address _moderator) external onlyOwner {
        moderator = _moderator;
    }
    
    function setUsername(string memory username) external {
        require(bytes(username).length > 0, "Username cannot be empty");
        require(bytes(username).length <= 30, "Username too long");
        usernames[msg.sender] = username;
        emit UsernameSet(msg.sender, username);
    }
    
    function getUsername(address user) external view returns (string memory) {
        return usernames[user];
    }
}

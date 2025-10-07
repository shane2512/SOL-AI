import { ethers } from 'ethers';

export class FeedRankingSystem {
  constructor(contracts) {
    this.contracts = contracts;
    this.rankingWeights = {
      reputation: 0.4,      // 40% weight for user reputation
      recency: 0.3,         // 30% weight for post recency
      engagement: 0.2,      // 20% weight for likes/replies
      safety: 0.1          // 10% weight for safety score
    };
  }

  async rankPosts(posts) {
    if (!posts || posts.length === 0) return [];

    // Calculate scores for all posts
    const scoredPosts = await Promise.all(
      posts.map(async (post) => {
        const score = await this.calculatePostScore(post);
        return { ...post, rankingScore: score };
      })
    );

    // Sort by ranking score (highest first)
    return scoredPosts.sort((a, b) => b.rankingScore - a.rankingScore);
  }

  async calculatePostScore(post) {
    try {
      // Get user reputation
      const reputationScore = await this.getReputationScore(post.author);
      
      // Calculate component scores
      const reputation = this.calculateReputationScore(reputationScore);
      const recency = this.calculateRecencyScore(post.timestamp);
      const engagement = this.calculateEngagementScore(post.likes, post.replies);
      const safety = this.calculateSafetyScore(post.flagged);

      // Calculate weighted total
      const totalScore = 
        (reputation * this.rankingWeights.reputation) +
        (recency * this.rankingWeights.recency) +
        (engagement * this.rankingWeights.engagement) +
        (safety * this.rankingWeights.safety);

      return Math.round(totalScore * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      console.error('Error calculating post score:', error);
      return 0;
    }
  }

  async getReputationScore(userAddress) {
    try {
      if (!this.contracts?.reputationSystem) return 0;
      const score = await this.contracts.reputationSystem.getReputationScore(userAddress);
      return parseInt(score.toString());
    } catch (error) {
      console.error('Error fetching reputation:', error);
      return 0;
    }
  }

  calculateReputationScore(reputation) {
    // Normalize reputation (0-100) to score (0-1)
    // Apply exponential curve to give higher reputation users more boost
    const normalized = Math.min(reputation / 100, 1);
    return Math.pow(normalized, 0.7); // Slightly favor high reputation
  }

  calculateRecencyScore(timestamp) {
    const now = Date.now();
    const postTime = typeof timestamp === 'number' ? timestamp * 1000 : new Date(timestamp).getTime();
    const ageInHours = (now - postTime) / (1000 * 60 * 60);
    
    // Posts lose score over time with exponential decay
    // Fresh posts (0-1 hour) get full score
    // 24-hour-old posts get ~0.5 score
    // 7-day-old posts get ~0.1 score
    if (ageInHours <= 1) return 1;
    if (ageInHours <= 24) return Math.exp(-ageInHours / 24);
    return Math.exp(-ageInHours / 168) * 0.5; // 168 hours = 7 days
  }

  calculateEngagementScore(likes = 0, replies = 0) {
    // Combine likes and replies with different weights
    const likeWeight = 1;
    const replyWeight = 2; // Replies are more valuable than likes
    
    const totalEngagement = (likes * likeWeight) + (replies * replyWeight);
    
    // Use logarithmic scale to prevent viral posts from dominating
    if (totalEngagement === 0) return 0;
    return Math.log(totalEngagement + 1) / Math.log(101); // Normalize to 0-1
  }

  calculateSafetyScore(flagged) {
    // Flagged posts get heavily penalized
    return flagged ? 0 : 1;
  }

  // Get personalized feed based on user's reputation tier
  async getPersonalizedFeed(posts, userAddress) {
    try {
      const userTier = await this.getUserTier(userAddress);
      const rankedPosts = await this.rankPosts(posts);
      
      // Apply tier-based filtering and boosting
      return this.applyTierFiltering(rankedPosts, userTier);
    } catch (error) {
      console.error('Error creating personalized feed:', error);
      return await this.rankPosts(posts);
    }
  }

  async getUserTier(userAddress) {
    try {
      if (!this.contracts?.reputationSystem) return 0;
      const tier = await this.contracts.reputationSystem.getUserTier(userAddress);
      return parseInt(tier.toString());
    } catch (error) {
      console.error('Error fetching user tier:', error);
      return 0;
    }
  }

  applyTierFiltering(posts, userTier) {
    // Higher tier users see more diverse content
    // Lower tier users see more heavily moderated content
    
    return posts.map(post => {
      let boostedScore = post.rankingScore;
      
      // Boost posts from similar or higher tier users
      const postAuthorTier = this.estimateAuthorTier(post.rankingScore);
      
      if (postAuthorTier >= userTier) {
        boostedScore *= 1.1; // 10% boost for same/higher tier content
      }
      
      // Additional boost for high-reputation content for lower-tier users
      if (userTier <= 1 && postAuthorTier >= 2) {
        boostedScore *= 1.2; // 20% boost for gold/platinum content for bronze/silver users
      }
      
      return { ...post, rankingScore: boostedScore };
    }).sort((a, b) => b.rankingScore - a.rankingScore);
  }

  estimateAuthorTier(rankingScore) {
    // Rough estimation based on ranking score
    // This could be improved by caching actual tier data
    if (rankingScore >= 0.8) return 3; // Platinum
    if (rankingScore >= 0.6) return 2; // Gold
    if (rankingScore >= 0.4) return 1; // Silver
    return 0; // Bronze
  }

  // Get trending posts (high engagement, recent)
  async getTrendingPosts(posts, timeWindow = 24) {
    const cutoffTime = Date.now() - (timeWindow * 60 * 60 * 1000);
    
    const recentPosts = posts.filter(post => {
      const postTime = typeof post.timestamp === 'number' 
        ? post.timestamp * 1000 
        : new Date(post.timestamp).getTime();
      return postTime >= cutoffTime && !post.flagged;
    });

    // Sort by engagement score primarily
    const trendingPosts = await Promise.all(
      recentPosts.map(async (post) => {
        const engagementScore = this.calculateEngagementScore(post.likes, post.replies);
        const reputationScore = await this.getReputationScore(post.author);
        const normalizedReputation = this.calculateReputationScore(reputationScore);
        
        // Trending score emphasizes engagement but considers reputation
        const trendingScore = (engagementScore * 0.7) + (normalizedReputation * 0.3);
        
        return { ...post, trendingScore };
      })
    );

    return trendingPosts
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 10); // Top 10 trending posts
  }

  // Get posts from high-reputation users
  async getHighQualityFeed(posts) {
    const qualityPosts = await Promise.all(
      posts.map(async (post) => {
        const reputationScore = await this.getReputationScore(post.author);
        return { ...post, authorReputation: reputationScore };
      })
    );

    // Filter for high-reputation authors (Silver tier and above)
    return qualityPosts
      .filter(post => post.authorReputation >= 25 && !post.flagged)
      .sort((a, b) => {
        // Sort by reputation first, then by recency
        if (b.authorReputation !== a.authorReputation) {
          return b.authorReputation - a.authorReputation;
        }
        const aTime = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime() / 1000;
        const bTime = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime() / 1000;
        return bTime - aTime;
      });
  }

  // Update ranking weights (for admin use)
  updateRankingWeights(newWeights) {
    // Ensure weights sum to 1
    const total = Object.values(newWeights).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(total - 1) > 0.001) {
      throw new Error('Ranking weights must sum to 1');
    }
    
    this.rankingWeights = { ...newWeights };
  }

  // Get ranking explanation for a post (for debugging/transparency)
  async explainRanking(post) {
    const reputationScore = await this.getReputationScore(post.author);
    
    const components = {
      reputation: {
        raw: reputationScore,
        normalized: this.calculateReputationScore(reputationScore),
        weighted: this.calculateReputationScore(reputationScore) * this.rankingWeights.reputation
      },
      recency: {
        raw: post.timestamp,
        normalized: this.calculateRecencyScore(post.timestamp),
        weighted: this.calculateRecencyScore(post.timestamp) * this.rankingWeights.recency
      },
      engagement: {
        raw: { likes: post.likes, replies: post.replies },
        normalized: this.calculateEngagementScore(post.likes, post.replies),
        weighted: this.calculateEngagementScore(post.likes, post.replies) * this.rankingWeights.engagement
      },
      safety: {
        raw: post.flagged,
        normalized: this.calculateSafetyScore(post.flagged),
        weighted: this.calculateSafetyScore(post.flagged) * this.rankingWeights.safety
      }
    };

    const totalScore = Object.values(components).reduce((sum, comp) => sum + comp.weighted, 0);

    return {
      totalScore,
      components,
      weights: this.rankingWeights
    };
  }
}

// Export utility functions for use in components
export const createFeedRanking = (contracts) => new FeedRankingSystem(contracts);

export const getFeedVariants = async (posts, contracts, userAddress) => {
  const ranking = new FeedRankingSystem(contracts);
  
  const [
    chronological,
    ranked,
    personalized,
    trending,
    highQuality
  ] = await Promise.all([
    // Chronological (newest first)
    posts.sort((a, b) => {
      const aTime = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime() / 1000;
      const bTime = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime() / 1000;
      return bTime - aTime;
    }),
    
    // Algorithm ranked
    ranking.rankPosts(posts),
    
    // Personalized for user
    userAddress ? ranking.getPersonalizedFeed(posts, userAddress) : ranking.rankPosts(posts),
    
    // Trending
    ranking.getTrendingPosts(posts),
    
    // High quality
    ranking.getHighQualityFeed(posts)
  ]);

  return {
    chronological,
    ranked,
    personalized,
    trending,
    highQuality
  };
};

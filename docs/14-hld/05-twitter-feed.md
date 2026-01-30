---
title: 5. Design Twitter Feed
sidebar_position: 5
description: Complete system design for Twitter/Instagram news feed - fanout, ranking, caching at scale.
keywords: [twitter, news feed, fanout, timeline, social media, system design]
---

# Design Twitter Feed

:::danger Interview Hard ⭐⭐⭐⭐
The news feed is one of the **hardest** and most frequently asked system design problems. It tests your understanding of scale, trade-offs, and distributed systems.
:::

## Step 1: Requirements (5 min)

### Functional Requirements

```text
Core Features:
1. Post tweets (text, images, videos)
2. Follow/unfollow users
3. View home timeline (feed of tweets from followed users)
4. View user timeline (all tweets from one user)

Additional Features:
5. Like, retweet, reply
6. Search tweets
7. Trending topics
8. Push notifications
```

### Non-Functional Requirements

```text
1. High availability (99.99% uptime)
2. Low latency (feed loads in < 200ms)
3. Eventually consistent (slight delay in feed is OK)
4. Handle 500M DAU, 1B+ tweets per day
5. Support celebrity accounts (millions of followers)
```

### Clarifying Questions

```text
Q: How many users and tweets?
A: 500M DAU, 200M tweets/day, average user has 200 followers

Q: What's the read-write ratio?
A: Very read-heavy: 1000:1 (scroll vs post)

Q: How fast should a tweet appear in followers' feeds?
A: Within 5 seconds for most users, 30 seconds acceptable

Q: Do we need real-time updates or pull-based?
A: Pull-based with polling (simpler, scales better)
```

---

## Step 2: Estimations (5 min)

### Traffic Estimates

```text
TWEETS (Writes):
- 200 million tweets/day
- 200M / 86,400 = ~2,300 tweets/second
- Peak: ~10,000 tweets/second

FEED READS:
- 500M DAU × 10 feed views/day = 5 billion reads/day
- 5B / 86,400 = ~60,000 reads/second
- Peak: ~200,000 reads/second

READ:WRITE = 60,000:2,300 ≈ 26:1 (very read-heavy)
```

### Storage Estimates

```text
TWEET STORAGE:
- Tweet: 280 chars = 280 bytes
- Metadata: 200 bytes (user_id, timestamp, counts)
- Total per tweet: ~500 bytes

- 200M tweets/day × 365 days × 5 years = 365 billion tweets
- 365B × 500 bytes = 182 TB of tweet data

MEDIA STORAGE (separate):
- 10% of tweets have media
- Average media: 500 KB
- 20M × 500 KB = 10 TB/day
- 5 years = 18 PB of media
```

### Fanout Consideration

```text
FANOUT PROBLEM:
- When user posts tweet, it needs to appear in all followers' feeds
- Average user: 200 followers → 200 fanout operations
- Celebrity (10M followers) → 10M fanout operations!

200M tweets × 200 avg followers = 40 billion fanout operations/day

This is the KEY design challenge!
```

---

## Step 3: High-Level Design

### Core Components

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     TWITTER FEED ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────┐                                                       │
│   │  Client  │                                                       │
│   └────┬─────┘                                                       │
│        │                                                             │
│        ▼                                                             │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                      LOAD BALANCER                           │   │
│   └────────────────────────┬────────────────────────────────────┘   │
│                            │                                         │
│        ┌───────────────────┼───────────────────┐                    │
│        ▼                   ▼                   ▼                    │
│   ┌──────────┐       ┌──────────┐       ┌──────────┐               │
│   │ API GW   │       │ API GW   │       │ API GW   │               │
│   └────┬─────┘       └────┬─────┘       └────┬─────┘               │
│        │                  │                  │                      │
│        └──────────────────┼──────────────────┘                      │
│                           │                                          │
│   ┌───────────────────────┼───────────────────────┐                 │
│   │                       │                       │                 │
│   ▼                       ▼                       ▼                 │
│ ┌──────────┐        ┌──────────┐          ┌──────────┐             │
│ │  Tweet   │        │   Feed   │          │ User     │             │
│ │ Service  │        │ Service  │          │ Service  │             │
│ └────┬─────┘        └────┬─────┘          └────┬─────┘             │
│      │                   │                     │                    │
│      │                   │                     │                    │
│      ▼                   ▼                     ▼                    │
│ ┌──────────┐        ┌──────────┐          ┌──────────┐             │
│ │ Tweet DB │        │ Feed     │          │ User DB  │             │
│ │(Cassandra)│        │ Cache    │          │ (MySQL)  │             │
│ └──────────┘        │ (Redis)  │          └──────────┘             │
│                     └──────────┘                                    │
│                                                                      │
│   ASYNC LAYER:                                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                     MESSAGE QUEUE (Kafka)                    │   │
│   │                            │                                 │   │
│   │            ┌───────────────┼───────────────┐                 │   │
│   │            ▼               ▼               ▼                 │   │
│   │     ┌──────────┐    ┌──────────┐    ┌──────────┐            │   │
│   │     │  Fanout  │    │  Search  │    │ Notif    │            │   │
│   │     │  Worker  │    │  Indexer │    │ Service  │            │   │
│   │     └──────────┘    └──────────┘    └──────────┘            │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### API Design

```text
1. POST TWEET
   POST /api/v1/tweets
   {
     "content": "Hello world!",
     "media_ids": ["abc123"],
     "reply_to": null
   }
   
   Response: 201 Created
   {
     "id": "123456789",
     "content": "Hello world!",
     "created_at": "2024-01-15T10:30:00Z"
   }

2. GET HOME TIMELINE (FEED)
   GET /api/v1/feed?cursor=xxx&limit=20
   
   Response:
   {
     "tweets": [...],
     "next_cursor": "yyy",
     "has_more": true
   }

3. GET USER TIMELINE
   GET /api/v1/users/{user_id}/tweets

4. FOLLOW USER
   POST /api/v1/users/{user_id}/follow
```

---

## Step 4: Deep Dive - The Fanout Problem

### Fanout on Write vs Fanout on Read

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    FANOUT STRATEGIES                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  FANOUT ON WRITE (Push Model)                                       │
│  ────────────────────────────                                       │
│                                                                      │
│  When user posts:                                                    │
│  1. Get all followers                                               │
│  2. Push tweet ID to each follower's feed cache                     │
│                                                                      │
│  User A posts ──▶ Push to ──▶ User B's feed cache                   │
│                              User C's feed cache                    │
│                              User D's feed cache                    │
│                              ... (all followers)                    │
│                                                                      │
│  ✅ Read is fast (pre-computed feed)                                 │
│  ✅ Great for most users                                             │
│  ❌ Celebrity posts = millions of writes!                            │
│  ❌ Wasted work if followers never read                              │
│                                                                      │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  FANOUT ON READ (Pull Model)                                        │
│  ───────────────────────────                                        │
│                                                                      │
│  When user reads feed:                                               │
│  1. Get all followed users                                          │
│  2. Fetch recent tweets from each                                   │
│  3. Merge and sort                                                  │
│                                                                      │
│  User A reads ──▶ Fetch from ──▶ User B's tweets                    │
│                                  User C's tweets                    │
│                                  User D's tweets                    │
│                                  ... merge & sort                   │
│                                                                      │
│  ✅ No wasted writes                                                 │
│  ✅ Works for celebrities                                            │
│  ❌ Slow reads (merge at read time)                                  │
│  ❌ Can't scale for high read traffic                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Hybrid Approach (Twitter's Solution)

```text
┌─────────────────────────────────────────────────────────────────────┐
│                  HYBRID FANOUT (RECOMMENDED)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  RULE: Fanout on Write for normal users                             │
│        Fanout on Read for celebrities (>10K followers)              │
│                                                                      │
│  User posts tweet:                                                   │
│  ├── Check follower count                                           │
│  │                                                                   │
│  ├── IF followers < 10,000 (normal user):                           │
│  │   └── Push to all followers' feeds (fanout on write)             │
│  │                                                                   │
│  └── IF followers >= 10,000 (celebrity):                            │
│      └── Just store tweet, don't fanout                             │
│                                                                      │
│  User reads feed:                                                    │
│  1. Get pre-computed feed from cache (from normal users)            │
│  2. Get list of followed celebrities                                │
│  3. Fetch recent tweets from each celebrity                        │
│  4. Merge celebrity tweets into feed                                │
│  5. Return merged timeline                                          │
│                                                                      │
│  BENEFITS:                                                           │
│  ✅ Celebrities don't cause millions of writes                      │
│  ✅ Most users still get fast pre-computed feed                     │
│  ✅ Only merge 10-20 celebrity accounts per read                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Feed Cache Structure

```text
REDIS DATA STRUCTURE:
Key: feed:{user_id}
Type: Sorted Set (ZSET)
Score: Tweet timestamp
Value: Tweet ID

Example:
feed:user_123 = [
    (timestamp: 1705312200, tweet_id: "abc123"),
    (timestamp: 1705312100, tweet_id: "def456"),
    (timestamp: 1705312000, tweet_id: "ghi789"),
    ...
]

Limit to 800 tweets per user (enough for ~1 week)
ZREMRANGEBYRANK to trim old tweets
```

```java
@Service
public class FeedService {
    
    @Autowired
    private StringRedisTemplate redis;
    
    @Autowired
    private TweetService tweetService;
    
    @Autowired
    private UserService userService;
    
    private static final int FEED_SIZE = 800;
    private static final int CELEBRITY_THRESHOLD = 10_000;
    
    // Fanout new tweet to followers' feeds
    public void fanoutTweet(String tweetId, String authorId, long timestamp) {
        List<String> followers = userService.getFollowers(authorId);
        
        if (followers.size() < CELEBRITY_THRESHOLD) {
            // Normal user: fanout on write
            for (String followerId : followers) {
                String feedKey = "feed:" + followerId;
                redis.opsForZSet().add(feedKey, tweetId, timestamp);
                
                // Trim to keep size under limit
                redis.opsForZSet().removeRange(feedKey, 0, -FEED_SIZE - 1);
            }
        }
        // Celebrity: don't fanout, will be fetched on read
    }
    
    // Get user's home timeline
    public List<Tweet> getFeed(String userId, int offset, int limit) {
        // 1. Get pre-computed feed (from normal users)
        String feedKey = "feed:" + userId;
        Set<String> tweetIds = redis.opsForZSet()
            .reverseRange(feedKey, offset, offset + limit - 1);
        
        List<Tweet> tweets = new ArrayList<>(tweetService.getByIds(tweetIds));
        
        // 2. Get followed celebrities
        List<String> celebrities = userService.getFollowedCelebrities(userId);
        
        // 3. Fetch recent tweets from celebrities
        for (String celebId : celebrities) {
            List<Tweet> celebTweets = tweetService.getRecent(celebId, 20);
            tweets.addAll(celebTweets);
        }
        
        // 4. Merge and sort by timestamp
        tweets.sort(Comparator.comparing(Tweet::getCreatedAt).reversed());
        
        // 5. Return top N
        return tweets.stream().limit(limit).toList();
    }
}
```

---

## Step 5: Database Design

### Tweet Storage (Cassandra)

```sql
-- Tweets by ID (global lookup)
CREATE TABLE tweets (
    tweet_id    UUID PRIMARY KEY,
    user_id     UUID,
    content     TEXT,
    media_ids   LIST<UUID>,
    created_at  TIMESTAMP,
    like_count  COUNTER,
    retweet_count COUNTER,
    reply_count COUNTER
);

-- User timeline (all tweets by a user)
CREATE TABLE user_timeline (
    user_id     UUID,
    tweet_id    UUID,
    created_at  TIMESTAMP,
    content     TEXT,
    PRIMARY KEY (user_id, created_at, tweet_id)
) WITH CLUSTERING ORDER BY (created_at DESC);

-- Why Cassandra?
-- ✅ Excellent write performance
-- ✅ Easy horizontal scaling (partitioning)
-- ✅ Time-series optimized
-- ✅ High availability
```

### User & Follow Graph (MySQL + Neo4j/Redis)

```sql
-- MySQL for user data
CREATE TABLE users (
    user_id         BIGINT PRIMARY KEY,
    username        VARCHAR(50) UNIQUE,
    display_name    VARCHAR(100),
    bio             VARCHAR(280),
    follower_count  INT DEFAULT 0,
    following_count INT DEFAULT 0,
    is_celebrity    BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP
);

-- Follow relationships
CREATE TABLE follows (
    follower_id     BIGINT,
    followee_id     BIGINT,
    created_at      TIMESTAMP,
    PRIMARY KEY (follower_id, followee_id),
    INDEX idx_followee (followee_id)
);
```

```java
// Redis for fast follower lookup
// Key: followers:{user_id}
// Value: Set of follower user IDs

// Get followers (for fanout)
Set<String> followers = redis.opsForSet().members("followers:" + userId);

// Get following (for feed generation)
Set<String> following = redis.opsForSet().members("following:" + userId);
```

---

## Step 6: Ranking & Personalization

### Feed Ranking Factors

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    FEED RANKING ALGORITHM                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Score = f(freshness, engagement, affinity, content)                │
│                                                                      │
│  1. FRESHNESS (40%)                                                 │
│     └── Newer tweets score higher                                   │
│     └── Decay function: 1 / (hours_old + 2)^1.5                     │
│                                                                      │
│  2. ENGAGEMENT (30%)                                                │
│     └── like_count × 1                                              │
│     └── retweet_count × 2                                           │
│     └── reply_count × 3                                             │
│     └── Normalized by author's average engagement                   │
│                                                                      │
│  3. AFFINITY (20%)                                                  │
│     └── How often user interacts with author                        │
│     └── Based on: likes, replies, profile visits                    │
│     └── Higher affinity = higher score                              │
│                                                                      │
│  4. CONTENT (10%)                                                   │
│     └── Media presence (images/videos score higher)                 │
│     └── Thread vs single tweet                                      │
│     └── Link presence                                               │
│                                                                      │
│  Final: Most-ranked tweets shown first                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Simplified Ranking

```java
public double calculateScore(Tweet tweet, User viewer) {
    double freshnessScore = 1.0 / Math.pow(
        hoursOld(tweet.getCreatedAt()) + 2, 
        1.5
    );
    
    double engagementScore = 
        tweet.getLikeCount() * 1.0 +
        tweet.getRetweetCount() * 2.0 +
        tweet.getReplyCount() * 3.0;
    engagementScore = normalizeByAuthor(engagementScore, tweet.getAuthorId());
    
    double affinityScore = getAffinity(viewer.getId(), tweet.getAuthorId());
    
    double contentScore = 
        (tweet.hasMedia() ? 1.5 : 1.0) *
        (tweet.isThread() ? 1.2 : 1.0);
    
    return freshnessScore * 0.4 +
           engagementScore * 0.3 +
           affinityScore * 0.2 +
           contentScore * 0.1;
}
```

---

## Step 7: Scaling Strategies

### Data Partitioning

```text
TWEETS: Partition by tweet_id (random distribution)
         - Even distribution across shards
         - No hot spots

USER TIMELINE: Partition by user_id
               - All user's tweets on same shard
               - Fast user timeline queries

FEED CACHE: Partition by user_id
            - Each user's feed on one Redis node
            - Use consistent hashing for distribution

FOLLOWERS: Partition by user_id
           - All follower relationships together
           - Fast fanout for one user
```

### Caching Strategy

```text
CACHE LAYERS:
1. CDN (static assets, profile images)
2. Application cache (hot tweet content)
3. Feed cache (pre-computed feeds in Redis)
4. Database cache (query results)

CACHE POLICIES:
- Tweet content: Cache for 1 hour, invalidate on edit/delete
- Feed: Keep 800 most recent tweet IDs
- User profiles: Cache for 15 minutes
- Follower lists: Cache for 5 minutes
```

---

## Complete Tweet Flow

```text
USER POSTS TWEET:
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  1. Client → POST /tweets                                           │
│  2. API validates request, authenticates user                       │
│  3. Tweet Service creates tweet                                     │
│     ├── Generate tweet_id (Snowflake)                               │
│     ├── Store in Cassandra (tweets table)                           │
│     ├── Add to user's timeline                                      │
│     └── Publish to Kafka (fanout topic)                             │
│  4. Fanout Worker consumes from Kafka                               │
│     ├── Check: Is author a celebrity?                               │
│     ├── If NO: Push tweet_id to all followers' feed caches          │
│     └── If YES: Skip fanout (will be pulled on read)                │
│  5. Search Indexer indexes tweet for search                         │
│  6. Notification Service alerts mentioned users                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

USER READS FEED:
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  1. Client → GET /feed?cursor=xxx                                   │
│  2. Feed Service:                                                   │
│     ├── Get tweet IDs from user's feed cache (Redis ZRANGE)         │
│     ├── Get followed celebrity IDs                                  │
│     ├── Fetch recent tweets from each celebrity                     │
│     ├── Merge all tweets                                            │
│     ├── Apply ranking algorithm                                     │
│     ├── Hydrate tweet content (from cache or DB)                    │
│     └── Return paginated result with cursor                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Interview Tips

```text
✅ Start by clarifying read/write ratio (it's very read-heavy)
✅ Discuss the fanout problem early (it's the core challenge)
✅ Explain hybrid approach for celebrities
✅ Mention specific databases (Cassandra for tweets, Redis for cache)
✅ Discuss ranking even if briefly
✅ Address hotspots (celebrities, trending tweets)

❌ Don't skip the estimation step
❌ Don't ignore the celebrity problem
❌ Don't propose only fanout-on-write or only fanout-on-read
❌ Don't forget about eventual consistency trade-offs
```

---

**Next:** [6. Design Chat System →](./06-chat-system)

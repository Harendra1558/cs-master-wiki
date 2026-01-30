---
title: 6. Design Chat System
sidebar_position: 6
description: Complete system design for WhatsApp/Slack - real-time messaging, WebSockets, message delivery.
keywords: [chat system, whatsapp, slack, websocket, real-time messaging, system design]
---

# Design Chat System (WhatsApp/Slack)

:::tip Interview Favorite
Chat systems test your understanding of **real-time communication**, **message delivery guarantees**, and **presence systems**. Very common in senior interviews.
:::

## Step 1: Requirements (5 min)

### Functional Requirements

```text
Core Features:
1. 1:1 private messaging
2. Group chats (up to 500 members)
3. Online/offline status (presence)
4. Message delivery status (sent, delivered, read)
5. Message history/sync across devices

Additional:
6. Media sharing (images, files)
7. Push notifications
8. End-to-end encryption (mention, don't implement)
```

### Non-Functional Requirements

```text
1. Real-time: Messages delivered in < 100ms
2. Reliable: Messages must never be lost
3. Ordered: Messages appear in correct order
4. Scalable: 500M DAU, billions of messages/day
5. Multi-device: Sync across phone, web, desktop
```

### Clarifying Questions

```text
Q: 1:1 or group focus?
A: Both, group up to 500 members

Q: Do we need end-to-end encryption?
A: Yes, but focus on architecture, not crypto details

Q: Message history - how far back?
A: All messages, stored permanently

Q: Media size limits?
A: 100MB for files, 16MB for images
```

---

## Step 2: Estimations (5 min)

### Traffic Estimates

```text
USERS:
- 500M DAU
- Average user sends 40 messages/day

MESSAGES:
- 500M × 40 = 20 billion messages/day
- 20B / 86,400 = ~230,000 messages/second
- Peak: ~500,000 messages/second

CONNECTIONS:
- 500M concurrent WebSocket connections (at peak)
- Each connection maintained for hours
```

### Storage Estimates

```text
MESSAGE STORAGE:
- Average message: 100 bytes
- 20B messages/day × 100 bytes = 2 TB/day
- 5 years: 2 TB × 365 × 5 = 3.6 PB

MEDIA STORAGE:
- 5% of messages have media
- Average media size: 200KB
- 1B × 200KB = 200 TB/day
- Use object storage (S3), separate from messages
```

### Connection Handling

```text
WEBSOCKET SERVERS:
- Each server handles ~100K connections
- 500M connections / 100K = 5,000 servers

MEMORY PER CONNECTION:
- ~10KB per WebSocket connection
- 100K connections = 1GB RAM just for connections
- Need significant server capacity
```

---

## Step 3: High-Level Design

### Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     CHAT SYSTEM ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│          ┌──────────────────────────────────────────┐               │
│          │              CLIENTS                      │               │
│          │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐     │               │
│          │  │Phone│  │Phone│  │ Web │  │ Web │     │               │
│          │  └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘     │               │
│          └─────┼────────┼────────┼────────┼─────────┘               │
│                │        │        │        │                          │
│                └────────┴────┬───┴────────┘                          │
│                              │ WebSocket                             │
│                              ▼                                       │
│          ┌──────────────────────────────────────────┐               │
│          │           LOAD BALANCER                   │               │
│          │     (Layer 7, WebSocket aware)           │               │
│          └────────────────────┬─────────────────────┘               │
│                               │                                      │
│       ┌───────────────────────┼───────────────────────┐             │
│       │                       │                       │             │
│       ▼                       ▼                       ▼             │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐       │
│  │  Chat       │       │  Chat       │       │  Chat       │       │
│  │  Server 1   │       │  Server 2   │       │  Server N   │       │
│  │             │       │             │       │             │       │
│  │ WebSocket   │       │ WebSocket   │       │ WebSocket   │       │
│  │ Connections │       │ Connections │       │ Connections │       │
│  └──────┬──────┘       └──────┬──────┘       └──────┬──────┘       │
│         │                     │                     │               │
│         └─────────────────────┼─────────────────────┘               │
│                               │                                      │
│                               ▼                                      │
│          ┌──────────────────────────────────────────┐               │
│          │       MESSAGE BROKER (Redis Pub/Sub)     │               │
│          │         or Kafka for durability          │               │
│          └────────────────────┬─────────────────────┘               │
│                               │                                      │
│       ┌───────────────────────┼───────────────────────┐             │
│       │                       │                       │             │
│       ▼                       ▼                       ▼             │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐       │
│  │  Session    │       │  Message    │       │  Group      │       │
│  │  Service    │       │  Service    │       │  Service    │       │
│  └──────┬──────┘       └──────┬──────┘       └──────┬──────┘       │
│         │                     │                     │               │
│         ▼                     ▼                     ▼               │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐       │
│  │   Redis     │       │  Cassandra  │       │   MySQL     │       │
│  │ (Sessions)  │       │ (Messages)  │       │  (Groups)   │       │
│  └─────────────┘       └─────────────┘       └─────────────┘       │
│                                                                      │
│   ASYNC SERVICES:                                                    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐ │   │
│  │  │  Push     │  │  Presence │  │  Read     │  │  Media    │ │   │
│  │  │  Notif    │  │  Service  │  │  Receipts │  │  Service  │ │   │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### API Design

```text
WEBSOCKET MESSAGES (Real-time):

1. SEND MESSAGE
   Client → Server:
   {
     "type": "message",
     "id": "uuid-123",
     "to": "user_456",        // or "group_789"
     "content": "Hello!",
     "timestamp": 1705312200
   }
   
   Server → Client (ACK):
   {
     "type": "ack",
     "id": "uuid-123",
     "status": "sent",
     "server_timestamp": 1705312201
   }

2. RECEIVE MESSAGE
   Server → Client:
   {
     "type": "message",
     "id": "uuid-123",
     "from": "user_123",
     "to": "user_456",
     "content": "Hello!",
     "timestamp": 1705312201
   }

3. DELIVERY RECEIPT
   Client → Server:
   {
     "type": "delivery",
     "message_id": "uuid-123"
   }

4. READ RECEIPT
   Client → Server:
   {
     "type": "read",
     "message_ids": ["uuid-123", "uuid-124"]
   }

5. PRESENCE UPDATE
   Server → Client:
   {
     "type": "presence",
     "user_id": "user_123",
     "status": "online",       // "offline", "typing"
     "last_seen": 1705312200
   }

REST APIs (Non-real-time):

GET /api/v1/conversations              - List conversations
GET /api/v1/conversations/{id}/history - Message history
POST /api/v1/groups                    - Create group
POST /api/v1/media/upload              - Upload media
```

---

## Step 4: Deep Dive - Message Flow

### 1:1 Message Delivery

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    1:1 MESSAGE FLOW                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  USER A (Sender)              SYSTEM              USER B (Receiver) │
│       │                         │                       │           │
│       │ 1. Send message         │                       │           │
│       │ ───────────────────────▶│                       │           │
│       │   {to: B, msg: "Hi"}    │                       │           │
│       │                         │                       │           │
│       │ 2. ACK (sent) ◀─────────│                       │           │
│       │                         │                       │           │
│       │                         │ 3. Store in DB        │           │
│       │                         │ ────────────▶         │           │
│       │                         │                       │           │
│       │                         │ 4. Lookup: Where is B?│           │
│       │                         │ ────────────▶ Redis   │           │
│       │                         │ B is on Server 5      │           │
│       │                         │                       │           │
│       │                         │ 5. Route to Server 5  │           │
│       │                         │ ──────────────────────│           │
│       │                         │                       │           │
│       │                         │ 6. Deliver to B ──────────────▶   │
│       │                         │                       │           │
│       │                         │ 7. B sends delivery   │           │
│       │                         │    receipt ◀──────────│           │
│       │                         │                       │           │
│       │ 8. Delivery ◀───────────│                       │           │
│       │    notification         │                       │           │
│       │                         │                       │           │
│       │                         │ 9. B reads message    │           │
│       │                         │ ◀──────────────────────           │
│       │                         │                       │           │
│       │ 10. Read receipt ◀──────│                       │           │
│       │                         │                       │           │
└─────────────────────────────────────────────────────────────────────┘
```

### Session Management

```java
@Service
public class SessionService {
    
    @Autowired
    private StringRedisTemplate redis;
    
    // When user connects via WebSocket
    public void registerSession(String userId, String serverId, String sessionId) {
        // User can be connected from multiple devices
        String key = "sessions:" + userId;
        String value = serverId + ":" + sessionId;
        
        redis.opsForSet().add(key, value);
        redis.expire(key, Duration.ofHours(24));
        
        // Also track which server this session is on
        redis.opsForValue().set("session:" + sessionId, serverId);
    }
    
    // When user disconnects
    public void removeSession(String userId, String sessionId) {
        String key = "sessions:" + userId;
        redis.opsForSet().members(key).stream()
            .filter(v -> v.endsWith(":" + sessionId))
            .findFirst()
            .ifPresent(v -> redis.opsForSet().remove(key, v));
        
        redis.delete("session:" + sessionId);
    }
    
    // Find all active sessions for a user
    public List<Session> getActiveSessions(String userId) {
        String key = "sessions:" + userId;
        Set<String> sessions = redis.opsForSet().members(key);
        
        return sessions.stream()
            .map(s -> {
                String[] parts = s.split(":");
                return new Session(parts[0], parts[1]);  // serverId, sessionId
            })
            .toList();
    }
}
```

### Message Routing

```java
@Service
public class MessageRouter {
    
    @Autowired
    private SessionService sessionService;
    
    @Autowired
    private RedisTemplate<String, Message> redisPubSub;
    
    @Autowired
    private PushNotificationService pushService;
    
    @Autowired
    private MessageRepository messageRepository;
    
    public void routeMessage(Message message) {
        // 1. Persist message first (durability)
        messageRepository.save(message);
        
        // 2. Find recipient's active sessions
        List<Session> sessions = sessionService.getActiveSessions(message.getToUserId());
        
        if (sessions.isEmpty()) {
            // 3a. User offline - send push notification
            pushService.sendPush(message.getToUserId(), message);
        } else {
            // 3b. User online - route to their servers
            for (Session session : sessions) {
                String channel = "server:" + session.serverId();
                redisPubSub.convertAndSend(channel, message);
            }
        }
    }
}

@Component
public class MessageListener {
    
    @Autowired
    private WebSocketSessionRegistry sessionRegistry;
    
    // Each chat server listens to its own channel
    @PostConstruct
    public void subscribe() {
        String channel = "server:" + getCurrentServerId();
        // Subscribe to Redis channel
        // When message arrives, find local WebSocket session and send
    }
    
    public void onMessage(Message message) {
        // Find local WebSocket session for recipient
        WebSocketSession session = sessionRegistry.getSession(message.getToUserId());
        if (session != null && session.isOpen()) {
            session.sendMessage(new TextMessage(toJson(message)));
        }
    }
}
```

---

## Step 5: Group Messaging

### Fan-out for Groups

```text
Problem: Group has 500 members
         Each message needs to reach 500 users

Solution: Parallel fan-out with batching

┌─────────────────────────────────────────────────────────────────────┐
│                    GROUP MESSAGE FLOW                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. User sends message to group_123                                 │
│                                                                      │
│  2. Store message in messages table                                 │
│     (one copy, not 500!)                                            │
│                                                                      │
│  3. Get group members from cache/DB                                 │
│     members = [user_1, user_2, ..., user_500]                       │
│                                                                      │
│  4. Fan-out in parallel batches:                                    │
│     Batch 1: [user_1 ... user_50]  → Worker 1                       │
│     Batch 2: [user_51 ... user_100] → Worker 2                      │
│     ...                                                              │
│     Batch 10: [user_451 ... user_500] → Worker 10                   │
│                                                                      │
│  5. Each worker:                                                    │
│     - Finds online sessions                                         │
│     - Routes to correct servers                                     │
│     - Queues push notifications for offline users                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

```java
@Service
public class GroupMessageService {
    
    @Autowired
    private GroupService groupService;
    
    @Autowired
    private MessageRouter messageRouter;
    
    @Autowired
    private ExecutorService fanoutExecutor;
    
    private static final int BATCH_SIZE = 50;
    
    public void sendGroupMessage(String groupId, Message message) {
        // 1. Store message (one copy)
        message.setGroupId(groupId);
        messageRepository.save(message);
        
        // 2. Get group members
        List<String> members = groupService.getMembers(groupId);
        
        // 3. Fan-out in batches
        List<List<String>> batches = partition(members, BATCH_SIZE);
        
        List<CompletableFuture<Void>> futures = batches.stream()
            .map(batch -> CompletableFuture.runAsync(() -> 
                fanoutToBatch(message, batch), fanoutExecutor))
            .toList();
        
        // Wait for all batches (or use fire-and-forget)
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
    }
    
    private void fanoutToBatch(Message message, List<String> recipients) {
        for (String userId : recipients) {
            if (!userId.equals(message.getFromUserId())) {
                messageRouter.routeMessage(message.copyFor(userId));
            }
        }
    }
}
```

---

## Step 6: Message Delivery Guarantees

### Delivery States

```text
MESSAGE STATES:
┌─────────┐     ┌──────────┐     ┌───────────┐     ┌────────┐
│ SENDING │────▶│   SENT   │────▶│ DELIVERED │────▶│  READ  │
└─────────┘     └──────────┘     └───────────┘     └────────┘
     │               │                 │                │
     │               │                 │                │
   Client         Server           Recipient       Recipient
   sends          stores           receives          opens
   message        message          message          message
```

### Handling Offline Users

```text
SCENARIO: User B is offline when message arrives

1. Message stored in database (marked as undelivered)
2. Push notification sent via FCM/APNS
3. When B comes online:
   a. B's client requests undelivered messages
   b. Server sends all pending messages
   c. As B receives each message, mark as delivered
   d. As B reads each message, mark as read
```

```java
@Service
public class SyncService {
    
    @Autowired
    private MessageRepository messageRepository;
    
    // Called when client connects
    public List<Message> getUndeliveredMessages(String userId, long lastSyncTimestamp) {
        return messageRepository.findUndeliveredSince(userId, lastSyncTimestamp);
    }
    
    // Called by client after receiving messages
    public void markDelivered(String userId, List<String> messageIds) {
        messageRepository.updateDeliveryStatus(messageIds, "DELIVERED");
        
        // Notify senders about delivery
        for (String msgId : messageIds) {
            Message msg = messageRepository.findById(msgId);
            notifySender(msg.getFromUserId(), msgId, "DELIVERED");
        }
    }
}
```

### Message Ordering

```text
PROBLEM: Messages can arrive out of order
         (Network delays, multiple servers)

SOLUTION: Timestamp-based ordering

1. Each message has:
   - client_timestamp (when sent)
   - server_timestamp (when received by server)

2. Client displays messages sorted by server_timestamp

3. For same conversation, use server-side sequence number:
   conversation_123: sequence = 1, 2, 3, ...
   
4. If gap detected (msg 5 arrives before msg 4):
   - Client waits briefly
   - If msg 4 doesn't arrive, fetch from server
```

---

## Step 7: Presence System

### Online/Offline Detection

```text
HEARTBEAT APPROACH:
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Client sends heartbeat every 5 seconds                             │
│  ──────────────────────────────────────────▶ Server updates Redis   │
│                                              last_seen: now()        │
│                                              TTL: 10 seconds         │
│                                                                      │
│  If heartbeat stops:                                                 │
│  - Redis key expires after 10 seconds                               │
│  - User considered offline                                          │
│                                                                      │
│  Optimization:                                                       │
│  - Only notify contacts if status actually changed                  │
│  - Batch presence updates                                           │
│  - Don't send presence for users not visible                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

```java
@Service
public class PresenceService {
    
    @Autowired
    private StringRedisTemplate redis;
    
    private static final int HEARTBEAT_TTL = 10;  // seconds
    
    public void heartbeat(String userId) {
        String key = "presence:" + userId;
        String oldValue = redis.opsForValue().get(key);
        
        // Set last seen with TTL
        redis.opsForValue().set(key, String.valueOf(System.currentTimeMillis()), 
            Duration.ofSeconds(HEARTBEAT_TTL));
        
        // If was offline (key didn't exist), broadcast online status
        if (oldValue == null) {
            broadcastPresence(userId, "online");
        }
    }
    
    public void disconnect(String userId) {
        redis.delete("presence:" + userId);
        broadcastPresence(userId, "offline");
    }
    
    public boolean isOnline(String userId) {
        return redis.hasKey("presence:" + userId);
    }
    
    public Long getLastSeen(String userId) {
        String value = redis.opsForValue().get("presence:" + userId);
        return value != null ? Long.valueOf(value) : null;
    }
    
    private void broadcastPresence(String userId, String status) {
        // Get user's contacts and notify only online ones
        // Batch updates to reduce messages
    }
}
```

### Typing Indicators

```text
TYPING INDICATOR:
- Short-lived state (expires in 3 seconds)
- Only sent to conversation participants
- Throttled (max 1 update per second)

Client sends: { "type": "typing", "conversation": "123" }
Server broadcasts to other participants
Auto-expires if no update received
```

---

## Step 8: Data Storage

### Messages (Cassandra)

```sql
-- Optimized for fetching conversation history
CREATE TABLE messages (
    conversation_id UUID,
    message_id TIMEUUID,
    sender_id UUID,
    content TEXT,
    message_type VARCHAR,  -- text, image, file
    media_url VARCHAR,
    created_at TIMESTAMP,
    PRIMARY KEY (conversation_id, message_id)
) WITH CLUSTERING ORDER BY (message_id DESC);

-- For syncing undelivered messages
CREATE TABLE pending_messages (
    recipient_id UUID,
    message_id TIMEUUID,
    conversation_id UUID,
    sender_id UUID,
    content TEXT,
    created_at TIMESTAMP,
    PRIMARY KEY (recipient_id, created_at, message_id)
) WITH CLUSTERING ORDER BY (created_at ASC);
```

### Conversations & Groups (MySQL)

```sql
CREATE TABLE conversations (
    id              BIGINT PRIMARY KEY,
    type            ENUM('direct', 'group'),
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);

CREATE TABLE conversation_members (
    conversation_id BIGINT,
    user_id         BIGINT,
    joined_at       TIMESTAMP,
    last_read_at    TIMESTAMP,
    muted           BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (conversation_id, user_id),
    INDEX idx_user (user_id)
);

CREATE TABLE groups (
    id              BIGINT PRIMARY KEY,
    name            VARCHAR(100),
    description     VARCHAR(500),
    avatar_url      VARCHAR(500),
    owner_id        BIGINT,
    created_at      TIMESTAMP
);
```

---

## Summary

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    CHAT SYSTEM SUMMARY                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CORE COMPONENTS:                                                    │
│  ├── WebSocket servers (maintain persistent connections)            │
│  ├── Session registry (Redis - who's connected where)               │
│  ├── Message broker (Redis pub/sub for routing)                     │
│  ├── Message storage (Cassandra for durability)                     │
│  └── Push notifications (FCM/APNS for offline users)                │
│                                                                      │
│  KEY FLOWS:                                                          │
│  ├── 1:1 messaging (route via session lookup)                       │
│  ├── Group messaging (parallel fan-out with batching)               │
│  ├── Presence (heartbeat with Redis TTL)                            │
│  └── Sync (fetch undelivered on reconnect)                          │
│                                                                      │
│  DELIVERY GUARANTEES:                                                │
│  ├── Persist before acknowledge                                     │
│  ├── Retry until delivered                                          │
│  ├── Track sent/delivered/read status                               │
│  └── Handle offline → online transitions                            │
│                                                                      │
│  SCALABILITY:                                                        │
│  ├── Stateless chat servers (behind load balancer)                  │
│  ├── Redis cluster for session state                                │
│  ├── Cassandra for message storage (horizontal scale)               │
│  └── Partition by conversation_id for locality                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Interview Tips

```text
✅ Start with WebSocket for real-time (explain why not polling)
✅ Discuss session management early
✅ Cover message delivery guarantees (sent/delivered/read)
✅ Handle offline users explicitly
✅ Mention group fan-out challenge
✅ Discuss presence system design

❌ Don't forget about multi-device sync
❌ Don't ignore message ordering
❌ Don't skip push notifications for offline users
```

---

**Next:** [7. Design Notification System →](./notification-system)

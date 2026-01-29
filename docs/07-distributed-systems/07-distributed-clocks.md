---
title: 7. Distributed Clocks & Ordering
sidebar_position: 7
description: Master Lamport timestamps, vector clocks, and event ordering in distributed systems for interviews.
keywords: [lamport clock, vector clock, logical clock, ordering, happens-before, causality]
---

# Distributed Clocks & Ordering

:::info Interview Importance ⭐⭐⭐
Understanding time and ordering in distributed systems is crucial for designing consistent systems. These concepts underpin conflict resolution, causality tracking, and debugging distributed systems.
:::

## 1. The Time Problem

### Why Wall Clocks Fail

```text
ASSUMPTION: "Just use timestamps to order events!"

REALITY:
┌─────────────────────────────────────────────────────────────┐
│ Server A clock: 10:00:00.000                                │
│ Server B clock: 10:00:00.050  (50ms ahead)                  │
│ Server C clock: 09:59:59.980  (20ms behind)                 │
│                                                             │
│ Event on A at 10:00:00.010                                  │
│ Event on C at 10:00:00.000 (actual: 10:00:00.020)           │
│                                                             │
│ Timestamps say: C happened before A                         │
│ Reality: A happened before C!                               │
└─────────────────────────────────────────────────────────────┘

Problems:
├── Clock skew: Clocks run at slightly different rates
├── Clock drift: Difference grows over time
├── NTP sync: Jumps can go backward!
├── Leap seconds: Clock adjustments
└── Network latency: Can't sync perfectly
```

### What We Really Need

```text
Understanding "time" in distributed systems:

1. PHYSICAL TIME (Wall clock)
   └── What time is it? "10:00 AM"
   └── Imprecise, can't trust fully

2. LOGICAL TIME (Order of events)
   └── Did A happen before B?
   └── What we actually care about for consistency!

Key insight:
"We don't need to know WHEN something happened,
 just WHETHER it happened before something else."
```

---

## 2. Happens-Before Relationship

### Definition

```text
The "happens-before" relation (→) defines causal ordering:

A → B (A happens-before B) if:

1. SAME PROCESS: A and B are in same process, A before B
   
   Process P: [A] ──→ [B] ──→ [C]
              A → B → C

2. MESSAGE SEND/RECEIVE: A is send, B is receive of same message

   Process P: [A: send(m)] ──────→
                              \
   Process Q:            ──────→ [B: receive(m)]
                         
   A → B (send happens-before receive)

3. TRANSITIVITY: If A → B and B → C, then A → C

   Process P: [A] ──────────────────→
                  \
   Process Q:   ───[B]────────→
                        \
   Process R:         ───[C]───→
                         
   A → B → C  (transitive)
```

### Concurrent Events

```text
Events are CONCURRENT if neither happens-before the other:

A || B (A concurrent with B) if:
├── NOT (A → B)
├── NOT (B → A)

Example:
Process P: ─────[A]─────────
                 
Process Q: ─────────[B]─────

No message between A and B.
A and B happened "at the same time" (logically concurrent).
No way to know which was first!

This is FUNDAMENTAL to distributed systems.
Some events have no ordering relationship.
```

---

## 3. Lamport Timestamps

### How They Work

```text
LAMPORT TIMESTAMP: Single integer counter for logical time

Rules:
┌─────────────────────────────────────────────────────────────┐
│ 1. Each process has counter C, starting at 0                │
│                                                             │
│ 2. Before ANY event, increment C:                           │
│    C = C + 1                                                │
│                                                             │
│ 3. When SENDING message, include C in message               │
│                                                             │
│ 4. When RECEIVING message with timestamp T:                 │
│    C = max(C, T) + 1                                        │
└─────────────────────────────────────────────────────────────┘

Property:
If A → B, then L(A) < L(B)  (Lamport timestamp of A < B)

BUT NOT THE REVERSE!
L(A) < L(B) does NOT mean A → B
(Could be concurrent)
```

### Example

```text
Process P (C_p)      Process Q (C_q)      Process R (C_r)
     │                    │                    │
     │ C_p=1              │                    │
    [A]──────────────────→│                    │
     │                    │ C_q=max(0,1)+1=2   │
     │                   [B]                   │
     │                    │                    │
     │ C_p=2              │                    │
    [C]                   │                    │
     │                    │──────────────────→│
     │                    │        C_r=max(0,2)+1=3
     │                    │                   [D]
     │                    │                    │
     │←──────────────────────────────────────[E]
     │ C_p=max(2,3)+1=4   │                    │
    [F]                   │                    │

Timestamps:
A=1, B=2, C=2, D=3, E=4, F=5

Ordering we can determine:
A → B (message)
B → D (message)
D → F (message, through E)

A and C? L(A)=1 < L(C)=2, but they're on same process, so A → C ✓
B and C? L(B)=2, L(C)=2 - CONCURRENT! (no causal relationship)
```

### Lamport Clock Implementation

```java
public class LamportClock {
    private final AtomicLong counter = new AtomicLong(0);
    
    // Called before any local event
    public long tick() {
        return counter.incrementAndGet();
    }
    
    // Called when sending a message
    public long send() {
        return counter.incrementAndGet();
    }
    
    // Called when receiving a message
    public long receive(long senderTimestamp) {
        long current;
        long newValue;
        do {
            current = counter.get();
            newValue = Math.max(current, senderTimestamp) + 1;
        } while (!counter.compareAndSet(current, newValue));
        return newValue;
    }
    
    public long getTime() {
        return counter.get();
    }
}

// Usage in message passing
public class DistributedNode {
    private final LamportClock clock = new LamportClock();
    private final String nodeId;
    
    public Message send(String content, String destination) {
        long timestamp = clock.send();
        Message msg = new Message(nodeId, destination, content, timestamp);
        network.send(msg);
        return msg;
    }
    
    public void receive(Message msg) {
        long localTime = clock.receive(msg.getTimestamp());
        log.info("Received at logical time {}: {}", localTime, msg);
        processMessage(msg);
    }
}
```

### Limitations of Lamport Clocks

```text
LIMITATION: Can't detect concurrent events

Given L(A)=5, L(B)=7:
├── A → B? Maybe
├── B → A? Definitely not (would require L(B) < L(A))
├── A || B? Maybe

We only know: A did NOT happen after B

To detect concurrency, we need VECTOR CLOCKS!
```

---

## 4. Vector Clocks

### How They Work

```text
VECTOR CLOCK: Array of counters, one per process

For N processes: V = [C₁, C₂, ..., Cₙ]
                     (counter for each process)

Rules:
┌─────────────────────────────────────────────────────────────┐
│ 1. Each process i has vector V, all zeros initially         │
│                                                             │
│ 2. Before ANY event at process i:                           │
│    V[i] = V[i] + 1                                          │
│                                                             │
│ 3. When SENDING, include entire vector V                    │
│                                                             │
│ 4. When RECEIVING message with vector Vm:                   │
│    V[i] = V[i] + 1                                          │
│    For each j: V[j] = max(V[j], Vm[j])                      │
└─────────────────────────────────────────────────────────────┘
```

### Comparing Vector Clocks

```text
Given vectors Va and Vb:

Va = Vb  if: Va[i] = Vb[i] for all i
Va ≤ Vb  if: Va[i] ≤ Vb[i] for all i
Va < Vb  if: Va ≤ Vb AND Va ≠ Vb

Event ordering:
├── A → B  if: V(A) < V(B)
├── B → A  if: V(B) < V(A)
├── A || B if: neither V(A) ≤ V(B) nor V(B) ≤ V(A)

Example:
Va = [2, 3, 1]
Vb = [2, 4, 1]

Va ≤ Vb? Yes (2≤2, 3≤4, 1≤1)
Va < Vb? Yes (≤ and different)
Therefore: A → B

Vc = [3, 2, 1]
Vd = [2, 3, 2]

Vc ≤ Vd? No (3 > 2 in position 0)
Vd ≤ Vc? No (2 < 3 in position 1, 2 > 1 in position 2)
Therefore: C || D (concurrent!)
```

### Example

```text
3 processes: P, Q, R
Vectors: [P, Q, R]

P                    Q                    R
[1,0,0]              [0,0,0]              [0,0,0]
   A ─────────────────→
                     [1,1,0]
                        B
[2,0,0]              
   C                 [1,2,0]
                        D ─────────────────→
                                         [1,2,1]
                                            E
                     ←───────────────────[1,2,2]
                     [1,3,2]                 F
                        G

Events and vectors:
A: [1,0,0]
B: [1,1,0]
C: [2,0,0]
D: [1,2,0]
E: [1,2,1]
F: [1,2,2]
G: [1,3,2]

Ordering analysis:
A → B: [1,0,0] < [1,1,0] ✓ (message from P to Q)
C and D: [2,0,0] vs [1,2,0]
         - 2 > 1 (C has more P knowledge)
         - 0 < 2 (D has more Q knowledge)
         → CONCURRENT! (C || D)
E → G: [1,2,1] < [1,3,2] ✓ (transitive through F)
```

### Vector Clock Implementation

```java
public class VectorClock {
    private final Map<String, Long> clock;
    private final String nodeId;
    
    public VectorClock(String nodeId) {
        this.nodeId = nodeId;
        this.clock = new ConcurrentHashMap<>();
        this.clock.put(nodeId, 0L);
    }
    
    // Local event
    public synchronized VectorClock tick() {
        clock.merge(nodeId, 1L, Long::sum);
        return copy();
    }
    
    // Send event
    public synchronized VectorClock send() {
        return tick();  // Same as local event
    }
    
    // Receive event - merge with sender's clock
    public synchronized VectorClock receive(VectorClock senderClock) {
        // Merge: take max of each component
        for (Map.Entry<String, Long> entry : senderClock.clock.entrySet()) {
            clock.merge(entry.getKey(), entry.getValue(), Long::max);
        }
        // Increment own counter
        clock.merge(nodeId, 1L, Long::sum);
        return copy();
    }
    
    // Compare clocks
    public Ordering compare(VectorClock other) {
        boolean thisBeforeOrEqual = true;
        boolean otherBeforeOrEqual = true;
        
        Set<String> allNodes = new HashSet<>();
        allNodes.addAll(this.clock.keySet());
        allNodes.addAll(other.clock.keySet());
        
        for (String node : allNodes) {
            long thisValue = this.clock.getOrDefault(node, 0L);
            long otherValue = other.clock.getOrDefault(node, 0L);
            
            if (thisValue > otherValue) {
                otherBeforeOrEqual = false;
            }
            if (thisValue < otherValue) {
                thisBeforeOrEqual = false;
            }
        }
        
        if (thisBeforeOrEqual && otherBeforeOrEqual) {
            return Ordering.EQUAL;
        } else if (thisBeforeOrEqual) {
            return Ordering.BEFORE;
        } else if (otherBeforeOrEqual) {
            return Ordering.AFTER;
        } else {
            return Ordering.CONCURRENT;
        }
    }
    
    private VectorClock copy() {
        VectorClock copy = new VectorClock(nodeId);
        copy.clock.putAll(this.clock);
        return copy;
    }
}

public enum Ordering {
    BEFORE,     // this → other
    AFTER,      // other → this
    EQUAL,      // same event
    CONCURRENT  // no causal relationship
}
```

---

## 5. Hybrid Logical Clocks (HLC)

### Why HLC?

```text
LAMPORT CLOCKS: No physical time (can't correlate with real world)
VECTOR CLOCKS: Size grows with number of nodes

HLC: Best of both worlds!
├── Bounded size (single timestamp)
├── Includes physical time (correlates with real world)
├── Maintains causality guarantees
└── Used by: CockroachDB, MongoDB
```

### HLC Structure

```text
HLC timestamp = (physical time, logical counter)
               = (l, c)

l: Physical timestamp (wall clock), but may lag behind
c: Logical counter, resets when l advances

Rules:
┌─────────────────────────────────────────────────────────────┐
│ LOCAL EVENT or SEND:                                         │
│   l' = max(l, physical_time)                                │
│   if l' == l:                                                │
│       c' = c + 1    (same physical time, increment logical) │
│   else:                                                      │
│       c' = 0        (new physical time, reset counter)      │
│                                                             │
│ RECEIVE with sender (l_m, c_m):                              │
│   l' = max(l, l_m, physical_time)                           │
│   if l' == l == l_m:                                         │
│       c' = max(c, c_m) + 1                                   │
│   else if l' == l:                                           │
│       c' = c + 1                                             │
│   else if l' == l_m:                                         │
│       c' = c_m + 1                                           │
│   else:                                                      │
│       c' = 0                                                 │
└─────────────────────────────────────────────────────────────┘
```

### HLC Implementation

```java
public class HybridLogicalClock {
    private long logicalTime;  // Physical component
    private long counter;      // Logical component
    
    public HybridLogicalClock() {
        this.logicalTime = System.currentTimeMillis();
        this.counter = 0;
    }
    
    public synchronized HLCTimestamp now() {
        long physicalTime = System.currentTimeMillis();
        
        if (physicalTime > logicalTime) {
            logicalTime = physicalTime;
            counter = 0;
        } else {
            counter++;
        }
        
        return new HLCTimestamp(logicalTime, counter);
    }
    
    public synchronized HLCTimestamp receive(HLCTimestamp remote) {
        long physicalTime = System.currentTimeMillis();
        
        if (physicalTime > logicalTime && physicalTime > remote.logicalTime) {
            // Physical time is newest
            logicalTime = physicalTime;
            counter = 0;
        } else if (logicalTime > remote.logicalTime) {
            // Our logical time is newest
            counter++;
        } else if (remote.logicalTime > logicalTime) {
            // Remote logical time is newest
            logicalTime = remote.logicalTime;
            counter = remote.counter + 1;
        } else {
            // Same logical time
            counter = Math.max(counter, remote.counter) + 1;
        }
        
        return new HLCTimestamp(logicalTime, counter);
    }
}

public record HLCTimestamp(long logicalTime, long counter) 
    implements Comparable<HLCTimestamp> {
    
    @Override
    public int compareTo(HLCTimestamp other) {
        int timeCompare = Long.compare(this.logicalTime, other.logicalTime);
        if (timeCompare != 0) return timeCompare;
        return Long.compare(this.counter, other.counter);
    }
    
    // Fits in 64 bits!
    public long toPackedLong() {
        // 48 bits for time (enough for 8000+ years)
        // 16 bits for counter (65536 events per ms)
        return (logicalTime << 16) | (counter & 0xFFFF);
    }
}
```

---

## 6. Practical Applications

### Conflict Resolution with Vector Clocks

```text
Scenario: Distributed key-value store with concurrent updates

Client A: put("key", "value-A") → Vector: [2, 0]
Client B: put("key", "value-B") → Vector: [0, 1]

Both updates happen concurrently!

Resolution options:
1. LAST-WRITE-WINS: Use physical time, may lose data
2. VECTOR CLOCK MERGE: Return both, let application decide
3. CRDT: Automatically mergeable data structure
```

```java
// Dynamo-style conflict detection
public class VersionedValue<T> {
    private final T value;
    private final VectorClock version;
    
    // Check if this supersedes another version
    public boolean supersedes(VersionedValue<T> other) {
        return this.version.compare(other.version) == Ordering.AFTER;
    }
    
    // Check for conflict
    public boolean conflictsWith(VersionedValue<T> other) {
        return this.version.compare(other.version) == Ordering.CONCURRENT;
    }
}

public class DynamoStore<K, V> {
    private final Map<K, List<VersionedValue<V>>> store = new ConcurrentHashMap<>();
    
    public void put(K key, V value, VectorClock version) {
        List<VersionedValue<V>> existing = store.getOrDefault(key, new ArrayList<>());
        VersionedValue<V> newValue = new VersionedValue<>(value, version);
        
        // Remove superseded versions
        existing.removeIf(v -> newValue.supersedes(v));
        
        // Add new version (may result in multiple concurrent versions)
        existing.add(newValue);
        store.put(key, existing);
    }
    
    public List<VersionedValue<V>> get(K key) {
        // Return all versions - could be multiple if concurrent!
        return store.getOrDefault(key, List.of());
    }
}
```

### Event Ordering in Distributed Log

```java
// Using HLC for distributed event log
public class DistributedEventLog {
    private final HybridLogicalClock hlc;
    private final EventStore eventStore;
    
    public void append(Event event) {
        HLCTimestamp timestamp = hlc.now();
        event.setTimestamp(timestamp);
        eventStore.append(event);
    }
    
    public void receive(Event remoteEvent) {
        // Update clock based on remote event
        hlc.receive(remoteEvent.getTimestamp());
        
        // Store event with updated timestamp
        eventStore.append(remoteEvent);
    }
    
    public List<Event> getEventsSince(HLCTimestamp since) {
        // Events are ordered by HLC timestamp
        return eventStore.streamFrom(since)
            .sorted(Comparator.comparing(Event::getTimestamp))
            .collect(toList());
    }
}
```

### Debugging with Causality

```text
Problem: "Why did X happen?"

With vector clocks, you can trace causality:

Event E with vector [3, 5, 2]
├── Depends on: P had 3 events, Q had 5, R had 2
├── Find events with smaller vectors
└── Build causality graph

Graph:
        [1,0,0] 
           A
          / \
    [2,0,0]  [1,1,0]
        B       C
         \     /
        [2,2,0]
           D
           |
        [3,5,2]
           E

"E happened because of A, B, C, D (and more...)"

This is invaluable for debugging distributed systems!
```

---

## 7. Interview Questions

### Q1: Explain the happens-before relationship

```text
Answer:
"The happens-before relationship (→) defines causal ordering in 
distributed systems. It tells us when one event definitely happened 
before another.

A → B if:
1. SAME PROCESS: A and B are on the same process and A executes 
   before B (program order)

2. MESSAGE: A is sending a message that B receives. The send must 
   happen before the receive.

3. TRANSITIVITY: If A → B and B → C, then A → C.

If neither A → B nor B → A, they are CONCURRENT (A || B).
This means there's no way to determine which happened first - 
they happened 'at the same time' from a causality perspective.

This matters because:
- Wall clocks can't reliably order events across machines
- Concurrent events may conflict and need resolution
- Understanding causality is key to consistency guarantees"
```

### Q2: What's the difference between Lamport and Vector clocks?

```text
Answer:
"Both are logical clocks, but with different capabilities:

LAMPORT CLOCKS:
- Single integer per process
- If A → B, then L(A) < L(B)
- BUT: L(A) < L(B) doesn't mean A → B
- Can't detect concurrent events!
- Space: O(1) per event

VECTOR CLOCKS:
- Array of integers, one per process
- If A → B, then V(A) < V(B)
- If neither V(A) ≤ V(B) nor V(B) ≤ V(A), then A || B
- CAN detect concurrent events!
- Space: O(N) per event where N is number of processes

When to use each:
- Lamport: Simple ordering, don't need to detect concurrency
           Example: Ordered message delivery
           
- Vector: Need to detect concurrent updates for conflict resolution
          Example: Dynamo-style key-value stores

Trade-off: Vector clocks give more information but at cost of 
           space (grows with number of nodes)."
```

### Q3: How does a distributed database use these clocks?

```text
Answer:
"Different databases use different approaches:

SPANNER (Google):
- Uses TrueTime API (GPS + atomic clocks)
- Physical time with known error bounds
- Wait out uncertainty before commit
- Achieves external consistency

COCKROACHDB:
- Uses Hybrid Logical Clocks (HLC)
- Combines physical time with logical counter
- Bounded size (single timestamp)
- Provides causal consistency

DYNAMODB / RIAK:
- Uses Vector Clocks for conflict detection
- Returns conflicting versions to client
- Client resolves conflicts
- Good for high availability

Example usage in CockroachDB:
1. Transaction starts, gets HLC timestamp T1
2. All reads are as of T1
3. On commit, get new timestamp T2
4. Write with T2
5. If T2 < another transaction's timestamp, conflict!

The key is: these clocks help determine order for 
concurrency control without requiring global locks."
```

### Q4: How would you implement causal consistency using vector clocks?

```text
Answer:
"Causal consistency means: if operation A causally precedes B, 
all nodes see A before B.

Implementation:

1. ATTACH VECTOR CLOCK TO EACH WRITE:
   When client writes, include their last-observed clock.
   
2. SERVER UPDATES CLOCK:
   Server merges client clock with its own.
   Assigns new clock to write.
   
3. BLOCK READS UNTIL CAUSAL DEPENDENCIES MET:
   When reading from replica, check if replica has seen
   all causally prior writes.
   
Code sketch:
class CausalStore:
    def write(key, value, client_clock):
        # Wait for dependencies
        while not dependencies_satisfied(client_clock):
            wait()
        
        # Merge clocks
        my_clock = merge(my_clock, client_clock)
        my_clock.increment()
        
        # Store with clock
        store[key] = (value, my_clock)
        
        return my_clock
    
    def read(key, client_clock):
        # Wait until we've seen client's dependencies
        while not dependencies_satisfied(client_clock):
            wait()
        
        return store[key]

This ensures clients always see effects of their prior 
operations and any causally related operations by others."
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│              DISTRIBUTED CLOCKS CHEAT SHEET                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ HAPPENS-BEFORE (→):                                                   │
│ ├── Same process, A before B: A → B                                   │
│ ├── A sends, B receives: A → B                                        │
│ ├── Transitive: A → B ∧ B → C ⟹ A → C                                │
│ └── Concurrent: A || B if NOT(A → B) AND NOT(B → A)                   │
│                                                                       │
│ LAMPORT CLOCK:                                                        │
│ ├── Single integer counter                                            │
│ ├── Increment before every event                                      │
│ ├── On receive: max(local, msg) + 1                                   │
│ ├── If A → B then L(A) < L(B)                                        │
│ └── Cannot detect concurrency!                                        │
│                                                                       │
│ VECTOR CLOCK:                                                         │
│ ├── Array [C₁, C₂, ..., Cₙ] for N processes                          │
│ ├── Increment own counter before event                                │
│ ├── On receive: max element-wise, then increment own                  │
│ ├── A → B if V(A) < V(B) (all elements ≤, at least one <)            │
│ ├── A || B if neither V(A) ≤ V(B) nor V(B) ≤ V(A)                    │
│ └── CAN detect concurrency!                                          │
│                                                                       │
│ HYBRID LOGICAL CLOCK (HLC):                                           │
│ ├── (physical_time, logical_counter)                                  │
│ ├── Bounded size (doesn't grow with nodes)                            │
│ ├── Correlates with real time                                         │
│ └── Used by: CockroachDB, MongoDB                                     │
│                                                                       │
│ COMPARISON:                                                           │
│ ├── Lamport: O(1) space, no concurrency detection                     │
│ ├── Vector: O(N) space, full causality tracking                       │
│ └── HLC: O(1) space, physical time + causality                        │
│                                                                       │
│ USE CASES:                                                            │
│ ├── Lamport: Ordered message delivery, simple ordering                │
│ ├── Vector: Conflict detection, causal consistency                    │
│ └── HLC: Distributed databases, global ordering                       │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Next:** [8. Failure Handling & Resilience →](./failure-handling)

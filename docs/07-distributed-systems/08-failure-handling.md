---
title: 8. Failure Handling & Resilience
sidebar_position: 8
description: Master failure detection, split-brain, Byzantine faults, and building resilient distributed systems for interviews.
keywords: [failure detection, split brain, byzantine fault, heartbeat, fencing, resilience]
---

# Failure Handling & Resilience

:::info Interview Importance ⭐⭐⭐⭐
Understanding how distributed systems fail and how to build resilient systems is essential for system design interviews. This separates engineers who build toy systems from those who build production systems.
:::

## 1. Types of Failures

### Failure Classification

```text
┌─────────────────────────────────────────────────────────────┐
│                   FAILURE TYPES                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. CRASH FAILURES                                          │
│     └── Node stops working completely                       │
│     └── No response at all                                  │
│     └── Easiest to detect (timeout)                         │
│                                                             │
│  2. OMISSION FAILURES                                       │
│     └── Node fails to send or receive messages              │
│     └── May be working internally but can't communicate     │
│     └── Network issue vs node issue unclear                 │
│                                                             │
│  3. TIMING FAILURES                                         │
│     └── Response comes but too late (timeout)               │
│     └── Is it slow or dead?                                 │
│     └── Hard to distinguish from crash                      │
│                                                             │
│  4. BYZANTINE FAILURES                                      │
│     └── Node behaves arbitrarily/maliciously                │
│     └── May send different data to different nodes          │
│     └── Hardest to handle                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Failure Assumptions

```text
CRASH-STOP MODEL:
├── Nodes either work correctly or completely stop
├── No partial failures, no malicious behavior
├── After crash, node doesn't come back (or comes back cleaned)
├── Simplest model, basis for many algorithms
└── Example: Simple server crash

CRASH-RECOVERY MODEL:
├── Nodes can crash and restart
├── Must persist state before crash (durable storage)
├── On recovery, node rebuilds state from logs
├── More realistic for real systems
└── Example: Database with WAL

BYZANTINE MODEL:
├── Nodes can behave arbitrarily
├── May lie, delay messages, or act maliciously
├── Requires 3f+1 nodes to tolerate f faulty nodes
├── Used in: Blockchains, high-security systems
└── Example: Public blockchain with untrusted nodes

Most real systems assume CRASH-RECOVERY.
Byzantine tolerance is expensive (rarely used except crypto).
```

---

## 2. Failure Detection

### The Detection Problem

```text
FUNDAMENTAL CHALLENGE:
"In a distributed system, it's impossible to distinguish 
between a slow node and a dead node."

Why?
├── Network could be partitioned
├── Node could be overloaded (GC pause)
├── Message could be delayed
├── All look the same: no response

Implications:
├── Can't have perfect failure detection
├── Must use timeouts (may be wrong!)
├── Trade-off: fast detection vs false positives
└── False positives can cause split-brain
```

### Heartbeat-based Detection

```text
SIMPLE HEARTBEATS:

Node A ───heartbeat───→ Monitor
          every 5s

Monitor:
├── Last heartbeat from A: T_last
├── Current time: T_now
├── Timeout: 15 seconds
├── If T_now - T_last > 15s → A is DEAD (probably)

Problems:
├── High timeout: Slow detection
├── Low timeout: False positives (network hiccup = declared dead)
├── Fixed timeout doesn't adapt to conditions
```

### Phi Accrual Failure Detector

```text
ADAPTIVE FAILURE DETECTION:
Instead of "ALIVE/DEAD", output SUSPICION LEVEL (φ)

                    ┌─────────────────────────────────────┐
                    │                                     │
    Heartbeats      │  Analyze arrival times              │
    arrival times   │  Calculate standard deviation       │
         │          │  How late is current heartbeat?     │
         ↓          │                                     │
    ┌─────────┐     │  φ = probability node has failed    │
    │ Samples │────→│                                     │
    └─────────┘     │  φ=1: 10% chance of mistake         │
                    │  φ=2: 1% chance of mistake          │
                    │  φ=3: 0.1% chance of mistake        │
                    └─────────────────────────────────────┘

Application chooses threshold based on needs:
├── φ > 3: Declare node SUSPECTED (aggressive)
├── φ > 8: Declare node DEAD (conservative)
├── Adaptive to network conditions!
└── Used by: Akka, Cassandra
```

### Implementation

```java
public class PhiAccrualFailureDetector {
    private final List<Long> heartbeatIntervals = new ArrayList<>();
    private long lastHeartbeat = System.currentTimeMillis();
    private final int maxSamples = 1000;
    
    // Called when heartbeat received
    public synchronized void heartbeat() {
        long now = System.currentTimeMillis();
        long interval = now - lastHeartbeat;
        lastHeartbeat = now;
        
        heartbeatIntervals.add(interval);
        if (heartbeatIntervals.size() > maxSamples) {
            heartbeatIntervals.remove(0);
        }
    }
    
    // Calculate phi value
    public synchronized double phi() {
        if (heartbeatIntervals.size() < 10) {
            return 0;  // Not enough data
        }
        
        long now = System.currentTimeMillis();
        long timeSinceLastHeartbeat = now - lastHeartbeat;
        
        double mean = calculateMean();
        double stdDev = calculateStdDev(mean);
        
        // Normal distribution CDF
        // phi = -log10(probability that heartbeat will still arrive)
        double y = (timeSinceLastHeartbeat - mean) / stdDev;
        double probability = 1.0 / (1.0 + Math.exp(-y));  // Sigmoid approx
        
        return -Math.log10(1 - probability);
    }
    
    public boolean isAvailable(double threshold) {
        return phi() < threshold;
    }
    
    private double calculateMean() {
        return heartbeatIntervals.stream()
            .mapToLong(Long::longValue)
            .average()
            .orElse(0);
    }
    
    private double calculateStdDev(double mean) {
        return Math.sqrt(heartbeatIntervals.stream()
            .mapToDouble(i -> Math.pow(i - mean, 2))
            .average()
            .orElse(0));
    }
}
```

---

## 3. Split-Brain Problem

### What is Split-Brain?

```text
SPLIT-BRAIN: Network partition causes multiple "leaders"

Before partition:
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    [Node A: Leader] ←──── [Node B] ←──── [Node C]          │
│                                                             │
│    All nodes agree: A is leader                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘

After partition:
┌───────────────────┐  X  ┌───────────────────────────────────┐
│                   │  X  │                                   │
│    [Node A] alone │  X  │    [Node B] ←──── [Node C]       │
│    "I'm leader!"  │  X  │    "B is new leader!"            │
│                   │  X  │                                   │
└───────────────────┘  X  └───────────────────────────────────┘
                       X
                 Network Partition

Problem:
├── A thinks it's still leader
├── B elected as new leader
├── Clients might reach either
├── Both accept writes → DATA DIVERGENCE!
```

### Split-Brain Solutions

#### 1. Quorum-Based Prevention

```text
RULE: Require majority for all operations

5 nodes split into 2 + 3:

Minority (2 nodes):
├── Can't form quorum (need 3)
├── Can't elect leader
├── Stops accepting writes
└── Read-only or unavailable

Majority (3 nodes):
├── Can form quorum
├── Elects new leader
├── Continues operating
└── Maintains consistency

ONLY ONE PARTITION CAN HAVE MAJORITY!
```

#### 2. Fencing Tokens

```text
PROBLEM: Old leader "wakes up" after partition heals

┌─────────────────────────────────────────────────────────────┐
│ T0: Node A is leader, token = 10                            │
│ T1: Partition happens                                       │
│ T2: Node B becomes leader, token = 11                       │
│ T3: Partition heals                                         │
│ T4: Node A thinks it's still leader! (token = 10)           │
│     A tries to write...                                     │
│                                                             │
│ Storage sees: token 10 < current token 11 → REJECT!         │
└─────────────────────────────────────────────────────────────┘

Every leader gets MONOTONICALLY INCREASING token.
Storage/resources reject writes with old tokens.
```

```java
// Fencing token implementation
public class FencedLock {
    private final AtomicLong fencingToken = new AtomicLong(0);
    private volatile String holder;
    
    public long acquire(String nodeId) {
        // In reality, this would be distributed via consensus
        long token = fencingToken.incrementAndGet();
        holder = nodeId;
        return token;
    }
    
    public boolean isValidToken(long token) {
        return token >= fencingToken.get();
    }
}

// Resource that respects fencing
public class FencedResource {
    private long lastSeenToken = 0;
    
    public synchronized void write(long fencingToken, Data data) {
        if (fencingToken < lastSeenToken) {
            throw new StaleFencingTokenException(
                "Token " + fencingToken + " is stale, current is " + lastSeenToken
            );
        }
        lastSeenToken = fencingToken;
        doWrite(data);
    }
}
```

#### 3. STONITH (Shoot The Other Node In The Head)

```text
STONITH: Physically ensure old leader can't operate

Methods:
├── Power off the node remotely (IPMI/BMC)
├── Network isolation (disable switch port)
├── Storage fencing (revoke disk access)
└── Kill pill (self-destruct command from watchdog)

Why so aggressive?
├── If you can't reach the node, you can't know its state
├── It might be processing requests
├── Only certainty: physically disable it

Used by: Pacemaker, MySQL clustering
```

---

## 4. Byzantine Fault Tolerance

### Understanding Byzantine Failures

```text
The Byzantine Generals Problem (Lamport, 1982):

Generals surround a city. Must decide: ATTACK or RETREAT.
Some generals may be TRAITORS (send conflicting orders).

General A: "Attack!"
General B: "Attack!"
General C (traitor): 
   To A: "Attack!"
   To B: "Retreat!"

Result: A attacks, B retreats → Army fails!

In distributed systems:
├── Generals = Nodes
├── City = Consensus decision
├── Traitors = Faulty/malicious nodes
├── Messages = Network communication
```

### When Byzantine Tolerance Matters

```text
WHEN YOU NEED IT:
├── Public blockchains (untrusted participants)
├── Multi-party computation (don't trust other parties)
├── Safety-critical systems (aerospace, nuclear)
├── Financial systems between competing institutions

WHEN YOU DON'T:
├── Single organization's infrastructure
├── Trusted environment (internal network)
├── Most typical distributed applications
├── Cost of Byzantine tolerance too high

COST:
├── Need 3f+1 nodes to tolerate f Byzantine faults
├── More message overhead
├── More rounds of communication
├── Significantly slower
```

### Practical Byzantine Fault Tolerance (PBFT)

```text
PBFT Protocol (simplified):

Phases:
1. PRE-PREPARE: Primary broadcasts request
2. PREPARE: Nodes broadcast that they received it
3. COMMIT: Nodes broadcast that they're ready to commit
4. REPLY: Done after 2f+1 matching commits

Requirements:
├── 3f+1 total nodes for f Byzantine faults
├── 3 nodes can tolerate 0 faults (useless)
├── 4 nodes can tolerate 1 fault
├── 7 nodes can tolerate 2 faults

Why 3f+1?
├── Need 2f+1 nodes to agree (quorum)
├── Up to f might be faulty and lying
├── 2f+1 good nodes exist only if total >= 3f+1
├── Among 2f+1 responses, at least f+1 are honest
```

---

## 5. Handling Partial Failures

### What are Partial Failures?

```text
PARTIAL FAILURE: Some components fail, others work

Example: Distributed transaction
├── Service A: Committed
├── Service B: Unknown (timeout)
├── Service C: Not yet called

What state is B in?
├── Maybe committed
├── Maybe failed
├── Maybe stuck processing
├── WE DON'T KNOW!

This is the HARDEST problem in distributed systems.
```

### Strategies for Partial Failures

#### 1. Idempotency

```text
MAKE OPERATIONS SAFE TO RETRY

Non-idempotent:
balance = balance + 100  ← Run twice = wrong!

Idempotent:
balance = 500  ← Run twice = same result ✓

OR

if (not already_processed(request_id)):
    balance = balance + 100
    mark_processed(request_id)
```

```java
@Service
public class IdempotentPaymentService {
    private final Set<String> processedIds = ConcurrentHashMap.newKeySet();
    
    public PaymentResult processPayment(String idempotencyKey, Payment payment) {
        // Check if already processed
        if (processedIds.contains(idempotencyKey)) {
            return getStoredResult(idempotencyKey);
        }
        
        // Process payment
        PaymentResult result = doPayment(payment);
        
        // Store result with idempotency key
        storeResult(idempotencyKey, result);
        processedIds.add(idempotencyKey);
        
        return result;
    }
}
```

#### 2. Retry with Exponential Backoff

```java
public <T> T retryWithBackoff(Supplier<T> operation, int maxRetries) {
    int retries = 0;
    long delayMs = 100;  // Initial delay
    
    while (true) {
        try {
            return operation.get();
        } catch (RetryableException e) {
            retries++;
            if (retries >= maxRetries) {
                throw new MaxRetriesExceededException(e);
            }
            
            // Add jitter to prevent thundering herd
            long jitter = (long) (Math.random() * delayMs * 0.1);
            sleep(delayMs + jitter);
            
            // Exponential backoff
            delayMs = Math.min(delayMs * 2, 30000);  // Cap at 30 seconds
        }
    }
}
```

#### 3. Timeout Management

```java
public class TimeoutConfig {
    // Different timeouts for different operations
    public static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    public static final Duration READ_TIMEOUT = Duration.ofSeconds(30);
    public static final Duration WRITE_TIMEOUT = Duration.ofSeconds(10);
    
    // Timeout after which we assume failure
    public static final Duration TRANSACTION_TIMEOUT = Duration.ofMinutes(5);
}

// Timeout handling
public <T> T executeWithTimeout(Callable<T> task, Duration timeout) 
    throws TimeoutException {
    
    ExecutorService executor = Executors.newSingleThreadExecutor();
    Future<T> future = executor.submit(task);
    
    try {
        return future.get(timeout.toMillis(), TimeUnit.MILLISECONDS);
    } catch (TimeoutException e) {
        future.cancel(true);
        // Don't know if it completed or not!
        // Log for manual investigation
        log.warn("Operation timed out after {}", timeout);
        throw e;
    } finally {
        executor.shutdownNow();
    }
}
```

---

## 6. Designing for Resilience

### Resilience Patterns

```text
┌─────────────────────────────────────────────────────────────┐
│                   RESILIENCE PATTERNS                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. CIRCUIT BREAKER                                         │
│     └── Stop calling failing service                        │
│     └── Prevent cascade failures                            │
│                                                             │
│  2. BULKHEAD                                                │
│     └── Isolate components                                  │
│     └── Failure in one doesn't affect others               │
│                                                             │
│  3. RATE LIMITING                                           │
│     └── Prevent overload                                    │
│     └── Degrade gracefully                                  │
│                                                             │
│  4. HEALTH CHECKS                                           │
│     └── Detect failures early                               │
│     └── Remove unhealthy instances                          │
│                                                             │
│  5. GRACEFUL DEGRADATION                                    │
│     └── Reduce functionality vs total failure               │
│     └── Fallback to cached data                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Circuit Breaker Implementation

```java
public class CircuitBreaker {
    private enum State { CLOSED, OPEN, HALF_OPEN }
    
    private State state = State.CLOSED;
    private int failureCount = 0;
    private long lastFailureTime = 0;
    
    private final int failureThreshold = 5;
    private final long resetTimeMs = 30000;
    
    public <T> T execute(Supplier<T> supplier, Supplier<T> fallback) {
        if (state == State.OPEN) {
            if (shouldAttemptReset()) {
                state = State.HALF_OPEN;
            } else {
                return fallback.get();
            }
        }
        
        try {
            T result = supplier.get();
            onSuccess();
            return result;
        } catch (Exception e) {
            onFailure();
            return fallback.get();
        }
    }
    
    private synchronized void onSuccess() {
        failureCount = 0;
        state = State.CLOSED;
    }
    
    private synchronized void onFailure() {
        failureCount++;
        lastFailureTime = System.currentTimeMillis();
        
        if (failureCount >= failureThreshold) {
            state = State.OPEN;
        }
    }
    
    private boolean shouldAttemptReset() {
        return System.currentTimeMillis() - lastFailureTime > resetTimeMs;
    }
}
```

### Bulkhead Pattern

```java
// Isolate different services with separate thread pools
@Configuration
public class BulkheadConfig {
    
    @Bean
    public ExecutorService paymentServiceExecutor() {
        // Payment service gets its own pool
        return new ThreadPoolExecutor(
            10, 20,  // Core and max threads
            60, TimeUnit.SECONDS,
            new LinkedBlockingQueue<>(100),  // Bounded queue
            new ThreadPoolExecutor.CallerRunsPolicy()  // Backpressure
        );
    }
    
    @Bean
    public ExecutorService inventoryServiceExecutor() {
        // Inventory service isolated from payment
        return new ThreadPoolExecutor(
            5, 10,
            60, TimeUnit.SECONDS,
            new LinkedBlockingQueue<>(50),
            new ThreadPoolExecutor.CallerRunsPolicy()
        );
    }
}

// If payment service is slow/failing, 
// it only exhausts its own thread pool.
// Inventory service continues working!
```

---

## 7. Interview Questions

### Q1: How do you detect failures in a distributed system?

```text
Answer:
"Failure detection in distributed systems is fundamentally uncertain - 
we can't distinguish between a slow node and a dead node.

Common approaches:

1. HEARTBEAT-BASED:
   - Nodes send periodic 'I'm alive' messages
   - No heartbeat after timeout → presumed dead
   - Simple but binary (alive/dead)
   - Tuning timeout is tricky:
     - Too short → false positives
     - Too long → slow detection

2. PHI ACCRUAL DETECTOR:
   - Adaptive failure detection
   - Outputs suspicion level (phi) not binary
   - Accounts for network variance
   - Application chooses threshold
   - Used by Akka, Cassandra

3. GOSSIP-BASED:
   - Nodes gossip health information
   - Multiple nodes confirm failure
   - Reduces false positives
   - Used by Consul

Best practices:
- Use multiple signals (heartbeat + health checks)
- Have recovery procedures for false positives
- Monitor detection accuracy
- Use adaptive thresholds when possible"
```

### Q2: Explain split-brain and how to prevent it

```text
Answer:
"Split-brain occurs when a network partition causes multiple nodes
to think they're the leader, accepting conflicting writes.

Example: 5-node cluster splits 2+3
- Minority (2): Can't reach majority, might elect own leader
- If both sides have leaders → data divergence!

Prevention strategies:

1. QUORUM REQUIREMENT:
   - Require majority (3/5) for all decisions
   - Minority can't form quorum → stops accepting writes
   - Simple and effective
   - Downside: Minority becomes unavailable

2. FENCING TOKENS:
   - Each leader gets monotonically increasing token
   - Resources reject operations with stale tokens
   - Even if old leader thinks it's leader, writes rejected
   - Requires cooperation from storage layer

3. LEASE-BASED:
   - Leader holds time-limited lease
   - Must renew before expiry
   - On partition, can't renew → steps down
   - Relies on reasonably synchronized clocks

4. STONITH:
   - Physically disable suspected node
   - Power off, network isolation
   - Extreme but certain
   - Used in HA database clusters

I'd recommend quorum + fencing tokens together for maximum safety."
```

### Q3: How would you handle a scenario where a service is partially failing?

```text
Answer:
"Partial failures are the hardest - we don't know what state 
remote services are in. Here's my approach:

1. DETECTION:
   - Health checks (liveness + readiness)
   - Error rate monitoring
   - Latency percentile tracking (p99)
   - Distinguish timeout vs error vs success

2. CIRCUIT BREAKER:
   - If error rate exceeds threshold, stop calling
   - Prevent cascade failures
   - Allow recovery with half-open state
   - Return fallback/cached data

3. RETRY WITH IDEMPOTENCY:
   - Design operations to be idempotent
   - Use idempotency keys (request ID)
   - Retry with exponential backoff
   - Cap retries to prevent overload

4. GRACEFUL DEGRADATION:
   - If recommendation service down, show popular items
   - If payment slow, show 'processing' state
   - Prioritize core functionality

5. TIMEOUT MANAGEMENT:
   - Different timeouts for different operations
   - Timeout after 'reasonable' time
   - Log for investigation

6. SAGA FOR DISTRIBUTED TRANSACTIONS:
   - If mid-transaction, run compensating actions
   - Persist saga state for recovery
   - Retry compensations until success

Example flow:
try:
    result = circuit_breaker.execute(service.call)
except CircuitOpenException:
    result = fallback_cache.get()
except TimeoutException:
    log_for_investigation()
    result = fallback_or_retry()"
```

### Q4: What's the difference between crash failures and Byzantine failures?

```text
Answer:
"These represent different failure models with different complexity:

CRASH FAILURES:
- Node either works correctly or stops completely
- No partial or malicious behavior
- Easy to reason about
- Most practical systems assume this
- Tolerate f failures with 2f+1 nodes

Examples:
- Server runs out of memory, crashes
- Power outage kills machine
- Kernel panic

BYZANTINE FAILURES:
- Node can behave arbitrarily
- May send different messages to different nodes
- May lie about its state
- Hardest to handle
- Tolerate f failures with 3f+1 nodes

Examples:
- Hacked node sends malicious data
- Data corruption causes wrong responses
- Malicious participant in blockchain

Why 3f+1 for Byzantine?
- Need 2f+1 nodes to form quorum
- Among any 2f+1 nodes, at least f+1 are honest
- f+1 honest nodes form majority of quorum
- Can detect lies by comparing responses

When to use Byzantine tolerance:
- Blockchains (untrusted participants)
- Multi-party computation
- Safety-critical systems

Most internal systems use crash-recovery model because:
- Much simpler algorithms
- Lower overhead (fewer nodes, messages)
- We trust our own infrastructure"
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│              FAILURE HANDLING CHEAT SHEET                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ FAILURE TYPES:                                                        │
│ ├── Crash: Node stops completely                                      │
│ ├── Omission: Fails to send/receive messages                          │
│ ├── Timing: Response too slow                                         │
│ └── Byzantine: Arbitrary/malicious behavior                           │
│                                                                       │
│ FAILURE DETECTION:                                                    │
│ ├── Heartbeat: Periodic 'alive' messages                              │
│ ├── Phi Accrual: Adaptive suspicion level                             │
│ ├── Timeout tradeoff: Fast detection vs false positives               │
│ └── Can't distinguish slow from dead!                                 │
│                                                                       │
│ SPLIT-BRAIN PREVENTION:                                               │
│ ├── Quorum: Require majority for decisions                            │
│ ├── Fencing tokens: Monotonic increasing tokens                       │
│ ├── STONITH: Physically disable contested node                        │
│ └── Leases: Time-limited leadership                                   │
│                                                                       │
│ FAULT TOLERANCE REQUIREMENTS:                                         │
│ ├── Crash faults: 2f+1 nodes for f failures                           │
│ └── Byzantine faults: 3f+1 nodes for f failures                       │
│                                                                       │
│ RESILIENCE PATTERNS:                                                  │
│ ├── Circuit Breaker: Stop calling failing service                     │
│ ├── Bulkhead: Isolate failures                                        │
│ ├── Retry + Backoff: Handle transient failures                        │
│ ├── Idempotency: Safe to retry                                        │
│ ├── Timeout: Don't wait forever                                       │
│ └── Graceful Degradation: Reduce vs fail                              │
│                                                                       │
│ PARTIAL FAILURE HANDLING:                                             │
│ ├── Design for idempotency                                            │
│ ├── Use circuit breakers                                              │
│ ├── Have fallbacks ready                                              │
│ ├── Log unknown states for investigation                              │
│ └── Use Saga for distributed transactions                             │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Congratulations!** You've completed the Distributed Systems section. These concepts are essential for designing and building reliable, scalable systems.

**Back to:** [← Distributed Systems Overview](./intro)

**Next:** [8. Caching →](../08-caching/01-intro)

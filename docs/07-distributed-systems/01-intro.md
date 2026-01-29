---
sidebar_position: 1
title: Syllabus & Overview
---

# 8. DISTRIBUTED SYSTEMS

:::info Interview Importance ⭐⭐⭐⭐⭐
Distributed Systems is a **core topic** for SDE 2+ interviews. Understanding these concepts is essential for designing scalable, fault-tolerant systems. Expect questions on CAP theorem, consistency models, consensus algorithms, and handling failure scenarios.
:::

## Topics Covered

### Chapter 2: CAP Theorem & Consistency Models
```text
CAP THEOREM
├── Consistency, Availability, Partition Tolerance
├── Why you can only pick 2 (CP vs AP)
├── Real-world trade-offs
└── PACELC theorem extension

CONSISTENCY MODELS
├── Strong consistency
├── Eventual consistency
├── Causal consistency
├── Read-your-writes
├── Monotonic reads
└── Linearizability vs Serializability
```

### Chapter 3: Distributed Consensus & Leader Election
```text
CONSENSUS ALGORITHMS
├── The consensus problem
├── Paxos (conceptual understanding)
├── Raft (detailed walkthrough)
└── Practical implementations (ZooKeeper, etcd)

LEADER ELECTION
├── Why we need leaders
├── Bully algorithm
├── Ring algorithm
├── Raft leader election
└── Split brain problem
```

### Chapter 4: Replication & Partitioning
```text
REPLICATION STRATEGIES
├── Single-leader (Master-Slave)
├── Multi-leader (Master-Master)
├── Leaderless (Dynamo-style)
├── Sync vs Async replication
├── Replication lag and its effects
└── Conflict resolution

PARTITIONING (SHARDING)
├── Horizontal vs Vertical partitioning
├── Key-based (Hash) partitioning
├── Range partitioning
├── Consistent hashing
├── Hot spots and how to handle them
└── Rebalancing strategies
```

### Chapter 5: Distributed Transactions
```text
DISTRIBUTED TRANSACTIONS
├── ACID in distributed systems
├── Two-Phase Commit (2PC)
├── Three-Phase Commit (3PC)
├── Why distributed TX are hard
└── When to use distributed TX

SAGA PATTERN
├── Choreography vs Orchestration
├── Compensating transactions
├── Implementation patterns
└── Real-world examples
```

### Chapter 6: Event Sourcing & CQRS
```text
EVENT SOURCING
├── Events as source of truth
├── Event store design
├── Rebuilding state from events
├── Snapshots for performance
└── Event versioning

CQRS (Command Query Responsibility Segregation)
├── Separating reads and writes
├── Read models and projections
├── Eventual consistency handling
└── When to use CQRS
```

### Chapter 7: Distributed Clocks & Ordering
```text
TIME IN DISTRIBUTED SYSTEMS
├── Why wall clocks are unreliable
├── Clock skew and drift
├── NTP limitations

LOGICAL CLOCKS
├── Lamport timestamps
├── Vector clocks
├── Hybrid logical clocks
└── Ordering guarantees
```

### Chapter 8: Failure Handling & Resilience
```text
FAILURE TYPES
├── Crash failures
├── Omission failures
├── Byzantine failures
├── Partial failures

HANDLING FAILURES
├── Failure detection (heartbeats, φ-accrual)
├── Split brain and fencing
├── Quorum-based decisions
└── Consistency during failures
```

## Chapter Overview

| Chapter | Topic | Interview Importance |
|---------|-------|----------------------|
| 2 | CAP Theorem & Consistency Models | ⭐⭐⭐⭐⭐ |
| 3 | Distributed Consensus & Leader Election | ⭐⭐⭐⭐ |
| 4 | Replication & Partitioning | ⭐⭐⭐⭐⭐ |
| 5 | Distributed Transactions (2PC, Saga) | ⭐⭐⭐⭐⭐ |
| 6 | Event Sourcing & CQRS | ⭐⭐⭐⭐ |
| 7 | Distributed Clocks & Ordering | ⭐⭐⭐ |
| 8 | Failure Handling & Resilience | ⭐⭐⭐⭐ |

### Status
✅ **Complete** - All 7 chapters implemented with detailed examples and interview questions

### Total Content
- **7 Comprehensive Chapters**
- **~200KB+ of documentation**
- **50+ Interview Questions & Answers**
- **Diagrams, Code Examples, and Quick Reference Cards**

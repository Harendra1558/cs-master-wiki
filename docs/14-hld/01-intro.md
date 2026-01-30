---
sidebar_position: 1
title: 1. Introduction
description: Master High Level Design for SDE-2 interviews with structured approach and practice problems.
keywords: [system design, hld, scalability, distributed systems, interview preparation]
---

# High Level Design (HLD)

:::danger Interview Critical ⭐⭐⭐⭐⭐
System Design rounds are **make-or-break** for SDE-2+ roles. You'll be expected to design large-scale distributed systems in 45-60 minutes. This section provides a structured approach and detailed walkthroughs.
:::

## Why HLD Matters

```text
┌─────────────────────────────────────────────────────────────────────┐
│            TYPICAL SDE-2 INTERVIEW STRUCTURE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Round 1: DSA (Coding)                    45-60 min                │
│   Round 2: DSA (Coding)                    45-60 min                │
│   Round 3: LOW LEVEL DESIGN                45-60 min                │
│   Round 4: HIGH LEVEL DESIGN  ◄────────    45-60 min                │
│   Round 5: Hiring Manager / Culture        30-45 min                │
│                                                                      │
│   System Design is often the DECIDING factor for senior roles!      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📚 Chapter Overview

| Chapter | Topic | Difficulty |
|---------|-------|------------|
| [2. System Design Framework](./02-system-design-framework) | Structured approach, estimations, patterns | Foundation |
| [3. Design URL Shortener](./03-url-shortener) | bit.ly - ID generation, redirects, analytics | ⭐⭐ Easy |
| [4. Design Rate Limiter](./04-rate-limiter) | API protection, algorithms, distributed | ⭐⭐⭐ Medium |
| [5. Design Twitter Feed](./05-twitter-feed) | News feed, fanout, ranking | ⭐⭐⭐⭐ Hard |
| [6. Design Chat System](./06-chat-system) | WhatsApp/Slack - real-time messaging | ⭐⭐⭐⭐ Hard |
| [7. Design Notification System](./07-notification-system) | Push, email, SMS at scale | ⭐⭐⭐ Medium |
| [8. Design Distributed Cache](./08-distributed-cache) | Multi-level caching, consistency | ⭐⭐⭐⭐ Hard |

---

## 🎯 System Design Interview Framework

### The 5-Step Approach (45 minutes)

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    SYSTEM DESIGN FRAMEWORK                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   STEP 1: REQUIREMENTS (5 min)                                      │
│   ├── Functional: What does it do?                                  │
│   ├── Non-Functional: Scale, latency, availability                  │
│   └── Clarify ambiguities with interviewer                          │
│                                                                      │
│   STEP 2: ESTIMATIONS (5 min)                                       │
│   ├── Users: DAU, MAU, concurrent                                   │
│   ├── Traffic: QPS for reads and writes                             │
│   ├── Storage: Data size over time                                  │
│   └── Bandwidth: Transfer requirements                              │
│                                                                      │
│   STEP 3: HIGH-LEVEL DESIGN (10 min)                                │
│   ├── Draw core components                                          │
│   ├── Show data flow                                                │
│   └── Define key APIs                                               │
│                                                                      │
│   STEP 4: DEEP DIVE (20 min)                                        │
│   ├── Database schema and choice                                    │
│   ├── Key algorithms                                                │
│   ├── Scaling strategies                                            │
│   └── Handle bottlenecks                                            │
│                                                                      │
│   STEP 5: WRAP UP (5 min)                                           │
│   ├── Trade-offs discussion                                         │
│   ├── Monitoring and alerting                                       │
│   └── Future improvements                                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Numbers You Must Know

### Scale Reference

```text
USERS:
├── Small app:      1,000 DAU
├── Medium app:     100,000 DAU
├── Large app:      10 Million DAU
├── Twitter:        500 Million DAU
└── Google:         1 Billion+ DAU

TIME:
├── 1 day    = 86,400 seconds  ≈ 100K seconds
├── 1 month  = 2.6 million seconds
└── 1 year   = 31 million seconds ≈ 30M seconds

STORAGE:
├── Character:  1 byte
├── Integer:    4 bytes
├── Long:       8 bytes
├── UUID:       16 bytes
├── Timestamp:  8 bytes
└── URL:        ~100-200 bytes

QPS Examples:
├── 10 Million DAU, 10 actions each = 100M/day
├── 100M / 100K seconds = 1,000 QPS average
├── Peak = 2-3x average = 3,000 QPS
└── Design for peak, not average!
```

### Latency Numbers

```text
L1 Cache:                    1 ns
L2 Cache:                    4 ns
RAM Reference:             100 ns
SSD Random Read:           150 μs (150,000 ns)
HDD Seek:                   10 ms (10,000,000 ns)
Network Round Trip:         0.5 ms - 150 ms
Redis GET:                  0.5 ms
MySQL Query (indexed):      1-10 ms
MySQL Query (complex):     50-500 ms

RULE: Design for under 100ms user-facing latency
```

---

## 🏗️ Standard Architecture Template

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    STANDARD SYSTEM ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                           ┌─────────┐                               │
│                           │   CDN   │  ← Static assets              │
│                           └────┬────┘                               │
│                                │                                     │
│   ┌────────────────────────────┼────────────────────────────┐       │
│   │                            │                            │       │
│   │    ┌─────────────────┐     │     ┌─────────────────┐   │       │
│   │    │     Client      │     │     │     Client      │   │       │
│   │    └────────┬────────┘     │     └────────┬────────┘   │       │
│   │             │              │              │             │       │
│   │             └──────────────┼──────────────┘             │       │
│   │                            │                            │       │
│   │                     ┌──────▼──────┐                     │       │
│   │                     │     DNS     │                     │       │
│   │                     └──────┬──────┘                     │       │
│   │                            │                            │       │
│   │                     ┌──────▼──────┐                     │       │
│   │                     │Load Balancer│                     │       │
│   │                     └──────┬──────┘                     │       │
│   │                            │                            │       │
│   │          ┌─────────────────┼─────────────────┐          │       │
│   │          │                 │                 │          │       │
│   │    ┌─────▼─────┐     ┌─────▼─────┐     ┌─────▼─────┐   │       │
│   │    │API Server │     │API Server │     │API Server │   │       │
│   │    └─────┬─────┘     └─────┬─────┘     └─────┬─────┘   │       │
│   │          │                 │                 │          │       │
│   │          └─────────────────┼─────────────────┘          │       │
│   │                            │                            │       │
│   │    ┌───────────────────────┼───────────────────────┐   │       │
│   │    │                       │                       │   │       │
│   │    │                 ┌─────▼─────┐                 │   │       │
│   │    │                 │   Cache   │ (Redis)         │   │       │
│   │    │                 └─────┬─────┘                 │   │       │
│   │    │                       │                       │   │       │
│   │    │   ┌───────────────────┼───────────────────┐   │   │       │
│   │    │   │                   │                   │   │   │       │
│   │    │   │         ┌─────────┴─────────┐         │   │   │       │
│   │    │   │         │                   │         │   │   │       │
│   │    │   │   ┌─────▼─────┐       ┌─────▼─────┐   │   │   │       │
│   │    │   │   │  Primary  │       │  Replica  │   │   │   │       │
│   │    │   │   │    DB     │──────▶│    DB     │   │   │   │       │
│   │    │   │   └───────────┘       └───────────┘   │   │   │       │
│   │    │   │                                       │   │   │       │
│   │    │   └───────────────────────────────────────┘   │   │       │
│   │    │                                               │   │       │
│   │    └───────────────────────────────────────────────┘   │       │
│   │                                                         │       │
│   │    ┌───────────────────────────────────────────────┐   │       │
│   │    │              Message Queue                    │   │       │
│   │    │                    │                          │   │       │
│   │    │    ┌───────────────┼───────────────┐          │   │       │
│   │    │    │               │               │          │   │       │
│   │    │    ▼               ▼               ▼          │   │       │
│   │    │ Worker          Worker          Worker        │   │       │
│   │    └───────────────────────────────────────────────┘   │       │
│   │                                                         │       │
│   └─────────────────────────────────────────────────────────┘       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Component Checklist

### When to Use Each Component

| Component | Use When | Examples |
|-----------|----------|----------|
| **Load Balancer** | Multiple servers, need distribution | Always for production |
| **CDN** | Static content, global users | Images, JS, CSS, videos |
| **Cache (Local)** | Hot data, sub-ms latency needed | Caffeine in Spring Boot |
| **Cache (Distributed)** | Shared state, session, rate limits | Redis, Memcached |
| **SQL Database** | ACID needed, complex queries | Transactions, analytics |
| **NoSQL Database** | Flexible schema, high scale | User data, logs, IoT |
| **Message Queue** | Async processing, decoupling | Email, notifications |
| **Search Engine** | Full-text search, fuzzy matching | Elasticsearch |
| **Object Storage** | Large files, media | S3, GCS for images/videos |

---

## 🎯 Common Patterns

### Read-Heavy Systems (100:1 read:write)
```text
Examples: Twitter, Instagram, News sites

Strategy:
1. Heavy caching (multiple levels)
2. Read replicas for database
3. CDN for static content
4. Denormalize data for read performance
```

### Write-Heavy Systems (1:1 or 1:10 read:write)
```text
Examples: Logging, IoT, Analytics

Strategy:
1. Write-optimized databases (Cassandra, InfluxDB)
2. Batch writes
3. Async processing with queues
4. Time-series databases
```

### Mixed Workload
```text
Examples: E-commerce, Social media

Strategy:
1. CQRS (Command Query Responsibility Segregation)
2. Separate read and write paths
3. Event sourcing for writes
4. Materialized views for reads
```

---

## ⚠️ Common Mistakes in Interviews

```text
❌ Jumping to solution without requirements
❌ Ignoring scale (designing for laptop, not production)
❌ Single point of failure
❌ Not discussing trade-offs
❌ Over-engineering for small scale
❌ Forgetting about data consistency
❌ Not considering failure scenarios
❌ Ignoring monitoring and observability

✅ Ask clarifying questions
✅ Do back-of-envelope calculations
✅ Draw clear diagrams
✅ Discuss trade-offs explicitly
✅ Consider failure modes
✅ Scale incrementally (don't over-design)
✅ Mention monitoring at the end
```

---

**Next:** [2. System Design Framework →](./02-system-design-framework)

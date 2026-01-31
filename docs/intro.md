---
id: intro
sidebar_position: 0
slug: /
title: CS Fundamentals Wiki
description: Complete backend engineering guide - Java, Spring Boot, System Design, Distributed Systems, and 80+ interview-ready chapters for SDE-2+ roles.
keywords: [computer science, java, jvm, database, system design, microservices, backend engineering, interview preparation]
---

# CS Fundamentals Wiki

:::tip 🎯 Built for SDE-2+ Backend Interviews
This wiki contains **82 comprehensive chapters** covering every topic you need to crack backend engineering interviews at top tech companies. Production-ready knowledge with real-world examples.
:::

## 📊 Content Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                   COMPLETE BACKEND ENGINEERING GUIDE                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   📚 14 Major Topics           📄 82 Chapters                       │
│   💾 1.87 MB+ Content          ✅ 100% Complete                     │
│                                                                      │
│   Each chapter includes:                                            │
│   ├── 📝 Detailed explanations with diagrams                        │
│   ├── 💻 Production-ready code examples                             │
│   ├── ❓ Interview questions & answers                               │
│   ├── ⚠️ Common pitfalls to avoid                                   │
│   └── 🎯 Quick reference cards                                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔥 Core Java & Backend

### [1. Java & JVM Internals](./01-java-jvm-internals/01-intro.md) ⭐⭐⭐⭐⭐
Deep dive into JVM internals - the foundation of every Java application.

| Chapter | Topics Covered |
|---------|----------------|
| JVM Architecture | Class loading, runtime data areas, execution engine |
| Memory Model | Heap, stack, metaspace, JMM, happens-before |
| Garbage Collection | G1, ZGC, CMS, tuning strategies, GC logs |
| Concurrency | Threads, locks, atomic operations, ThreadLocal |

---

### [2. DBMS & Data Persistence](./02-dbms-data-persistence/01-intro.md) ⭐⭐⭐⭐⭐
Master database fundamentals - critical for any backend role.

| Chapter | Topics Covered |
|---------|----------------|
| Indexes | B-Tree, Hash, Composite, Covering indexes, EXPLAIN |
| Transactions | ACID, Isolation levels, Phantom reads, Locking |
| Query Optimization | Slow query analysis, N+1, batch operations |
| Database Scaling | Replication, Sharding, Read replicas |
| SQL vs NoSQL | When to use each, CAP theorem implications |
| Connection Pooling | HikariCP, sizing, troubleshooting |

---

### [3. Spring Boot Internals](./03-spring-boot-internals/01-intro.md) ⭐⭐⭐⭐⭐
Go beyond annotations - understand how Spring Boot really works.

| Chapter | Topics Covered |
|---------|----------------|
| IoC Container | Bean lifecycle, ApplicationContext, BeanFactory |
| Dependency Injection | Constructor vs Setter, @Autowired, @Qualifier |
| Bean Scopes | Singleton, Prototype, Request, Session, Proxy mechanism |
| Auto-Configuration | @Conditional, spring.factories, custom starters |
| AOP | Proxies, AspectJ, @Transactional internals |
| Async Processing | @Async, @Scheduled, ThreadPoolTaskExecutor |
| Servlet Model | DispatcherServlet, Filter chain, Handler mapping |

---

### [12. Java 8-21 Features](./12-java-features/01-intro.md) ⭐⭐⭐⭐
Modern Java features that interviewers love to ask about.

| Chapter | Topics Covered |
|---------|----------------|
| Java 8 | Lambdas, Streams, Optional, Method References |
| CompletableFuture | Async programming, chaining, exception handling |
| Java 9-17 | var, Records, Sealed Classes, Pattern Matching |
| Java 21 | Virtual Threads, Structured Concurrency, Sequenced Collections |

---

## 🌐 Systems & Networks

### [4. Operating Systems](./04-operating-systems/01-intro.md) ⭐⭐⭐⭐
Essential OS concepts for debugging and performance tuning.

| Chapter | Topics Covered |
|---------|----------------|
| Processes & Threads | Context switching, scheduling, thread pools |
| Memory Management | Virtual memory, paging, OOM killer |
| File Descriptors & I/O | ulimit, blocking/non-blocking, epoll |
| System Calls | User/kernel mode, strace, syscall overhead |

---

### [5. Computer Networks](./05-computer-networks/01-intro.md) ⭐⭐⭐⭐⭐
Networking fundamentals every backend engineer must know.

| Chapter | Topics Covered |
|---------|----------------|
| OSI & TCP/IP | Layers, protocols, encapsulation |
| HTTP Deep Dive | HTTP/1.1, HTTP/2, HTTP/3, headers, caching |
| TCP Internals | 3-way handshake, flow control, congestion |
| DNS | Resolution, caching, TTL, troubleshooting |
| Load Balancing | L4 vs L7, algorithms, sticky sessions |
| Proxies | Forward, reverse, Nginx configuration |
| CDN | Edge caching, cache invalidation |
| WebSockets | Real-time communication, connection lifecycle |

---

## 🔐 Security

### [6. Security & Authentication](./06-security-authentication/01-intro.md) ⭐⭐⭐⭐⭐
Build secure applications - non-negotiable for production systems.

| Chapter | Topics Covered |
|---------|----------------|
| Auth Fundamentals | Authentication vs Authorization, tokens |
| JWT Deep Dive | Structure, validation, refresh tokens |
| CORS | Preflight requests, configuration, security |
| OAuth 2.0 & OIDC | Flows, tokens, social login |
| Spring Security | Filter chain, custom authentication, method security |
| API Security & OWASP | Top 10 vulnerabilities, injection, XSS, CSRF |

---

## 🏗️ Distributed Systems

### [7. Distributed Systems](./07-distributed-systems/01-intro.md) ⭐⭐⭐⭐⭐
Core concepts for building scalable, reliable systems.

| Chapter | Topics Covered |
|---------|----------------|
| CAP Theorem | Consistency, availability, partition tolerance |
| Consistency Models | Strong, eventual, causal consistency |
| Consensus | Paxos, Raft, leader election |
| Replication | Primary-replica, multi-leader, quorum |
| Clocks & Ordering | Logical clocks, vector clocks, timestamps |
| Distributed Transactions | 2PC, Saga pattern, compensating transactions |
| Failure Handling | Retry strategies, circuit breakers, idempotency |

---

### [8. Caching](./08-caching/01-intro.md) ⭐⭐⭐⭐
Speed up your applications with effective caching.

| Chapter | Topics Covered |
|---------|----------------|
| Caching Strategies | Cache-aside, read-through, write-through |
| Redis Deep Dive | Data structures, persistence, clustering |
| Cache Invalidation | TTL, event-driven, versioning |
| Distributed Caching | Consistent hashing, replication |

---

### [9. Message Queues](./09-message-queues/01-intro.md) ⭐⭐⭐⭐⭐
Decouple services with async communication.

| Chapter | Topics Covered |
|---------|----------------|
| Kafka | Topics, partitions, consumer groups, exactly-once |
| RabbitMQ | Exchanges, queues, bindings, acknowledgments |
| Event-Driven Architecture | Event sourcing, CQRS, saga patterns |
| Comparison | Kafka vs RabbitMQ vs SQS |

---

### [10. Microservices Architecture](./10-microservices-architecture/01-intro.md) ⭐⭐⭐⭐⭐
Design and build production microservices.

| Chapter | Topics Covered |
|---------|----------------|
| Microservices Patterns | Saga, Circuit Breaker, Strangler Fig |
| Service Mesh | Istio, sidecar proxy, observability |
| Deployment Strategies | Blue-green, canary, rolling updates |
| Observability | Logging, metrics, tracing, alerting |

---

## 📐 API & Design

### [11. API Design](./11-api-design/01-intro.md) ⭐⭐⭐⭐
Design APIs that are easy to use and hard to misuse.

| Chapter | Topics Covered |
|---------|----------------|
| REST Best Practices | Resource naming, HTTP methods, status codes |
| API Contracts | OpenAPI, versioning, backward compatibility |
| GraphQL | Queries, mutations, N+1 problem, DataLoader |

---

### [13. Low Level Design (LLD)](./13-lld/01-intro.md) ⭐⭐⭐⭐⭐
Object-oriented design and patterns for interviews.

| Chapter | Topics Covered |
|---------|----------------|
| SOLID Principles | SRP, OCP, LSP, ISP, DIP with examples |
| OOP Fundamentals | Abstraction, encapsulation, inheritance, polymorphism |
| Design Patterns | Creational, Structural, Behavioral patterns |
| LLD Interview Problems | Parking Lot, Elevator, LRU Cache, BookMyShow |

---

### [14. High Level Design (HLD)](./14-hld/01-intro.md) ⭐⭐⭐⭐⭐
System design interviews - the most critical skill for SDE-2+.

| Chapter | Topics Covered |
|---------|----------------|
| System Design Framework | 5-step approach, estimations, architecture |
| URL Shortener | ID generation, caching, scaling |
| Rate Limiter | Token bucket, sliding window, Redis implementation |
| Twitter Feed | Fanout strategies, ranking, hybrid approach |
| Chat System | WebSocket, message routing, presence |
| Notification System | Multi-channel delivery, templates, reliability |
| Distributed Cache | Patterns, eviction, consistency, stampede |

---

## 🎯 Interview Preparation Guide

```text
┌─────────────────────────────────────────────────────────────────────┐
│                   RECOMMENDED STUDY ORDER                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  WEEK 1-2: CORE FUNDAMENTALS                                        │
│  ├── Java & JVM Internals (must-know)                               │
│  ├── DBMS & Data Persistence                                        │
│  └── Operating Systems                                              │
│                                                                      │
│  WEEK 3-4: FRAMEWORKS & SECURITY                                    │
│  ├── Spring Boot Internals                                          │
│  ├── Java 8-21 Features                                             │
│  └── Security & Authentication                                      │
│                                                                      │
│  WEEK 5-6: DISTRIBUTED SYSTEMS                                      │
│  ├── Distributed Systems Concepts                                   │
│  ├── Caching                                                        │
│  ├── Message Queues                                                 │
│  └── Microservices Architecture                                     │
│                                                                      │
│  WEEK 7-8: DESIGN ROUNDS                                            │
│  ├── API Design                                                     │
│  ├── Low Level Design (LLD)                                         │
│  └── High Level Design (HLD) - MOST IMPORTANT                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Access

### 🔥 Most Asked Topics

| Topic | Chapter | Interview Frequency |
|-------|---------|---------------------|
| JVM Architecture & Memory | [JVM Internals](./01-java-jvm-internals/02-jvm-architecture.md) | ⭐⭐⭐⭐⭐ |
| Garbage Collection | [JVM Internals](./01-java-jvm-internals/03-garbage-collection.md) | ⭐⭐⭐⭐⭐ |
| Database Indexes | [DBMS](./02-dbms-data-persistence/02-indexes.md) | ⭐⭐⭐⭐⭐ |
| Transaction Isolation | [DBMS](./02-dbms-data-persistence/03-transactions.md) | ⭐⭐⭐⭐⭐ |
| Spring IoC & Bean Lifecycle | [Spring Boot](./03-spring-boot-internals/02-ioc-container.md) | ⭐⭐⭐⭐⭐ |
| @Transactional internals | [Spring Boot](./03-spring-boot-internals/03-spring-transactions.md) | ⭐⭐⭐⭐⭐ |
| JWT & OAuth 2.0 | [Security](./06-security-authentication/02-auth-security.md) | ⭐⭐⭐⭐⭐ |
| CAP Theorem | [Distributed Systems](./07-distributed-systems/02-cap-theorem.md) | ⭐⭐⭐⭐⭐ |
| Kafka Deep Dive | [Message Queues](./09-message-queues/02-kafka-deep-dive.md) | ⭐⭐⭐⭐⭐ |
| URL Shortener Design | [HLD](./14-hld/03-url-shortener.md) | ⭐⭐⭐⭐⭐ |
| Rate Limiter Design | [HLD](./14-hld/04-rate-limiter.md) | ⭐⭐⭐⭐⭐ |
| Twitter Feed Design | [HLD](./14-hld/05-twitter-feed.md) | ⭐⭐⭐⭐⭐ |

### 🛠️ Code Examples

Every chapter includes production-ready code:
- **Java** - Core language, Spring Boot, tests
- **SQL** - Optimized queries, indexes, transactions
- **YAML** - Spring configuration, Docker, Kubernetes
- **Redis/Lua** - Caching, rate limiting scripts

---

## 📈 Content Statistics

| Metric | Value |
|--------|-------|
| Total Sections | 14 |
| Total Chapters | 82 |
| Total Content | 1.87 MB+ |
| Code Examples | 500+ |
| Diagrams | 200+ |
| Interview Questions | 300+ |

---

## 💡 How to Use This Wiki

### 🔍 Search
Press `Ctrl/Cmd + K` to search across all content.

### 📖 Navigation
Use the sidebar to browse topics or follow the recommended study order above.

### 📝 Notes
- ⭐⭐⭐⭐⭐ = Critical for SDE-2+ interviews
- ⭐⭐⭐⭐ = Frequently asked
- Each chapter can be read independently

---

## 👨‍💻 About

Built by **Harendra Kumar** | Backend Engineer

- 📧 [harendrakumar1558@gmail.com](mailto:harendrakumar1558@gmail.com)
- 💼 [LinkedIn](https://www.linkedin.com/in/harendra1558/)
- 🐙 [GitHub](https://github.com/Harendra1558)

---

**Ready to start?** Begin with [Java & JVM Internals →](./01-java-jvm-internals/01-intro.md)

---
sidebar_position: 1
title: Syllabus & Overview
---

# 5. COMPUTER NETWORKS

:::info Why This Matters for Interviews
Computer Networks is a **core topic** for backend and system design interviews. Understanding how data moves across the internet, how protocols work, and how to troubleshoot network issues is essential for any software engineer building distributed systems.
:::

## Topics Covered

```text
OSI & TCP/IP MODELS
├── 7-Layer OSI Model
├── 4-Layer TCP/IP Model
└── Protocol mapping and interview relevance

TCP vs UDP
├── Reliability vs Speed
├── Connection-oriented vs Connectionless
├── Ordering and Flow Control
└── Real-world use cases (HTTP, DNS, Gaming)

TCP DEEP DIVE
├── 3-Way Handshake (SYN, SYN-ACK, ACK)
├── 4-Way Termination (FIN, ACK)
├── Congestion Control (Slow Start, AIMD)
├── Flow Control (Sliding Window)
└── TCP States (LISTEN, ESTABLISHED, TIME_WAIT)

HTTP VERSIONS
├── HTTP/1.0 vs HTTP/1.1 (Keep-Alive, Pipelining)
├── HTTP/2 (Multiplexing, Header Compression, Server Push)
├── HTTP/3 (QUIC over UDP, 0-RTT)
└── Head-of-Line Blocking Problem

DNS (Domain Name System)
├── Recursive vs Iterative Resolution
├── DNS Record Types (A, AAAA, CNAME, MX, TXT, NS)
├── DNS Caching (TTL, Browser, OS, ISP)
└── DNS Security (DNSSEC, DNS over HTTPS)

IP ADDRESSING & SUBNETTING
├── IPv4 vs IPv6
├── Public vs Private IPs
├── Subnetting and CIDR notation
├── NAT (Network Address Translation)
└── ARP (Address Resolution Protocol)

NETWORK SECURITY & TLS
├── TLS Handshake (1.2 vs 1.3)
├── Certificates and Certificate Chains
├── HTTPS Best Practices
├── Common Attacks (MITM, DDoS, DNS Spoofing)
└── Firewalls and Security Groups

MODERN PROTOCOLS & TECHNOLOGIES
├── WebSocket (Full-duplex communication)
├── gRPC (HTTP/2 + Protocol Buffers)
├── GraphQL vs REST
├── Server-Sent Events (SSE)
└── Long Polling

LOAD BALANCING & PROXIES
├── Layer 4 vs Layer 7 Load Balancers
├── Load Balancing Algorithms
├── Reverse Proxy vs Forward Proxy
├── Health Checks
└── Sticky Sessions

CDN (Content Delivery Network)
├── Edge Caching
├── Cache Invalidation
├── CDN for Static vs Dynamic Content
└── Popular CDN Providers

SOCKETS & CONNECTIONS
├── TCP/UDP Sockets
├── Socket Programming Basics
├── Keep-Alive and Connection Pooling
├── File Descriptors and Limits
└── C10K Problem

RETRIES, TIMEOUTS & RELIABILITY
├── Timeout Strategies
├── Retry with Exponential Backoff
├── Idempotency Keys
├── Circuit Breaker Pattern
└── Cascading Failures

NETWORK DEBUGGING & TOOLS
├── ping, traceroute, nslookup
├── curl, wget
├── tcpdump, Wireshark
├── netstat, ss
└── Common Port Numbers
```

## Chapter Organization

| Chapter | Topics | Interview Importance |
|---------|--------|---------------------|
| 2. Networking Fundamentals | OSI Model, TCP/UDP, HTTP Basics | ⭐⭐⭐⭐⭐ |
| 3. TCP Deep Dive | Handshakes, Congestion Control, States | ⭐⭐⭐⭐⭐ |
| 4. HTTP Versions | HTTP/1.1 vs 2 vs 3, Keep-Alive, QUIC | ⭐⭐⭐⭐⭐ |
| 5. DNS Explained | Resolution, Record Types, Caching | ⭐⭐⭐⭐ |
| 6. TLS & Security | Handshake, Certificates, HTTPS | ⭐⭐⭐⭐ |
| 7. Modern Protocols | WebSocket, gRPC, SSE | ⭐⭐⭐⭐ |
| 8. Load Balancing & CDN | Algorithms, Proxies, Edge Caching | ⭐⭐⭐⭐ |
| 9. Reliability Patterns | Timeouts, Retries, Circuit Breaker | ⭐⭐⭐⭐⭐ |

### Status
✅ **Complete** - All 9 chapters implemented with detailed examples and interview questions

### Total Content
- **9 Comprehensive Chapters**
- **~220KB+ of documentation**
- **100+ Interview Questions & Answers**
- **Diagrams, Code Examples, and Quick Reference Cards**

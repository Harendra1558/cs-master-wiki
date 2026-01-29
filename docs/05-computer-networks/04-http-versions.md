---
title: 4. HTTP Versions
sidebar_position: 4
description: Deep dive into HTTP/1.0, HTTP/1.1, HTTP/2, and HTTP/3 (QUIC) with performance comparisons for interviews.
keywords: [http, http2, http3, quic, keep-alive, multiplexing, head-of-line blocking]
---

# HTTP Versions Explained

:::info Interview Importance ⭐⭐⭐⭐⭐
Understanding HTTP evolution is crucial for system design interviews. Knowing when to use HTTP/2 vs HTTP/3 and understanding concepts like multiplexing and head-of-line blocking shows depth of knowledge.
:::

## 1. HTTP/1.0 - The Beginning

### How It Worked

```text
HTTP/1.0 Connection Model:

Client                                    Server
  │                                          │
  │──── TCP 3-Way Handshake ────────────────│
  │                                          │
  │──── GET /page.html ─────────────────────│
  │                                          │
  │←─── 200 OK (HTML response) ─────────────│
  │                                          │
  │──── TCP Close (FIN/ACK) ────────────────│
  │                                          │
  │──── NEW TCP Connection ─────────────────│
  │                                          │
  │──── GET /style.css ─────────────────────│
  │                                          │
  │←─── 200 OK (CSS response) ──────────────│
  │                                          │
  │──── TCP Close ──────────────────────────│
  │                                          │

Problem: NEW TCP connection for EVERY request!
```

### Problems with HTTP/1.0

| Problem | Explanation |
|---------|-------------|
| **High Latency** | TCP handshake (1 RTT) + TLS handshake (2 RTT) per request |
| **Resource Waste** | Connection setup/teardown overhead |
| **TCP Slow Start** | Never reaches optimal speed before closing |
| **Server Load** | Many short-lived connections = more resources |

### Real-World Impact

```text
Loading a webpage with 50 resources (CSS, JS, images):

HTTP/1.0:
├── 50 TCP handshakes (50 × 100ms = 5 seconds!)
├── 50 TLS handshakes (50 × 200ms = 10 seconds!)
├── 50 connection close operations
└── Total: ~15+ seconds just for overhead!
```

---

## 2. HTTP/1.1 - Keep-Alive & Pipelining

### Keep-Alive (Persistent Connections)

```text
HTTP/1.1 Connection Model (default: keep-alive):

Client                                    Server
  │                                          │
  │──── TCP + TLS Handshake (once) ─────────│
  │                                          │
  │──── GET /page.html ─────────────────────│
  │←─── 200 OK ─────────────────────────────│
  │                                          │
  │──── GET /style.css ─────────────────────│  ← Same connection!
  │←─── 200 OK ─────────────────────────────│
  │                                          │
  │──── GET /script.js ─────────────────────│  ← Same connection!
  │←─── 200 OK ─────────────────────────────│
  │                                          │
  │ (Connection stays open for more requests)│
  │                                          │

50 requests = 1 TCP handshake + 1 TLS handshake!
```

### Keep-Alive Headers

```text
Request Header:
Connection: keep-alive
Keep-Alive: timeout=5, max=100

Response Header:
Connection: keep-alive
Keep-Alive: timeout=5, max=100

Meaning:
- timeout=5: Close connection after 5 seconds of idle
- max=100: Allow up to 100 requests on this connection
```

### Pipelining (Rarely Used)

```text
Without Pipelining (Sequential):
─────────────────────────────────────────────────→ Time
  │───req1───│──resp1──│───req2───│──resp2──│

With Pipelining (Send Multiple Requests):
─────────────────────────────────────────────────→ Time
  │───req1──req2──req3──│──resp1──resp2──resp3──│

Benefits: Don't wait for response before sending next request
```

### Why Pipelining Failed

:::warning Head-of-Line (HOL) Blocking
The biggest problem in HTTP/1.1 that HTTP/2 solves.
:::

```text
Head-of-Line Blocking Example:

Client sends: [Request1] [Request2] [Request3]
Server must respond in order: [Resp1] [Resp2] [Resp3]

What if Request1 takes 3 seconds?

Time:          0s    1s    2s    3s    4s    5s
Request1:      ───────────────────┐
               "Processing..."    │
                                  ▼
Response1:                        [resp1]
Response2 (ready at 0.1s):                  [resp2] ← BLOCKED!
Response3 (ready at 0.2s):                         [resp3] ← BLOCKED!

Responses 2 and 3 are READY but BLOCKED by Response 1!
```

### Browser Workaround: Multiple Connections

```text
Browsers open 6-8 parallel TCP connections per domain:

Connection 1: [req1] → [resp1]
Connection 2: [req2] → [resp2]
Connection 3: [req3] → [resp3]
Connection 4: [req4] → [resp4]
Connection 5: [req5] → [resp5]
Connection 6: [req6] → [resp6]

Problems:
├── Each connection = 1 RTT (TCP) + 2 RTT (TLS) overhead
├── 6 connections = 6× memory and CPU
├── Congestion control starts fresh for each
└── Domain sharding hack creates more problems
```

---

## 3. HTTP/2 - Multiplexing & Binary Framing

### Key Innovations

| Feature | Description |
|---------|-------------|
| **Binary Protocol** | Not text-based like HTTP/1.1 |
| **Multiplexing** | Multiple requests on ONE connection |
| **Header Compression** | HPACK algorithm |
| **Server Push** | Server can push resources |
| **Stream Prioritization** | Important resources first |

### Multiplexing Explained

```text
HTTP/1.1 (Sequential):
Connection 1: [──────Request A──────][──Response A──]
Connection 2: [──Request B──][──Response B──]
Connection 3: [──Request C──][──Response C──]

HTTP/2 (Multiplexed on ONE connection):
                ↓ Interleaved frames ↓
Connection: [A1][B1][C1][A2][B2][C2][A3][B3][C3]...
            └──────────────────────────────────┘
                Single TCP connection!

A1, A2, A3 = Frames of Request/Response A
B1, B2, B3 = Frames of Request/Response B
C1, C2, C3 = Frames of Request/Response C
```

### Binary Framing Layer

```text
HTTP/1.1 Text Format:
┌─────────────────────────────────────┐
│ GET /index.html HTTP/1.1            │  ← Text, human readable
│ Host: example.com                   │
│ Accept: text/html                   │
└─────────────────────────────────────┘

HTTP/2 Binary Frames:
┌─────────────────────────────────────┐
│ Length (24 bits)                    │
│ Type (8 bits): HEADERS, DATA, etc   │
│ Flags (8 bits)                      │
│ Stream ID (31 bits)                 │  ← Which request this belongs to
│ Payload (variable)                  │
└─────────────────────────────────────┘

Benefits:
✓ More compact (smaller packets)
✓ Easier to parse (no ambiguity)
✓ Enables multiplexing via stream IDs
```

### Frame Types

| Frame Type | Purpose |
|------------|---------|
| `HEADERS` | HTTP headers for a request/response |
| `DATA` | HTTP body content |
| `PRIORITY` | Stream priority information |
| `RST_STREAM` | Cancel a stream |
| `SETTINGS` | Connection settings |
| `PUSH_PROMISE` | Server push notification |
| `GOAWAY` | Graceful connection shutdown |
| `PING` | Heartbeat/RTT measurement |

### Header Compression (HPACK)

```text
Problem in HTTP/1.1:
Every request sends FULL headers (often 500+ bytes)

Request 1: "Cookie: session=abc123def456..." (200 bytes)
Request 2: "Cookie: session=abc123def456..." (same 200 bytes!)
Request 3: "Cookie: session=abc123def456..." (same 200 bytes!)

HPACK Solution:
1. Static Table: 61 common headers predefined
2. Dynamic Table: Remember sent headers
3. Huffman Encoding: Compress text values

Result:
Request 1: [Full headers] → 200 bytes
Request 2: [Index 62] → 1 byte! (just reference previous)
Request 3: [Index 62] → 1 byte!

Compression ratio: 85-90% reduction!
```

### Server Push

```text
Without Server Push:
1. Browser requests index.html
2. Browser parses HTML
3. Browser finds <link href="style.css">
4. Browser requests style.css (another RTT!)

With Server Push:
1. Browser requests index.html
2. Server: "I know you'll need style.css"
3. Server pushes style.css proactively
4. Browser has style.css before it even asks!

PUSH_PROMISE Frame:
Server → Client: "I'm going to send you /style.css"
Client can decline if already cached (RST_STREAM)
```

### HTTP/2 Still Has HOL Blocking!

:::danger TCP-Level HOL Blocking
HTTP/2 solves application-level HOL blocking but not TCP-level.
:::

```text
HTTP/2 over TCP:

Application Layer:    [A1][B1][C1][A2][B2][C2]...
                           ↓
TCP Layer:           [Packet 1][Packet 2][Packet 3]...
                                    ↑
                              If Packet 2 is lost,
                              TCP MUST deliver in order!
                              
                              Packet 3 (has B2, C1) waits
                              even though it arrived!

All streams blocked waiting for TCP retransmission.
This is why HTTP/3 uses QUIC (UDP-based).
```

---

## 4. HTTP/3 - QUIC to the Rescue

### What is QUIC?

**QUIC** = **Q**uick **U**DP **I**nternet **C**onnections

- Built by Google, now IETF standard
- Runs over UDP (not TCP)
- TLS 1.3 built-in (not separate)
- Solves TCP HOL blocking

### QUIC Architecture

```text
HTTP/2 Stack:           HTTP/3 Stack:
┌──────────────┐        ┌──────────────┐
│    HTTP/2    │        │    HTTP/3    │
├──────────────┤        ├──────────────┤
│     TLS      │        │     QUIC     │ ← TLS built-in!
├──────────────┤        │              │
│     TCP      │        ├──────────────┤
├──────────────┤        │     UDP      │
│      IP      │        ├──────────────┤
└──────────────┘        │      IP      │
                        └──────────────┘

QUIC combines: Reliable transport + TLS encryption
```

### 0-RTT Connection

```text
TCP + TLS 1.2:
┌─────────────────────────────────────────────────────┐
│ RTT 1: TCP SYN ──────────────────────── SYN-ACK    │
│ RTT 2: TLS ClientHello ────────────── ServerHello  │
│ RTT 3: TLS Finished ─────────────────── Finished   │
│ RTT 4: HTTP Request ────────────────── Response    │
└─────────────────────────────────────────────────────┘
Total: 4 RTTs before first byte (300-400ms!)

QUIC First Connection (1-RTT):
┌─────────────────────────────────────────────────────┐
│ RTT 1: QUIC Hello + TLS ─────────── Hello + TLS    │
│ RTT 2: HTTP Request ────────────────── Response    │
└─────────────────────────────────────────────────────┘
Total: 2 RTTs (half!)

QUIC Reconnection (0-RTT):
┌─────────────────────────────────────────────────────┐
│ RTT 1: HTTP Request (encrypted!) ────── Response   │
└─────────────────────────────────────────────────────┘
Total: 1 RTT! Client sends data immediately!
```

### No HOL Blocking in QUIC

```text
QUIC Independent Streams:

Stream A: [A1] [A2] [A3] ...  ← Each stream has own sequence numbers
Stream B: [B1] [B2] [B3] ...
Stream C: [C1] [C2] [C3] ...

If B1 packet is lost:
✓ Stream A continues unaffected
✓ Stream C continues unaffected
✗ Only Stream B waits for retransmission

TCP would block ALL streams!
```

### Connection Migration

```text
Problem with TCP:
Connection = (Source IP, Source Port, Dest IP, Dest Port)

User on phone:
├── On WiFi: IP = 192.168.1.5
├── Moves to mobile: IP = 10.0.0.25
└── TCP connection BREAKS! (different IP)

QUIC Solution:
Connection identified by Connection ID (64-bit random)

User on phone:
├── On WiFi: Connection ID = abc123, IP = 192.168.1.5
├── Moves to mobile: Connection ID = abc123, IP = 10.0.0.25
└── Same Connection ID = connection continues!

Great for mobile users moving between networks!
```

### HTTP Version Comparison

| Feature | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---------|----------|--------|--------|
| **Transport** | TCP | TCP | QUIC (UDP) |
| **Connections per domain** | 6-8 | 1 | 1 |
| **Multiplexing** | ❌ | ✅ | ✅ |
| **Header Compression** | ❌ | HPACK | QPACK |
| **Server Push** | ❌ | ✅ | ✅ |
| **HOL Blocking** | App + TCP | TCP only | ❌ None |
| **Encryption** | Optional | Optional | Mandatory |
| **Connection setup** | 3+ RTT | 3+ RTT | 1-2 RTT |
| **0-RTT possible** | ❌ | ❌ | ✅ |
| **Connection migration** | ❌ | ❌ | ✅ |

---

## 5. HTTP Methods Deep Dive

### Method Properties

| Method | Safe | Idempotent | Has Body | Cacheable |
|--------|------|------------|----------|-----------|
| GET | ✅ | ✅ | ❌ | ✅ |
| HEAD | ✅ | ✅ | ❌ | ✅ |
| POST | ❌ | ❌ | ✅ | Rarely |
| PUT | ❌ | ✅ | ✅ | ❌ |
| DELETE | ❌ | ✅ | May | ❌ |
| PATCH | ❌ | ❌ | ✅ | ❌ |
| OPTIONS | ✅ | ✅ | ❌ | ❌ |

### Idempotency Explained

```text
Idempotent: Same request N times = same result as 1 time

GET /users/123
├── Call 1: Returns user 123
├── Call 2: Returns user 123 (same!)
└── Call N: Returns user 123 (always same!)

DELETE /users/123
├── Call 1: User deleted, returns 200
├── Call 2: User already gone, returns 404
└── Both calls leave system in SAME state: user gone

POST /users (Create user)
├── Call 1: Creates user, returns 201
├── Call 2: Creates ANOTHER user! Returns 201
└── ❌ NOT idempotent - multiple calls = multiple users
```

### PUT vs PATCH

```text
PUT: Replace entire resource
────────────────────────────
Current: {"name": "John", "email": "john@x.com", "age": 25}
PUT:     {"name": "John", "age": 30}
Result:  {"name": "John", "age": 30}  ← email is GONE!

PATCH: Partial update
────────────────────────────
Current: {"name": "John", "email": "john@x.com", "age": 25}
PATCH:   {"age": 30}
Result:  {"name": "John", "email": "john@x.com", "age": 30}  ← email preserved!
```

---

## 6. HTTP Status Codes

### Categories

```text
1xx: Informational (rare in practice)
2xx: Success
3xx: Redirection
4xx: Client Error (your fault)
5xx: Server Error (our fault)
```

### Must-Know Status Codes

| Code | Name | Meaning |
|------|------|---------|
| **200** | OK | Success |
| **201** | Created | Resource created (POST) |
| **204** | No Content | Success, no body (DELETE) |
| **301** | Moved Permanently | Permanent redirect (cached) |
| **302** | Found | Temporary redirect |
| **304** | Not Modified | Use cached version |
| **400** | Bad Request | Invalid request syntax |
| **401** | Unauthorized | No/invalid auth |
| **403** | Forbidden | Auth ok, but no permission |
| **404** | Not Found | Resource doesn't exist |
| **405** | Method Not Allowed | Wrong HTTP method |
| **409** | Conflict | Conflicts with current state |
| **429** | Too Many Requests | Rate limited |
| **500** | Internal Server Error | Server crashed |
| **502** | Bad Gateway | Upstream server error |
| **503** | Service Unavailable | Overloaded/maintenance |
| **504** | Gateway Timeout | Upstream timeout |

### 401 vs 403

```text
401 Unauthorized:
"Who are you? I don't know you. Please authenticate."
- No token provided
- Token expired
- Invalid credentials
Solution: Login/refresh token

403 Forbidden:
"I know who you are, but you can't do this."
- Valid token, but insufficient permissions
- Admin-only resource accessed by regular user
Solution: Need different role/permissions
```

### 502 vs 503 vs 504

```text
502 Bad Gateway:
"I'm a proxy, and the server behind me sent garbage."
- Upstream server sent invalid response
- Server crashed mid-response

503 Service Unavailable:
"I exist but I'm too busy or in maintenance."
- Server overloaded
- Maintenance mode
- Usually includes Retry-After header

504 Gateway Timeout:
"I'm a proxy, and the server behind me is too slow."
- Upstream server didn't respond in time
- Backend processing took too long
```

---

## 7. HTTP Caching

### Cache-Control Header

```text
Cache-Control: max-age=3600           → Cache for 1 hour
Cache-Control: no-cache               → Validate with server first
Cache-Control: no-store               → Don't cache at all
Cache-Control: private                → Only browser can cache
Cache-Control: public                 → Proxies/CDN can cache too
Cache-Control: must-revalidate        → Must check on stale
```

### ETag and Conditional Requests

```text
First Request:
GET /api/users/123

Response:
200 OK
ETag: "abc123"
Cache-Control: max-age=3600
{"name": "John"}

After 1 hour (expired), Conditional Request:
GET /api/users/123
If-None-Match: "abc123"

If unchanged:               If changed:
304 Not Modified            200 OK
(use cached version)        ETag: "xyz789"
                            {"name": "John Updated"}
```

### Cache Hierarchy

```text
Request Journey:

Browser ─────→ CDN Edge ─────→ Origin Server
              Cache              │
   ↓            ↓               ↓
┌──────┐    ┌──────┐       ┌──────┐
│Local │    │CDN   │       │Origin│
│Cache │    │Cache │       │      │
└──────┘    └──────┘       └──────┘

Cache-Control: private, max-age=300
├── Browser: Cache for 5 minutes
└── CDN: Do NOT cache (private)

Cache-Control: public, max-age=86400
├── Browser: Cache for 1 day
└── CDN: Cache for 1 day
```

---

## 8. Interview Questions

### Q1: What is HTTP/2 multiplexing?

```text
Answer:
"HTTP/2 multiplexing allows multiple requests and responses to be 
sent simultaneously over a single TCP connection, interleaved as 
binary frames.

Each request/response is assigned a Stream ID. Frames from different 
streams can be interleaved, so a slow response doesn't block others 
at the application layer.

This eliminates the need for multiple TCP connections and solves 
HTTP/1.1's head-of-line blocking at the HTTP level."
```

### Q2: Why does HTTP/3 use UDP instead of TCP?

```text
Answer:
"HTTP/3 uses QUIC over UDP to solve three problems that are 
impossible to fix in TCP:

1. HOL Blocking: TCP delivers bytes in order. If packet 2 is lost,
   packet 3 waits even if it belongs to a different HTTP stream.
   QUIC has independent stream delivery - loss in one stream
   doesn't block others.

2. Connection Setup Latency: TCP needs 3-way handshake, then TLS
   handshake - 3+ RTTs. QUIC combines these in 1 RTT, and supports
   0-RTT for repeat connections.

3. Connection Migration: TCP connections are tied to IP:port tuples.
   QUIC uses connection IDs, allowing seamless mobility between
   WiFi and cellular."
```

### Q3: What is 0-RTT in QUIC?

```text
Answer:
"0-RTT allows clients to send encrypted data immediately on the 
first packet, without waiting for the handshake to complete.

It works by caching the server's configuration from a previous 
connection. On reconnect, the client uses this cached data to
encrypt the request immediately.

Trade-off: 0-RTT data can be replayed by attackers (replay attack).
So it should only be used for idempotent requests like GET."
```

### Q4: What is the difference between 301 and 302 redirect?

```text
Answer:
"301 Moved Permanently:
- Browser caches the redirect
- Next time, browser goes directly to new URL
- SEO: Search engines transfer page rank to new URL
- Use for: Domain changes, permanent URL restructuring

302 Found (Temporary):
- Browser asks the original URL every time
- No caching of redirect
- SEO: Search engines keep the old URL
- Use for: A/B testing, temporary maintenance redirects"
```

### Q5: When would you NOT use HTTP/2?

```text
Answer:
"Despite its benefits, HTTP/2 might not be ideal when:

1. Mostly single requests: The multiplexing overhead isn't worth it
   if you're making just one request.

2. High packet loss networks: TCP HOL blocking becomes severe with
   many multiplexed streams. HTTP/3 is better here.

3. Server doesn't support it: Falls back to HTTP/1.1 anyway.

4. Debugging difficulty: Binary protocol is harder to inspect
   than text-based HTTP/1.1.

5. Aggressive server push: Poorly configured server push can waste
   bandwidth pushing resources the client already has cached."
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│                    HTTP VERSIONS CHEAT SHEET                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ HTTP/1.0: New connection per request                                  │
│ HTTP/1.1: Keep-alive (persistent connections)                         │
│ HTTP/2:   Multiplexing, header compression, server push               │
│ HTTP/3:   QUIC (UDP), 0-RTT, no HOL blocking                          │
│                                                                       │
│ HOL BLOCKING:                                                         │
│ ├── HTTP/1.1: App-level (sequential requests)                         │
│ ├── HTTP/2:   TCP-level (single connection, in-order delivery)        │
│ └── HTTP/3:   ❌ None (independent streams in QUIC)                   │
│                                                                       │
│ CONNECTION SETUP:                                                     │
│ ├── HTTP/1.1 + TLS 1.2: 3-4 RTTs                                      │
│ ├── HTTP/2 + TLS 1.3:   2-3 RTTs                                      │
│ └── HTTP/3 (QUIC):      1-2 RTTs (0-RTT for resumed)                  │
│                                                                       │
│ MUST-KNOW STATUS CODES:                                               │
│ ├── 200 OK, 201 Created, 204 No Content                               │
│ ├── 301 Permanent, 302 Temporary, 304 Not Modified                    │
│ ├── 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found   │
│ └── 500 Internal Error, 502 Bad Gateway, 503 Unavailable              │
│                                                                       │
│ IDEMPOTENT METHODS: GET, PUT, DELETE, HEAD, OPTIONS                   │
│ NON-IDEMPOTENT: POST, PATCH                                           │
│                                                                       │
│ CACHING:                                                              │
│ ├── Cache-Control: max-age=3600                                       │
│ ├── ETag: "abc123" (for conditional requests)                         │
│ └── private vs public (CDN can cache if public)                       │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Next:** [5. DNS Explained →](./dns-explained)

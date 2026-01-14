---
title: "4. Pagination & Connection Pooling"
sidebar_position: 5
description: Offset vs Cursor Pagination and HikariCP Configuration.
---

# Pagination & Connection Pooling

:::info Interview Importance ⭐⭐⭐⭐
Pagination is asked in almost every system design interview. Connection pooling is crucial for production-grade applications.
:::

---

## 1. Pagination Strategies

### Why Pagination Matters

Imagine a table with 10 million records. Returning all of them would:
- 🔥 Overload the database
- 🐢 Slow down the network
- 💥 Crash the client application
- 📈 Consume excessive memory

**Solution:** Return data in pages (chunks).

---

## 2. Offset Pagination (The Traditional Way)

### How It Works

```sql
-- Page 1 (first 10 results)
SELECT * FROM products ORDER BY id LIMIT 10 OFFSET 0;

-- Page 2 (next 10 results)
SELECT * FROM products ORDER BY id LIMIT 10 OFFSET 10;

-- Page 100 (results 991-1000)
SELECT * FROM products ORDER BY id LIMIT 10 OFFSET 990;
```

### The Problem: Performance Degrades with OFFSET

```
LIMIT 10 OFFSET 1,000,000

What the database does:
1. Scan and sort ALL 1,000,000+ rows
2. Skip first 1,000,000 rows (WASTED WORK!)
3. Return only 10 rows

Time complexity: O(N) where N = offset value
```

```
Performance Comparison:

OFFSET 0:      ████░░░░░░░░░░░░░░░░░░  10ms
OFFSET 10000:  ████████░░░░░░░░░░░░░░  100ms
OFFSET 100000: ████████████░░░░░░░░░░  500ms
OFFSET 1000000:████████████████████████ 5000ms+
```

### When to Use Offset Pagination

| Scenario | Offset OK? | Reason |
|----------|------------|--------|
| Small tables (10K rows) | ✅ Yes | Fast enough |
| Admin dashboards | ✅ Yes | Few users, admin can wait |
| Page jump required ("Go to page 50") | ✅ Yes | No other option |
| Mobile app infinite scroll | ❌ No | Too slow for deep pages |
| API with millions of records | ❌ No | O(N) too expensive |

---

## 3. Cursor-Based (Keyset) Pagination

### How It Works

Instead of "skip N rows", say "give me rows AFTER this value".

```sql
-- First page
SELECT * FROM products 
WHERE id > 0
ORDER BY id ASC 
LIMIT 10;
-- Returns: id = 1, 2, 3, ..., 10

-- Next page (cursor = last id from previous page = 10)
SELECT * FROM products 
WHERE id > 10  -- Cursor value!
ORDER BY id ASC 
LIMIT 10;
-- Returns: id = 11, 12, 13, ..., 20

-- Next page (cursor = 20)
SELECT * FROM products 
WHERE id > 20
ORDER BY id ASC 
LIMIT 10;
```

### Why It's Faster

```
OFFSET 1,000,000:
├── Scan 1,000,000 rows
├── Discard 1,000,000 rows
└── Return 10 rows
Time: O(N) ≈ 5 seconds

CURSOR (id > 1000000):
├── Jump directly to id = 1,000,001 (using index!)
└── Return 10 rows
Time: O(log N) ≈ 5 milliseconds
```

### Implementation Example

**API Response with Cursor:**

```json
{
  "data": [
    {"id": 101, "name": "Product A"},
    {"id": 102, "name": "Product B"},
    {"id": 110, "name": "Product C"}
  ],
  "pagination": {
    "next_cursor": "110",
    "has_more": true
  }
}

// Client requests next page:
// GET /api/products?cursor=110&limit=10
```

**Backend Implementation:**

```java
@GetMapping("/products")
public Page<Product> getProducts(
    @RequestParam(required = false) Long cursor,
    @RequestParam(defaultValue = "10") int limit
) {
    List<Product> products;
    
    if (cursor == null) {
        // First page
        products = productRepo.findTopNByOrderByIdAsc(limit + 1);
    } else {
        // Subsequent pages
        products = productRepo.findByIdGreaterThanOrderByIdAsc(cursor, limit + 1);
    }
    
    boolean hasMore = products.size() > limit;
    if (hasMore) {
        products = products.subList(0, limit);  // Remove extra item
    }
    
    Long nextCursor = hasMore ? products.get(products.size() - 1).getId() : null;
    
    return new Page<>(products, nextCursor, hasMore);
}
```

### Cursor with Multiple Columns

When sorting by non-unique column, include a tiebreaker:

```sql
-- Sort by created_at (non-unique) + id (unique tiebreaker)
SELECT * FROM products 
WHERE (created_at, id) > ('2024-01-15 10:30:00', 12345)
ORDER BY created_at ASC, id ASC
LIMIT 10;
```

**Encoded cursor:**

```java
// Cursor contains both values
String cursor = Base64.encode(createdAt + "|" + id);
// Result: "MjAyNC0wMS0xNSAxMDozMDowMHwxMjM0NQ=="
```

### Comparison: Offset vs Cursor

| Feature | Offset | Cursor |
|---------|--------|--------|
| **Performance** | O(N) - degrades | O(log N) - constant |
| **Jump to page** | ✅ Easy | ❌ Not possible |
| **Consistency** | ❌ Rows can shift | ✅ Stable |
| **Implementation** | Simple | More complex |
| **Use case** | Admin panels | Infinite scroll, APIs |

### Consistency Problem with Offset

```
Time →

Initial data: [A, B, C, D, E, F, G, H, I, J]
Page 1 (OFFSET 0, LIMIT 5): [A, B, C, D, E]

Someone inserts 'Z' at position 1

Data now: [Z, A, B, C, D, E, F, G, H, I, J]
Page 2 (OFFSET 5, LIMIT 5): [E, F, G, H, I]

User sees 'E' TWICE! (on both pages)
```

**Cursor doesn't have this problem** because it uses actual values, not positions.

---

## 4. Connection Pooling

### Why Connection Pooling?

Creating a database connection is **expensive**:

```
Connection Creation Steps:
1. TCP 3-way handshake (network round-trip)
2. SSL/TLS negotiation (if encrypted)
3. Database authentication
4. Allocate server-side resources

Time: 50-200ms per connection

If 100 requests/sec each create new connection:
= 100 × 100ms = 10 seconds of just connection overhead!
```

### What is Connection Pooling?

Maintain a pool of **already-open connections** that are reused.

```
Without Pool:                     With Pool:
                                  ┌─────────────────────┐
Request 1 ──→ Open ──→ Use ──→ Close   │  Connection Pool    │
Request 2 ──→ Open ──→ Use ──→ Close   │  ┌───┐┌───┐┌───┐    │
Request 3 ──→ Open ──→ Use ──→ Close   │  │C1 ││C2 ││C3 │    │
                                  │  └───┘└───┘└───┘    │
Each request: ~100ms overhead     └─────────────────────┘
                                   ↓    ↓    ↓
                                  Request borrows C1
                                  Request returns C1
                                  Next request reuses C1
                                  
                                  Overhead: ~1ms
```

---

## 5. HikariCP (The Fastest Connection Pool)

### What is HikariCP?

- Default connection pool in **Spring Boot 2.0+**
- Extremely lightweight and fast
- "Hikari" means "light" in Japanese

### Basic Configuration

```yaml
# application.yml
spring:
  datasource:
    hikari:
      # Pool settings
      maximum-pool-size: 10
      minimum-idle: 5
      
      # Timeouts
      connection-timeout: 30000    # 30 seconds to get connection
      idle-timeout: 600000         # 10 minutes before idle connection closed
      max-lifetime: 1800000        # 30 minutes max connection age
      
      # Validation
      connection-test-query: SELECT 1
```

### Key Configuration Options Explained

| Property | Default | Description |
|----------|---------|-------------|
| `maximum-pool-size` | 10 | Max connections in pool |
| `minimum-idle` | Same as max | Min idle connections |
| `connection-timeout` | 30000ms | Time to wait for connection |
| `idle-timeout` | 600000ms | When to close idle connections |
| `max-lifetime` | 1800000ms | Max age of a connection |
| `leak-detection-threshold` | 0 | Detect connection leaks |

---

## 6. Pool Sizing: The Formula

### The Myth: "More Connections = Better"

**Reality:** More connections can actually be SLOWER!

```
Why too many connections hurt:

Database Server (4 CPU cores):
├── 100 connections = 100 threads
├── 4 cores can run 4 threads at once
├── The other 96 threads context-switch constantly
└── CPU spends more time switching than working!
```

### The Formula (PostgreSQL Wiki)

```
connections = (core_count * 2) + effective_spindle_count

For SSD (spindle_count ≈ 0):
connections ≈ core_count * 2
```

**Example:**
- Server: 4 CPU cores, SSD storage
- Pool size = (4 × 2) + 0 = **8-10 connections**

### General Guidelines

| Server Size | Recommended Pool Size |
|-------------|----------------------|
| Small (2 cores) | 5-10 |
| Medium (4 cores) | 10-20 |
| Large (8 cores) | 20-40 |
| Very Large (16+ cores) | 40-80 |

### Too Small vs Too Large Pool

```
Pool too SMALL (5 connections, 100 concurrent requests):
├── 95 requests wait in queue
├── High latency (waiting for connection)
└── Underutilized database

Pool too LARGE (500 connections, 100 concurrent requests):
├── Database: 500 connections = 500 threads = context switching hell
├── Memory: 500 connections × 10MB = 5GB just for connections
└── Actually SLOWER than smaller pool
```

---

## 7. Connection Pool Exhaustion

### The Problem

```
Error: Connection is not available, request timed out after 30000ms

Cause: All connections in pool are "borrowed" and busy
       New requests can't get a connection
```

### Common Causes

#### 1. Connection Leak

```java
// ❌ Connection never returned to pool!
public void badMethod() {
    Connection conn = dataSource.getConnection();
    // Do stuff...
    // MISSING: conn.close();
}

// ✅ Always use try-with-resources
public void goodMethod() {
    try (Connection conn = dataSource.getConnection()) {
        // Do stuff...
    }  // Automatically closed (returned to pool)
}
```

#### 2. Slow Queries

```java
// Connection borrowed for 30 seconds!
@Transactional
public void slowMethod() {
    List<Data> all = repository.findAllHugeTable();  // Takes 30 seconds
    // Connection held during entire processing
}
```

#### 3. Long Transactions

```java
// ❌ HTTP call inside transaction holds connection!
@Transactional
public void badTransaction() {
    order.setStatus("PENDING");
    orderRepo.save(order);
    
    // External API call takes 5 seconds
    paymentService.callExternalApi(order);  // Connection still held!
    
    order.setStatus("PAID");
    orderRepo.save(order);
}

// ✅ HTTP call outside transaction
public void goodTransaction() {
    saveOrderPending();  // Short transaction
    
    PaymentResult result = paymentService.callExternalApi(order);  // No DB connection
    
    if (result.isSuccess()) {
        markOrderPaid();  // Another short transaction
    }
}
```

### How to Detect Connection Leaks

**HikariCP Leak Detection:**

```yaml
spring:
  datasource:
    hikari:
      leak-detection-threshold: 60000  # Log warning if connection held > 60s
```

**Log output:**

```
WARN  HikariPool-1 - Connection leak detection triggered for connection
      Stack trace: 
        at com.example.BadService.method(BadService.java:42)
        at ...
```

---

## 8. Connection Pool Monitoring

### Key Metrics to Monitor

| Metric | Healthy Value | Alert When |
|--------|---------------|------------|
| **Active Connections** | Below max | Near max (80%+) |
| **Pending Requests** | 0-5 | Growing queue |
| **Connection Wait Time** | 1-10ms | More than 100ms consistently |
| **Connection Acquisition Failures** | 0 | Any failures |

### Monitoring with Actuator

```yaml
# Enable Hikari metrics
management:
  endpoints:
    web:
      exposure:
        include: health,metrics
  metrics:
    enable:
      hikari: true
```

**Metrics endpoint:**

```http
GET /actuator/metrics/hikaricp.connections.active
GET /actuator/metrics/hikaricp.connections.idle
GET /actuator/metrics/hikaricp.connections.pending
GET /actuator/metrics/hikaricp.connections.timeout
```

### Prometheus/Grafana Setup

```java
// Automatic with micrometer-registry-prometheus
// Metrics exposed at /actuator/prometheus

hikaricp_connections_active{pool="HikariPool-1"} 5
hikaricp_connections_idle{pool="HikariPool-1"} 3
hikaricp_connections_pending{pool="HikariPool-1"} 0
hikaricp_connections_max{pool="HikariPool-1"} 10
```

---

## 9. Best Practices

### Pagination Best Practices

```
✅ DO:
├── Use cursor pagination for infinite scroll / mobile apps
├── Use OFFSET for admin panels with jump-to-page
├── Always include ORDER BY with LIMIT
├── Index the columns used in ORDER BY
└── Set reasonable LIMIT (10-100, not 1000+)

❌ DON'T:
├── Use OFFSET > 10000 on production APIs
├── Paginate without ORDER BY (random order!)
└── Return 1000+ items per page
```

### Connection Pool Best Practices

```
✅ DO:
├── Size pool based on formula (cores × 2)
├── Set connection-timeout (don't wait forever)
├── Enable leak detection in development
├── Monitor active connections
└── Use try-with-resources for raw JDBC

❌ DON'T:
├── Set pool size to 100+ without reason
├── Do I/O calls inside transactions
├── Hold connections longer than necessary
└── Ignore connection timeout exceptions
```

---

## 10. Top Interview Questions

### Q1: What is the problem with OFFSET pagination?

**Answer:** OFFSET has O(N) complexity because the database must:
1. Scan and sort all rows
2. Skip the first N rows (wasted work)
3. Return the requested rows

For `OFFSET 1000000`, it scans 1 million rows just to skip them. This gets progressively slower as the offset increases.

### Q2: How does cursor-based pagination solve this?

**Answer:** Cursor pagination uses indexed column values (like `id > 1000`) instead of row positions. The database can:
1. Use the index to jump directly to the cursor position
2. Scan only the requested rows

This gives O(log N) performance that doesn't degrade with pagination depth.

### Q3: What is connection pooling and why is it needed?

**Answer:** Connection pooling maintains a set of pre-opened database connections that are reused across requests. It's needed because:
1. Opening a connection is expensive (50-200ms for TCP, SSL, auth)
2. Pooled connections are borrowed and returned (1ms overhead)
3. Limits total connections to the database (prevents overload)

### Q4: How do you size a connection pool?

**Answer:** Use the formula: `connections = (core_count × 2) + spindle_count`

For a 4-core server with SSD: ~10 connections

Too few: requests wait in queue
Too many: context switching overhead and memory waste

### Q5: How do you detect connection leaks?

**Answer:**
1. Enable HikariCP leak detection: `leak-detection-threshold: 60000`
2. Monitor metrics: `hikaricp.connections.active` near max
3. Watch for `Connection timeout` errors
4. Check for code that doesn't close connections (missing try-with-resources)

---

## Quick Reference Card

```
┌──────────────────────────────────────────────────────────────────┐
│             PAGINATION & POOLING CHEAT SHEET                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ PAGINATION:                                                      │
│ ├── OFFSET: Simple, O(N), OK for small data                    │
│ └── CURSOR: Complex, O(log N), best for large data/APIs        │
│                                                                  │
│ CURSOR PAGINATION:                                               │
│ └── SELECT * FROM t WHERE id > :cursor ORDER BY id LIMIT 10    │
│                                                                  │
│ CONNECTION POOL SIZING:                                          │
│ └── Pool Size = (CPU Cores × 2) + Spindles                      │
│     4 cores → ~10 connections                                   │
│                                                                  │
│ HIKARICP CONFIG (application.yml):                               │
│ └── maximum-pool-size: 10                                       │
│     connection-timeout: 30000                                   │
│     leak-detection-threshold: 60000                             │
│                                                                  │
│ CONNECTION LEAK CAUSES:                                          │
│ ├── Connection not closed (use try-with-resources!)            │
│ ├── Slow queries                                                │
│ └── I/O inside transactions                                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

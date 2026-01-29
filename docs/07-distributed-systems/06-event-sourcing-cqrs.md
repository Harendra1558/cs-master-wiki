---
title: 6. Event Sourcing & CQRS
sidebar_position: 6
description: Master Event Sourcing, CQRS, event stores, and building event-driven systems for interviews.
keywords: [event sourcing, cqrs, event store, event driven, projections, aggregate]
---

# Event Sourcing & CQRS

:::info Interview Importance ⭐⭐⭐⭐
Event Sourcing and CQRS are advanced patterns that come up in system design interviews for complex domains. Understanding when and why to use them distinguishes senior engineers.
:::

## 1. Traditional vs Event Sourcing

### Traditional State Storage

```text
TRADITIONAL APPROACH: Store current state

┌─────────────────────────────────────────────────────────────┐
│ Account Table                                                │
├─────────────────────────────────────────────────────────────┤
│ account_id │ balance │ updated_at        │                  │
├────────────┼─────────┼───────────────────┤                  │
│ 123        │ 500     │ 2024-01-15 10:30 │                  │
└─────────────────────────────────────────────────────────────┘

Operation:
UPDATE accounts SET balance = balance - 100 WHERE account_id = 123

Problems:
├── History is LOST (can't see how we got here)
├── Can't ask: "What was balance on Jan 10th?"
├── Can't debug: "Why is balance wrong?"
├── Audit trail requires separate logging
└── Temporal queries are expensive/impossible
```

### Event Sourcing Approach

```text
EVENT SOURCING: Store events that happened

┌─────────────────────────────────────────────────────────────┐
│ Events Table                                                 │
├─────────────────────────────────────────────────────────────┤
│ event_id │ account_id │ event_type   │ data        │ time   │
├──────────┼────────────┼──────────────┼─────────────┼────────┤
│ 1        │ 123        │ AccountOpened│ {initial:0} │ Jan 1  │
│ 2        │ 123        │ MoneyDeposit │ {amount:500}│ Jan 5  │
│ 3        │ 123        │ MoneyWithdraw│ {amount:100}│ Jan 10 │
│ 4        │ 123        │ MoneyDeposit │ {amount:200}│ Jan 15 │
└─────────────────────────────────────────────────────────────┘

Current state = Replay all events:
0 + 500 - 100 + 200 = 600 ✓

Benefits:
├── Complete audit trail (every change recorded)
├── Time travel (reconstruct state at any point)
├── Debug history (see exactly what happened)
├── Event-driven architecture (react to events)
└── No data loss (events are immutable)
```

### Core Concepts

```text
EVENT: An immutable fact that something happened in the past
       Always past tense: "AccountCreated", "MoneyDeposited"
       Never modified or deleted

AGGREGATE: Entity boundary for events
           All events for an aggregate are stored together
           Example: Account, Order, User

EVENT STORE: Database optimized for storing and retrieving events
             Append-only (no updates/deletes)
             Ordered by timestamp or sequence number

PROJECTION: Derived read model built from events
            Optimized for specific queries
            Can be rebuilt from events at any time
```

---

## 2. Event Store Design

### Event Structure

```java
@Entity
public class Event {
    @Id
    private UUID eventId;
    
    private String aggregateType;     // "Account"
    private String aggregateId;       // "account-123"
    private long version;             // 1, 2, 3, ...
    
    private String eventType;         // "MoneyDeposited"
    private String payload;           // JSON event data
    private Map<String, String> metadata;  // correlation ID, user, etc.
    
    private Instant timestamp;
}

// Event base class
public abstract class DomainEvent {
    private final Instant occurredAt;
    private final String correlationId;
    
    public abstract String getAggregateId();
}

// Concrete events
public class AccountOpened extends DomainEvent {
    private final String accountId;
    private final String ownerName;
    private final BigDecimal initialDeposit;
}

public class MoneyDeposited extends DomainEvent {
    private final String accountId;
    private final BigDecimal amount;
    private final String description;
}

public class MoneyWithdrawn extends DomainEvent {
    private final String accountId;
    private final BigDecimal amount;
    private final String description;
}
```

### Event Store Operations

```java
public interface EventStore {
    
    // Append events for an aggregate
    void append(String aggregateId, List<DomainEvent> events, long expectedVersion);
    
    // Load all events for an aggregate
    List<DomainEvent> loadEvents(String aggregateId);
    
    // Load events from a specific version
    List<DomainEvent> loadEvents(String aggregateId, long fromVersion);
    
    // Subscribe to new events (for projections)
    Subscription subscribe(String eventType, Consumer<DomainEvent> handler);
    
    // Stream all events (for rebuilding projections)
    Stream<DomainEvent> streamAllEvents(long fromPosition);
}

// Optimistic concurrency control
public void append(String aggregateId, List<DomainEvent> events, long expectedVersion) {
    // Check current version matches expected
    long currentVersion = getCurrentVersion(aggregateId);
    
    if (currentVersion != expectedVersion) {
        throw new ConcurrencyException(
            "Expected version " + expectedVersion + " but was " + currentVersion
        );
    }
    
    // Append events with incrementing version
    for (DomainEvent event : events) {
        eventRepository.save(new EventRecord(
            UUID.randomUUID(),
            aggregateId,
            ++currentVersion,
            event.getClass().getSimpleName(),
            serialize(event),
            Instant.now()
        ));
    }
}
```

### Aggregate Implementation

```java
public class Account {
    private String accountId;
    private BigDecimal balance;
    private AccountStatus status;
    private long version;
    
    // Pending events to be persisted
    private final List<DomainEvent> pendingEvents = new ArrayList<>();
    
    // Private constructor - use factory method
    private Account() {
        this.balance = BigDecimal.ZERO;
        this.status = AccountStatus.CLOSED;
    }
    
    // Factory method - creates new aggregate
    public static Account open(String accountId, String ownerName, BigDecimal initialDeposit) {
        Account account = new Account();
        account.apply(new AccountOpened(accountId, ownerName, initialDeposit));
        return account;
    }
    
    // Reconstitute from events - loads existing aggregate
    public static Account fromEvents(List<DomainEvent> events) {
        Account account = new Account();
        for (DomainEvent event : events) {
            account.applyEvent(event);
            account.version++;
        }
        return account;
    }
    
    // Command - business logic that produces events
    public void deposit(BigDecimal amount, String description) {
        if (status != AccountStatus.OPEN) {
            throw new AccountClosedException();
        }
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidAmountException();
        }
        
        apply(new MoneyDeposited(accountId, amount, description));
    }
    
    public void withdraw(BigDecimal amount, String description) {
        if (status != AccountStatus.OPEN) {
            throw new AccountClosedException();
        }
        if (amount.compareTo(balance) > 0) {
            throw new InsufficientFundsException();
        }
        
        apply(new MoneyWithdrawn(accountId, amount, description));
    }
    
    // Apply event - updates state and adds to pending
    private void apply(DomainEvent event) {
        applyEvent(event);
        pendingEvents.add(event);
    }
    
    // Event handlers - pure state mutations
    private void applyEvent(DomainEvent event) {
        if (event instanceof AccountOpened e) {
            this.accountId = e.getAccountId();
            this.balance = e.getInitialDeposit();
            this.status = AccountStatus.OPEN;
        } else if (event instanceof MoneyDeposited e) {
            this.balance = this.balance.add(e.getAmount());
        } else if (event instanceof MoneyWithdrawn e) {
            this.balance = this.balance.subtract(e.getAmount());
        } else if (event instanceof AccountClosed e) {
            this.status = AccountStatus.CLOSED;
        }
    }
    
    public List<DomainEvent> getPendingEvents() {
        return new ArrayList<>(pendingEvents);
    }
    
    public void clearPendingEvents() {
        pendingEvents.clear();
    }
}
```

### Repository Pattern

```java
@Repository
public class AccountRepository {
    private final EventStore eventStore;
    
    public Account load(String accountId) {
        List<DomainEvent> events = eventStore.loadEvents(accountId);
        
        if (events.isEmpty()) {
            throw new AggregateNotFoundException(accountId);
        }
        
        return Account.fromEvents(events);
    }
    
    public void save(Account account) {
        List<DomainEvent> events = account.getPendingEvents();
        
        if (!events.isEmpty()) {
            eventStore.append(
                account.getAccountId(),
                events,
                account.getVersion()
            );
            
            account.clearPendingEvents();
        }
    }
}

// Usage
@Service
public class AccountService {
    private final AccountRepository accountRepository;
    
    @Transactional
    public void transfer(String fromId, String toId, BigDecimal amount) {
        Account from = accountRepository.load(fromId);
        Account to = accountRepository.load(toId);
        
        from.withdraw(amount, "Transfer to " + toId);
        to.deposit(amount, "Transfer from " + fromId);
        
        accountRepository.save(from);
        accountRepository.save(to);
    }
}
```

---

## 3. Snapshots

### Why Snapshots?

```text
Problem: Loading 10,000 events for every operation is SLOW

Account with 10 years of history:
├── 50 transactions/month
├── 600 events/year
├── 6000 events total
└── Loading takes seconds instead of milliseconds!

Solution: Periodically save state snapshots

┌─────────────────────────────────────────────────────────────┐
│ Events:    E1 → E2 → E3 → ... → E1000 → E1001 → E1002      │
│                              ↑                              │
│                          Snapshot                           │
│                       (state at E1000)                      │
│                                                             │
│ To load current state:                                      │
│ 1. Load snapshot at E1000                                   │
│ 2. Replay E1001, E1002                                      │
│ 3. Done! Only 2 events to replay                            │
└─────────────────────────────────────────────────────────────┘
```

### Snapshot Implementation

```java
@Entity
public class Snapshot {
    @Id
    private String aggregateId;
    private long version;          // Version at which snapshot was taken
    private String aggregateType;
    private String payload;        // Serialized aggregate state
    private Instant createdAt;
}

public class SnapshotStore {
    
    public Optional<Snapshot> load(String aggregateId) {
        return snapshotRepository.findById(aggregateId);
    }
    
    public void save(String aggregateId, long version, Object state) {
        Snapshot snapshot = new Snapshot(
            aggregateId,
            version,
            state.getClass().getSimpleName(),
            serialize(state),
            Instant.now()
        );
        snapshotRepository.save(snapshot);
    }
}

// Modified repository with snapshot support
@Repository
public class AccountRepository {
    private final EventStore eventStore;
    private final SnapshotStore snapshotStore;
    private final int SNAPSHOT_THRESHOLD = 100;  // Snapshot every 100 events
    
    public Account load(String accountId) {
        // Try to load from snapshot first
        Optional<Snapshot> snapshot = snapshotStore.load(accountId);
        
        Account account;
        long fromVersion;
        
        if (snapshot.isPresent()) {
            account = deserialize(snapshot.get().getPayload());
            fromVersion = snapshot.get().getVersion();
        } else {
            account = new Account();
            fromVersion = 0;
        }
        
        // Load events after snapshot
        List<DomainEvent> events = eventStore.loadEvents(accountId, fromVersion);
        for (DomainEvent event : events) {
            account.applyEvent(event);
        }
        
        return account;
    }
    
    public void save(Account account) {
        List<DomainEvent> events = account.getPendingEvents();
        
        if (!events.isEmpty()) {
            eventStore.append(account.getAccountId(), events, account.getVersion());
            account.clearPendingEvents();
            
            // Create snapshot if threshold reached
            if (account.getVersion() % SNAPSHOT_THRESHOLD == 0) {
                snapshotStore.save(
                    account.getAccountId(),
                    account.getVersion(),
                    account.getSnapshot()  // Account provides snapshot data
                );
            }
        }
    }
}
```

---

## 4. CQRS (Command Query Responsibility Segregation)

### What is CQRS?

```text
TRADITIONAL: Same model for reads and writes

┌───────────────────────────────────────────────────────────────┐
│                        ┌─────────────┐                        │
│   Write ──────────────→│             │←────────────── Read    │
│   (UPDATE, INSERT)     │  Same Model │      (SELECT)          │
│                        │             │                        │
│                        └─────────────┘                        │
└───────────────────────────────────────────────────────────────┘

Problem: Model optimized for one isn't optimal for the other

═══════════════════════════════════════════════════════════════════

CQRS: Separate models for reads and writes

┌───────────────────────────────────────────────────────────────┐
│                                                               │
│   Write ──────────────→ ┌─────────────┐                       │
│   Commands              │ Write Model │                       │
│                         │ (Domain)    │                       │
│                         └──────┬──────┘                       │
│                                │ Events                       │
│                                ↓                              │
│                         ┌─────────────┐                       │
│   Read ←────────────────│ Read Model  │                       │
│   Queries               │ (Projection)│                       │
│                         └─────────────┘                       │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Why CQRS?

```text
BENEFITS:

1. OPTIMIZED READ MODELS
   Write model: Normalized, domain-focused
   Read model: Denormalized, query-optimized
   
   Example: Order with 50 line items
   Write: Order aggregate, OrderItem entities
   Read: Single pre-computed JSON document

2. SCALABILITY
   Reads typically 10-100x more than writes
   Scale read/write sides independently
   
   Write side: Strong consistency, limited scale
   Read side: Eventually consistent, infinite scale

3. DIFFERENT STORAGE
   Write: Event store, relational DB
   Read: Elasticsearch, Redis, graph DB
   
   Use best tool for each job!

4. SIMPLIFIED MODELS
   Write model: Complex business logic, invariants
   Read model: Simple data retrieval, no logic
```

### Projections

```text
PROJECTION: Read model built from events

Events:
├── OrderCreated {orderId: 1, customerId: 456, items: [...]}
├── ItemAdded {orderId: 1, productId: 789, qty: 2}
├── OrderShipped {orderId: 1, trackingNumber: "ABC123"}

Order List Projection (for admin dashboard):
┌──────────────────────────────────────────────────────────────┐
│ orderId │ customer │ itemCount │ status  │ shippedAt        │
├─────────┼──────────┼───────────┼─────────┼──────────────────┤
│ 1       │ John     │ 3         │ SHIPPED │ 2024-01-15       │
└──────────────────────────────────────────────────────────────┘

Customer Order History Projection (for customer portal):
┌──────────────────────────────────────────────────────────────┐
│ Customer: John (456)                                          │
│ Orders:                                                       │
│   - Order #1: 3 items, Shipped, Track: ABC123                │
│   - Order #2: 1 item, Processing                             │
└──────────────────────────────────────────────────────────────┘

Product Inventory Projection (for warehouse):
┌──────────────────────────────────────────────────────────────┐
│ productId │ ordered │ shipped │ available                    │
├───────────┼─────────┼─────────┼────────────                  │
│ 789       │ 100     │ 45      │ 250                          │
└──────────────────────────────────────────────────────────────┘

Same events → Multiple specialized read models!
```

### Projection Implementation

```java
// Projection for order summaries
@Component
public class OrderSummaryProjection {
    
    private final OrderSummaryRepository summaryRepository;
    
    @EventHandler
    public void on(OrderCreated event) {
        OrderSummary summary = new OrderSummary(
            event.getOrderId(),
            event.getCustomerId(),
            0,  // itemCount
            OrderStatus.CREATED,
            event.getTimestamp()
        );
        summaryRepository.save(summary);
    }
    
    @EventHandler
    public void on(ItemAdded event) {
        OrderSummary summary = summaryRepository.findById(event.getOrderId());
        summary.incrementItemCount(event.getQuantity());
        summaryRepository.save(summary);
    }
    
    @EventHandler
    public void on(OrderShipped event) {
        OrderSummary summary = summaryRepository.findById(event.getOrderId());
        summary.setStatus(OrderStatus.SHIPPED);
        summary.setShippedAt(event.getTimestamp());
        summary.setTrackingNumber(event.getTrackingNumber());
        summaryRepository.save(summary);
    }
}

// Projection stored in different database
@Document(collection = "order_summaries")  // MongoDB
public class OrderSummary {
    @Id
    private String orderId;
    private String customerId;
    private int itemCount;
    private OrderStatus status;
    private Instant createdAt;
    private Instant shippedAt;
    private String trackingNumber;
}

// Query service uses the projection
@Service
public class OrderQueryService {
    private final OrderSummaryRepository summaryRepository;
    
    public List<OrderSummary> getRecentOrders(String customerId, int limit) {
        return summaryRepository.findByCustomerIdOrderByCreatedAtDesc(customerId, limit);
    }
    
    public OrderSummary getOrder(String orderId) {
        return summaryRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));
    }
}
```

### Rebuilding Projections

```text
Projections can be REBUILT at any time by replaying events!

Use cases:
├── Bug in projection logic fixed
├── Schema change in read model
├── New projection created
├── Data corruption recovery

Process:
┌─────────────────────────────────────────────────────────────┐
│ 1. Delete existing projection data                          │
│ 2. Start from event #1                                      │
│ 3. Apply each event to projection                           │
│ 4. Continue until caught up                                 │
│                                                             │
│ During rebuild:                                             │
│ ├── Projection is stale (acceptable for read model)         │
│ ├── Use blue-green: build new, then swap                    │
│ └── Parallel processing for speed                           │
└─────────────────────────────────────────────────────────────┘
```

```java
@Component
public class ProjectionRebuilder {
    private final EventStore eventStore;
    private final OrderSummaryProjection projection;
    private final OrderSummaryRepository repository;
    
    public void rebuild() {
        // 1. Clear existing data
        repository.deleteAll();
        
        // 2. Reset projection position
        long position = 0;
        
        // 3. Stream all events and apply
        eventStore.streamAllEvents(position)
            .forEach(event -> {
                if (event instanceof OrderCreated) {
                    projection.on((OrderCreated) event);
                } else if (event instanceof ItemAdded) {
                    projection.on((ItemAdded) event);
                } else if (event instanceof OrderShipped) {
                    projection.on((OrderShipped) event);
                }
            });
    }
}
```

---

## 5. Eventual Consistency in CQRS

### The Consistency Challenge

```text
Write happens:
1. Command → Write Model → Event stored
2. Event published to read model
3. Read model updated (async)

Timeline:
T0: User submits order
T1: Event stored (order exists in write model)
T2: User redirected to order page
T3: Query hits read model → ORDER NOT FOUND! (not yet projected)
T4: Projection updated
T5: User refreshes → Order appears

Gap between T1 and T4 = EVENTUAL CONSISTENCY WINDOW
```

### Handling Eventual Consistency

```text
STRATEGY 1: Accept the delay
├── User sees "Processing..." message
├── Polling or WebSocket for updates
├── Works for background processes

STRATEGY 2: Read from write model for recent data
├── After write, read from same source briefly
├── Switch to read model after delay
├── Complex but provides consistency UX

STRATEGY 3: Synchronous projection update
├── Update projection in same transaction
├── Defeats some benefits of CQRS
├── Use sparingly for critical data

STRATEGY 4: Optimistic UI
├── Return expected result immediately
├── Client displays optimistic data
├── Correct if projection differs
```

```java
// Strategy 1: Polling
@RestController
public class OrderController {
    
    @PostMapping("/orders")
    public ResponseEntity<CreateOrderResponse> createOrder(@RequestBody CreateOrderRequest request) {
        String orderId = orderService.createOrder(request);
        
        return ResponseEntity.accepted()
            .body(new CreateOrderResponse(orderId, "/orders/" + orderId));
        // 202 Accepted - Order is being processed
    }
    
    @GetMapping("/orders/{orderId}")
    public ResponseEntity<?> getOrder(@PathVariable String orderId) {
        Optional<OrderSummary> order = orderQueryService.findById(orderId);
        
        if (order.isPresent()) {
            return ResponseEntity.ok(order.get());
        } else {
            // Might not be projected yet
            return ResponseEntity.status(202)
                .body(new ProcessingResponse("Order is being processed"));
        }
    }
}

// Strategy 2: Read from write model for owner
@Service
public class OrderQueryService {
    private final WriteModelRepository writeRepository;  // Event sourced
    private final ReadModelRepository readRepository;    // Projection
    
    public OrderDetails getOrder(String orderId, String requesterId) {
        // For order owner, read from write model for freshness
        if (isOrderOwner(orderId, requesterId)) {
            Order order = writeRepository.load(orderId);
            return toOrderDetails(order);  // Convert to DTO
        }
        
        // For others, read from optimized read model
        return readRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));
    }
}
```

---

## 6. Event Versioning

### The Schema Evolution Problem

```text
Events are IMMUTABLE - you can't change stored events.

But your domain evolves:
├── Add new fields
├── Rename fields
├── Change field types
├── Split/merge events

Version 1:
{ "type": "UserRegistered", "name": "John Doe" }

Version 2 (after change):
{ "type": "UserRegistered", "firstName": "John", "lastName": "Doe" }

How do you handle old events when replaying?
```

### Upcasting Strategy

```java
// Event versioning with upcasters
public interface EventUpcaster {
    boolean canUpcast(String eventType, int version);
    JsonNode upcast(JsonNode event, int fromVersion);
}

public class UserRegisteredUpcaster implements EventUpcaster {
    
    @Override
    public boolean canUpcast(String eventType, int version) {
        return eventType.equals("UserRegistered") && version < 2;
    }
    
    @Override
    public JsonNode upcast(JsonNode event, int fromVersion) {
        if (fromVersion == 1) {
            // V1 → V2: Split "name" into "firstName" and "lastName"
            String fullName = event.get("name").asText();
            String[] parts = fullName.split(" ", 2);
            
            ObjectNode upcasted = objectMapper.createObjectNode();
            upcasted.put("firstName", parts[0]);
            upcasted.put("lastName", parts.length > 1 ? parts[1] : "");
            
            return upcasted;
        }
        return event;
    }
}

// Event store applies upcasters when loading
public List<DomainEvent> loadEvents(String aggregateId) {
    return eventRepository.findByAggregateId(aggregateId).stream()
        .map(record -> {
            JsonNode data = record.getPayload();
            int version = record.getSchemaVersion();
            
            // Apply upcasters
            for (EventUpcaster upcaster : upcasters) {
                while (upcaster.canUpcast(record.getEventType(), version)) {
                    data = upcaster.upcast(data, version);
                    version++;
                }
            }
            
            return deserialize(record.getEventType(), data);
        })
        .collect(toList());
}
```

### Best Practices for Event Schema

```text
1. ADD FIELDS, DON'T REMOVE
   Add new optional fields
   Keep old fields (even if deprecated)

2. USE SCHEMA VERSIONING
   Store schema version with each event
   Upcast old versions when reading

3. MAKE FIELDS OPTIONAL
   New consumers handle missing fields
   Defaults for backward compatibility

4. USE SEMANTIC VERSIONING FOR EVENTS
   Minor version: New optional field
   Major version: Breaking change (need upcaster)

5. CREATE NEW EVENT TYPES INSTEAD OF MODIFYING
   Instead of changing UserRegistered...
   Create UserRegisteredV2 (different name)
```

---

## 7. Interview Questions

### Q1: When would you use Event Sourcing vs traditional CRUD?

```text
Answer:
"I'd use Event Sourcing when:

1. AUDIT TRAIL IS CRITICAL:
   - Financial systems (must track every change)
   - Compliance requirements (regulations like SOX, HIPAA)
   - Legal documents (contracts, agreements)

2. TEMPORAL QUERIES NEEDED:
   - 'What was state on date X?'
   - 'Show me history of changes'
   - Debugging complex state issues

3. COMPLEX DOMAIN:
   - Many business rules affecting state
   - Domain experts think in terms of events
   - DDD aggregates with rich behavior

4. INTEGRATION REQUIREMENTS:
   - Multiple systems need to react to changes
   - Event-driven architecture

I'd stick with traditional CRUD when:
- Simple CRUD operations
- No audit requirements
- Team unfamiliar with ES
- Reporting on current state (ES adds complexity)
- Small, simple domains

Event Sourcing adds complexity - only use when benefits justify it."
```

### Q2: Explain CQRS and its benefits

```text
Answer:
"CQRS separates the write model (commands) from the read model (queries).

Benefits:

1. OPTIMIZED MODELS:
   Write model: Domain-focused, enforces invariants
   Read model: Denormalized, optimized for specific queries
   
   Example: Complex order with 100 line items
   Write: Order aggregate, validates rules
   Read: Pre-computed summary with total, status

2. INDEPENDENT SCALING:
   Reads are often 100x more than writes
   Scale read replicas independently
   Different hardware/databases for each

3. TECHNOLOGY FLEXIBILITY:
   Write: PostgreSQL for ACID
   Read: Elasticsearch for search, Redis for speed
   
   Use best tool for each purpose

4. SIMPLER MODELS:
   Write model: Business logic only
   Read model: Data access only
   Each is simpler than combined model

Trade-offs:
- Added complexity
- Eventual consistency between models
- More infrastructure to manage
- Debugging across two models

Use when reads/writes have very different requirements."
```

### Q3: How do you handle eventual consistency in CQRS?

```text
Answer:
"Eventual consistency is inherent in CQRS. Here's how I handle it:

1. SET EXPECTATIONS:
   - UI shows 'Processing...' after writes
   - User understands slight delay
   - Design for asynchrony from the start

2. OPTIMISTIC UI:
   - After write, show expected result immediately
   - Update when projection confirms
   - Handle rare conflicts gracefully

3. READ-YOUR-WRITES PATTERN:
   - For creator, read from write model briefly
   - Others use read model
   - Short consistency window for owner

4. CORRELATION IDS:
   - Track command through to projection update
   - Can verify projection has processed specific command

5. SUBSCRIPTION CONFIRMATION:
   - Client subscribes to updates (WebSocket)
   - Server notifies when projection updated
   - Better UX than polling

6. ACCEPT AND DESIGN FOR IT:
   - Most business processes tolerate seconds of delay
   - Real-world isn't instant anyway
   - Compensating actions for edge cases"
```

### Q4: How would you implement Event Sourcing for an e-commerce order system?

```text
Answer:
"Here's my design for an event-sourced order system:

EVENTS:
- OrderCreated {orderId, customerId, items[]}
- ItemAdded {orderId, productId, quantity, price}
- ItemRemoved {orderId, productId}
- ShippingAddressSet {orderId, address}
- OrderPlaced {orderId, totalAmount}
- PaymentReceived {orderId, paymentId, amount}
- OrderShipped {orderId, trackingNumber}
- OrderDelivered {orderId, deliveredAt}

AGGREGATE: Order
- Enforces invariants (can't ship unpaid order)
- State rebuilt from events
- Snapshots every 50 events

READ MODELS:
1. OrderSummary - For order history page
2. ActiveOrders - For fulfillment dashboard  
3. CustomerOrders - For customer portal
4. ProductSalesStats - For analytics

IMPLEMENTATION:
- Event store: PostgreSQL with event table
- Projections: In separate service
- Messaging: Kafka for event distribution
- Snapshots: Stored alongside events

HANDLING CONCURRENCY:
- Optimistic locking with version numbers
- Retry on ConcurrencyException
- Aggregate is transaction boundary"
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│                EVENT SOURCING & CQRS CHEAT SHEET                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ EVENT SOURCING:                                                       │
│ ├── Store events (facts), not state                                   │
│ ├── Events are immutable                                              │
│ ├── Rebuild state by replaying events                                 │
│ ├── Snapshots for performance                                         │
│ └── Complete audit trail                                              │
│                                                                       │
│ EVENT STRUCTURE:                                                      │
│ ├── AggregateId, AggregateType                                        │
│ ├── EventType, Payload (JSON)                                         │
│ ├── Version (sequence number)                                         │
│ ├── Timestamp, Metadata                                               │
│ └── Correlation ID (for tracing)                                      │
│                                                                       │
│ AGGREGATE PATTERN:                                                    │
│ ├── Commands → validate → produce events                              │
│ ├── Events → apply → update state                                     │
│ ├── Pending events → save to store                                    │
│ └── Load: replay events (or snapshot + recent events)                 │
│                                                                       │
│ CQRS:                                                                 │
│ ├── Separate write (commands) from read (queries)                     │
│ ├── Write model: Domain logic, consistency                            │
│ ├── Read model: Projections, optimized for queries                    │
│ └── Eventually consistent between models                              │
│                                                                       │
│ PROJECTIONS:                                                          │
│ ├── Subscribe to events                                               │
│ ├── Build/update read models                                          │
│ ├── Can use different storage (ES, Redis, etc.)                       │
│ └── Rebuildable by replaying events                                   │
│                                                                       │
│ EVENT VERSIONING:                                                     │
│ ├── Store schema version with events                                  │
│ ├── Upcasters convert old → new format                                │
│ ├── Add fields, don't remove                                          │
│ └── Create new event types for breaking changes                       │
│                                                                       │
│ WHEN TO USE:                                                          │
│ ├── ES: Audit trail, temporal queries, complex domain                 │
│ ├── CQRS: Different read/write requirements, scale independently      │
│ └── Both: Often used together but independent                         │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Next:** [7. Distributed Clocks & Ordering →](./distributed-clocks)

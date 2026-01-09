const fs = require('fs');
const path = require('path');

const topics = [
    {
        dir: '01-java-jvm-internals',
        label: '1. JAVA & JVM INTERNALS',
        content: `
JVM MEMORY MODEL
- Heap
  - Young Gen (Eden, Survivor)
  - Old Gen
- Stack
- Metaspace
- Code Cache
- Minor GC vs Major GC
- Stop-The-World (STW) pauses

MEMORY LEAK PATTERNS
- Static references
- Growing collections
- Cache without eviction
- ThreadLocal leaks
- ClassLoader leaks

COMMON SYMPTOMS
- Old Gen growth
- Frequent Full GC
- Memory not reclaimed

FALSE SHARING
- CPU cache lines
- Cache contention
- Padding
- @Contended

JAVA MEMORY MODEL (JMM)
- Visibility vs Atomicity
- volatile
- synchronized
- Happens-before

JAVA CONCURRENCY
- CAS
- AtomicInteger
- AQS
- ReentrantLock
- Semaphore
- ForkJoinPool
- Parallel Streams`
    },
    {
        dir: '02-dbms-data-persistence',
        label: '2. DBMS & DATA PERSISTENCE',
        content: `
INDEX TRADE-OFFS
- Write penalty
- Composite index order
- Index-only scans
- SELECT * anti-pattern

QUERY EXECUTION
- Cost-based optimizer
- EXPLAIN
- EXPLAIN ANALYZE

TRANSACTIONS
- ACID
- Isolation levels
- MVCC

LOCKING
- Row vs table locks
- Optimistic vs pessimistic
- Deadlocks
- Gap locks

PAGINATION
- OFFSET pagination
- Cursor-based pagination

CONNECTION POOLING
- HikariCP
- Pool sizing impact`
    },
    {
        dir: '03-spring-boot-internals',
        label: '3. SPRING BOOT INTERNALS',
        content: `
IOC CONTAINER
- BeanFactory vs ApplicationContext
- Bean lifecycle
- BeanPostProcessors

BEAN SCOPE & CONCURRENCY
- Singleton beans
- Stateless services

PROXY MECHANISM
- JDK Proxy
- CGLIB

TRANSACTIONS
- @Transactional pitfalls
- Self-invocation
- Rollback rules

ASYNC
- @Async
- Thread pool exhaustion
- Context loss

SERVLET MODEL
- Thread-per-request
- Blocking vs non-blocking`
    },
    {
        dir: '04-operating-systems',
        label: '4. OPERATING SYSTEMS',
        content: `
PROCESS & THREADS
- Context switching
- Scheduling cost

CPU VS IO
- CPU-bound
- IO-bound
- Thread pool sizing

MEMORY
- Virtual memory
- Paging
- Swapping
- OOM Killer

LINUX BASICS
- File descriptors
- ulimit
- top, htop

SYSTEM CALLS
- User vs Kernel mode`
    },
    {
        dir: '05-computer-networks',
        label: '5. COMPUTER NETWORKS',
        content: `
TCP VS UDP
- Reliability
- Ordering

TCP DETAILS
- Handshake
- Congestion control

HTTP VERSIONS
- HTTP/1.1
- HTTP/2
- HTTP/3 (QUIC)

RETRIES & TIMEOUTS
- Cascading failures
- Idempotency keys

MODERN PROTOCOLS
- gRPC
- WebSockets

TLS
- Handshake
- Certificates`
    },
    {
        dir: '06-security-authentication',
        label: '6. SECURITY & AUTHENTICATION',
        content: `
JWT
- Structure
- Risks

TOKEN MANAGEMENT
- Access tokens
- Refresh tokens
- Rotation

OAUTH / OIDC
- Roles
- Flow

DEFENSE IN DEPTH
- App layer
- Gateway layer
- DB layer

COMMON ATTACKS
- SQL Injection
- XSS
- CSRF`
    },
    {
        dir: '07-cross-cutting-topics',
        label: '7. CROSS-CUTTING TOPICS',
        content: `
OBSERVABILITY
- Logs
- Metrics
- Traces
- Correlation IDs

FAILURE PATTERNS
- Cascading failures
- Thundering herd
- Backpressure

IDEMPOTENCY
- APIs
- Payments
- Messaging`
    },
    {
        dir: '08-distributed-systems',
        label: '8. DISTRIBUTED SYSTEMS',
        content: `
CAP THEOREM
- Consistency
- Availability
- Partition tolerance
- Real-world trade-offs

CONSISTENCY MODELS
- Strong consistency
- Eventual consistency
- Causal consistency
- Read-your-writes

DISTRIBUTED CONSENSUS
- Leader election
- Paxos (conceptual)
- Raft
- Quorum systems

REPLICATION
- Master-slave
- Master-master
- Sync vs async
- Replication lag
- Read replicas

PARTITIONING / SHARDING
- Horizontal vs vertical
- Consistent hashing
- Hot partitions
- Resharding challenges

DISTRIBUTED TRANSACTIONS
- Two-Phase Commit (2PC)
- Saga pattern
- Compensation transactions
- Why distributed TX are avoided

CLOCKS
- Lamport timestamps
- Vector clocks
- Logical clocks
- System clock unreliability

FAILURE MODES
- Split brain
- Network partitions
- Byzantine failures
- Partial failures`
    },
    {
        dir: '09-caching',
        label: '9. CACHING',
        content: `
CACHE STRATEGIES
- Cache-aside
- Read-through
- Write-through
- Write-behind
- Refresh-ahead

CACHE INVALIDATION
- TTL
- Event-based
- Manual purge

EVICTION POLICIES
- LRU
- LFU
- FIFO
- Random

DISTRIBUTED CACHING
- Redis
- Memcached
- Cache warming
- Cache stampede
- Thundering herd

MULTI-LEVEL CACHING
- L1 (App cache)
- L2 (Redis)
- CDN
- Browser cache`
    },
    {
        dir: '10-message-queues',
        label: '10. MESSAGE QUEUES',
        content: `
MESSAGE QUEUES
- Kafka
- RabbitMQ
- SQS / SNS

KAFKA DETAILS
- Topics
- Partitions
- Consumer groups
- Offsets
- Replication factor
- ISR
- Delivery semantics

MESSAGING PATTERNS
- Pub-Sub
- Point-to-Point
- Request-Reply
- Dead Letter Queue

BACKPRESSURE
- Producer throttling
- Consumer lag
- Circuit breakers`
    },
    {
        dir: '11-microservices-architecture',
        label: '11. MICROSERVICES ARCHITECTURE',
        content: `
SERVICE COMMUNICATION
- REST
- gRPC
- Messaging

SERVICE DISCOVERY
- Client-side
- Server-side
- DNS-based

API GATEWAY
- Routing
- Auth
- Rate limiting
- Aggregation

RESILIENCE
- Circuit breaker
- Bulkhead
- Retry + backoff
- Timeouts
- Fallbacks

DEPLOYMENT
- Blue-Green
- Canary
- Rolling updates
- Feature flags

DATA MANAGEMENT
- Database per service
- Shared DB anti-pattern
- API composition
- CQRS
- Event sourcing`
    },
    {
        dir: '12-api-design',
        label: '12. API DESIGN',
        content: `
REST BEST PRACTICES
- Resource naming
- HTTP methods
- Status codes
- Pagination
- Filtering
- Versioning

API CONTRACTS
- OpenAPI / Swagger
- Backward compatibility
- Deprecation

GRAPHQL (BONUS)
- REST vs GraphQL
- N+1 problem
- Use cases`
    },
    {
        dir: '13-testing',
        label: '13. TESTING',
        content: `
TESTING PYRAMID
- Unit tests
- Integration tests
- E2E tests

TEST DOUBLES
- Mocks
- Stubs
- Fakes

INTEGRATION TESTING
- TestContainers
- Embedded DB
- WireMock

LOAD TESTING
- JMeter
- Bottleneck identification`
    },
    {
        dir: '14-cicd-devops',
        label: '14. CI/CD & DEVOPS',
        content: `
CI/CD PIPELINE
- Build
- Test
- Deploy
- Jenkins
- GitHub Actions
- GitLab CI

CONTAINERIZATION
- Docker
- Containers vs VM
- Image layers
- Docker Compose

ORCHESTRATION
- Kubernetes basics
- Pods
- Services
- Deployments
- Auto-scaling

MONITORING
- Prometheus
- Grafana
- Metrics
- Alerts
- SLA / SLO / SLI
- Error budgets`
    },
    {
        dir: '15-java-features',
        label: '15. JAVA 8+ FEATURES',
        content: `
STREAMS API
- filter
- map
- reduce
- Collectors
- Parallel streams

LAMBDA EXPRESSIONS
- Functional interfaces
- Method references

OPTIONAL
- Avoid null checks
- Best practices

COMPLETABLEFUTURE
- Async execution
- Combining futures
- Exception handling

JAVA 11+
- var
- HTTP Client
- String utilities

JAVA 17+
- Records
- Sealed classes
- Pattern matching`
    },
    {
        dir: '16-lld',
        label: 'PART A — LOW LEVEL DESIGN (LLD)',
        content: `
OOP
- Encapsulation
- Inheritance
- Polymorphism
- Composition > Inheritance

SOLID
- SRP
- OCP
- LSP
- ISP
- DIP

DESIGN PATTERNS
- Strategy (MOST IMPORTANT)
- Factory
- Singleton
- Observer
- Builder
- Decorator

SPRING MAPPING
- Singleton → Spring Beans
- Factory → ApplicationContext
- Strategy → @Qualifier
- Observer → Events
- Proxy → @Transactional

LLD INTERVIEW FLOW
1. Clarify requirements
2. Core objects
3. Relationships
4. Interfaces
5. Code

LLD PRACTICE
- Parking Lot
- Elevator
- LRU Cache
- BookMyShow
- Splitwise
- Snake & Ladder`
    },
    {
        dir: '17-hld',
        label: 'PART B — HIGH LEVEL DESIGN (HLD)',
        content: `
SYSTEM THINKING
- Scale
- Read/write ratio
- Latency

BACK-OF-ENVELOPE
- 100:1 reads:writes
- int = 4 bytes
- char = 2 bytes
- L1 = 1ns
- RAM = 100ns
- SSD = 1ms
- HDD = 10ms

STANDARD ARCHITECTURE
- Client
- Load Balancer
- API Servers
- Cache
- Database
- Async Workers

DATABASE CHOICE
- SQL vs NoSQL

CORE COMPONENTS
- Load Balancer
- Cache
- DB
- Message Queue
- CDN
- Rate Limiting
- Auth

DESIGN PATTERNS
- Microservices
- Event-driven
- CQRS
- Sharding
- Idempotency
- Retries
- Circuit Breakers

HLD PRACTICE
- URL Shortener
- Rate Limiter
- Notification System
- File Storage
- News Feed
- Chat System`
    }
];

const docsDir = path.join(__dirname, 'docs');

topics.forEach(topic => {
    const dirPath = path.join(docsDir, topic.dir);

    // 1. Create directory if not exists
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${topic.dir}`);
    }

    // 2. Create _category_.json (Always overwrite to ensure correct label/order)
    const categoryContent = {
        label: topic.label,
        position: parseInt(topic.label.match(/\d+|PART [AB]/)?.[0] || 0),
        collapsible: true,
        collapsed: true,
        link: {
            type: 'generated-index',
            description: `Complete guide to ${topic.label}`
        }
    };

    // Special handling for LLD/HLD sorting positions if regex fails or needs adjustment
    if (topic.dir.includes('lld')) categoryContent.position = 16;
    if (topic.dir.includes('hld')) categoryContent.position = 17;

    fs.writeFileSync(path.join(dirPath, '_category_.json'), JSON.stringify(categoryContent, null, 2));

    // 3. Create syllabus file (01-intro.md)
    // We overwrite this file to ensure the syllabus is up to date with the user's latest structure.
    const syllabusContent = `---
sidebar_position: 1
title: Syllabus & Overview
---

# ${topic.label}

## Topics Covered

\`\`\`text
${topic.content.trim()}
\`\`\`

### Status
🚧 Content Map Created - Implementation In Progress
`;

    const introPath = path.join(dirPath, '01-intro.md');

    // Check if other files exist (besides intro and category)
    // If explicit content exists, we might want to be careful, but the user requested this structure.
    // We will update 01-intro.md. 
    fs.writeFileSync(introPath, syllabusContent);
    console.log(`Updated syllabus for: ${topic.label}`);
});

console.log('Documentation structure and syllabus updated successfully!');

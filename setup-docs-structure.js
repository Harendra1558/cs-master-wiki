const fs = require('fs');
const path = require('path');

const topics = [
    {
        dir: '01-java-jvm-internals', label: '1. JAVA & JVM INTERNALS', content: `
JVM MEMORY MODEL
- Heap (Young Gen, Old Gen)
- Stack, Metaspace, Code Cache
- GC (Minor vs Major, STW)

MEMORY LEAK PATTERNS
- Static references, ThreadLocal leaks
- Growing collections

FALSE SHARING
- CPU cache lines, @Contended

JAVA MEMORY MODEL (JMM)
- Visibility vs Atomicity
- volatile, synchronized, happens-before

JAVA CONCURRENCY
- CAS, AtomicInteger, AQS
- ReentrantLock, Semaphore
- ForkJoinPool, Parallel Streams` },

    {
        dir: '02-dbms-data-persistence', label: '2. DBMS & DATA PERSISTENCE', content: `
INDEX TRADE-OFFS
- Write penalty, Composite index order
- Index-only scans, SELECT * anti-pattern

QUERY EXECUTION
- Cost-based optimizer, EXPLAIN

TRANSACTIONS
- ACID, Isolation levels, MVCC

LOCKING
- Row vs table locks
- Optimistic vs pessimistic
- Deadlocks, Gap locks

PAGINATION & CONNECTION POOLING
- Offset vs Cursor pagination
- HikariCP tuning` },

    {
        dir: '03-spring-boot-internals', label: '3. SPRING BOOT INTERNALS', content: `
IOC CONTAINER
- BeanFactory vs ApplicationContext
- Bean lifecycle, BeanPostProcessors

BEAN SCOPE & CONCURRENCY
- Singleton beans, Stateless services

PROXY MECHANISM
- JDK Proxy vs CGLIB

TRANSACTIONS
- @Transactional pitfalls, Self-invocation

ASYNC & SERVLET MODEL
- @Async, Thread per request` },

    {
        dir: '04-operating-systems', label: '4. OPERATING SYSTEMS', content: `
PROCESS & THREADS
- Context switching, Scheduling

CPU VS IO
- Thread pool sizing

MEMORY
- Virtual memory, Paging, Swapping

LINUX BASICS
- File descriptors, ulimit, top/htop` },

    {
        dir: '05-computer-networks', label: '5. COMPUTER NETWORKS', content: `
TCP VS UDP
- Reliability, Flow control

HTTP VERSIONS
- HTTP/1.1, HTTP/2, HTTP/3 (QUIC)

MODERN PROTOCOLS
- gRPC, WebSockets

RETRIES & TLS
- Idempotency, SSL Handshake` },

    {
        dir: '06-security-authentication', label: '6. SECURITY & AUTHENTICATION', content: `
JWT & OAUTH
- Access/Refresh tokens, Rotation
- OIDC, RBAC

DEFENSE IN DEPTH
- App/Gateway/DB layers

COMMON ATTACKS
- SQLi, XSS, CSRF` },

    {
        dir: '07-cross-cutting-topics', label: '7. CROSS-CUTTING TOPICS', content: `
OBSERVABILITY
- Logs, Metrics, Traces, Correlation IDs

FAILURE PATTERNS
- Cascading failures, Thundering herd

IDEMPOTENCY
- API design, Payments` },

    {
        dir: '08-distributed-systems', label: '8. DISTRIBUTED SYSTEMS', content: `
CAP THEOREM & CONSISTENCY
- Strong vs Eventual consistency

DISTRIBUTED CONSENSUS
- Paxos, Raft, Quorum

REPLICATION & SHARDING
- Master-slave, Consistent hashing
- Hot partitions

DISTRIBUTED TRANSACTIONS
- 2PC, Saga pattern

CLOCKS & FAILURES
- Vector clocks, Split brain` },

    {
        dir: '09-caching', label: '9. CACHING', content: `
STRATEGIES
- Cache-aside, Read-through, Write-behind

INVALIDATION & EVICTION
- TTL, LRU, LFU

DISTRIBUTED CACHING
- Redis, Memcached
- Cache stampede` },

    {
        dir: '10-message-queues', label: '10. MESSAGE QUEUES', content: `
KAFKA DETAILS
- Topics, Partitions, Consumer groups
- Offsets, ISR

PATTERNS
- Pub-Sub, Dead Letter Queue

BACKPRESSURE
- Circuit breakers, Throttling` },

    {
        dir: '11-microservices-architecture', label: '11. MICROSERVICES ARCHITECTURE', content: `
COMMUNICATION
- REST, gRPC, Messaging

SERVICE DISCOVERY & GATEWAY
- Client/Server side discovery
- Rate limiting, Aggregation

RESILIENCE
- Circuit breaker, Bulkhead, Retry
- Blue-Green/Canary deployment

DATA MANAGEMENT
- Database per service, CQRS, Sagas` },

    {
        dir: '12-api-design', label: '12. API DESIGN', content: `
REST BEST PRACTICES
- Resources, Verbs, Status codes
- Versioning

CONTRACTS
- OpenAPI/Swagger

GRAPHQL
- N+1 problem, Schema stitching` },

    {
        dir: '13-testing', label: '13. TESTING', content: `
TESTING PYRAMID
- Unit, Integration, E2E

INTEGRATION TESTING
- TestContainers, WireMock

LOAD TESTING
- JMeter, Gatling` },

    {
        dir: '14-cicd-devops', label: '14. CI/CD & DEVOPS', content: `
PIPELINES
- Jenkins, GitHub Actions

CONTAINERIZATION
- Docker, Layers, Compose

KUBERNETES BASICS
- Pods, Services, Deployments
- Auto-scaling

MONITORING
- Prometheus, Grafana, alerts` },

    {
        dir: '15-java-features', label: '15. JAVA 8+ FEATURES', content: `
STREAMS & LAMBDAS
- Functional interfaces, Collectors

MODERN JAVA
- Optionals, CompletableFuture
- Records (Java 17), Pattern matching` },

    {
        dir: '16-lld', label: 'PART A — LOW LEVEL DESIGN (LLD)', content: `
OOP & SOLID
- Encapsulation, Polymorphism
- SRP, OCP, LSP, ISP, DIP

DESIGN PATTERNS
- Strategy, Factory, Singleton
- Observer, Builder, Decorator

PRACTICE PROBLEMS
- Parking Lot, Elevator, LRU Cache
- Splitwise` },

    {
        dir: '17-hld', label: 'PART B — HIGH LEVEL DESIGN (HLD)', content: `
SYSTEM THINKING
- Back-of-envelope calculations
- Scale estimation

ARCHITECTURE COMPONENTS
- LB, Cache, DB, MQ, CDN

DESIGN PATTERNS
- Sharding, Consistent Hashing
- Rate Limiting

PRACTICE PROBLEMS
- URL Shortener, News Feed, Chat System` }
];

const docsDir = path.join(__dirname, 'docs');

topics.forEach(topic => {
    const dirPath = path.join(docsDir, topic.dir);

    // Create directory if not exists
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    // Create _category_.json
    const categoryContent = {
        label: topic.label,
        position: parseInt(topic.label.match(/\d+|PART [AB]/)?.[0] || 0), // Try to Sort
        collapsible: true,
        collapsed: true,
        link: {
            type: 'generated-index',
            description: `Complete guide to ${topic.label}`
        }
    };

    // Special handling for LLD/HLD sorting
    if (topic.dir.includes('lld')) categoryContent.position = 16;
    if (topic.dir.includes('hld')) categoryContent.position = 17;
    // Others use the number in the label (1-15)

    fs.writeFileSync(path.join(dirPath, '_category_.json'), JSON.stringify(categoryContent, null, 2));

    // Create syllabus file
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

    // Only create if empty to avoid overwriting existing good content
    const files = fs.readdirSync(dirPath);
    const hasContent = files.some(f => f.endsWith('.md') || f.endsWith('.mdx'));

    if (!hasContent) {
        fs.writeFileSync(path.join(dirPath, '01-intro.md'), syllabusContent);
    } else {
        // If content exists, maybe verify _category_.json is good
        console.log(`Skipping content creation for ${topic.dir} as it already has files.`);
    }
});

console.log('Documentation structure updated successfully!');

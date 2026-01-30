---
title: 3. Service Mesh & Observability
sidebar_position: 3
description: Master service mesh, distributed tracing, and observability patterns for microservices interviews.
keywords: [service mesh, istio, envoy, distributed tracing, jaeger, prometheus, observability]
---

# Service Mesh & Observability

:::info Production Essential
Service mesh and observability are **must-know topics** for senior roles. You'll be asked how to debug issues across 100+ microservices in production.
:::

## 1. Service Mesh

### What is a Service Mesh?

```text
┌─────────────────────────────────────────────────────────────────────┐
│                       SERVICE MESH ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   WITHOUT Service Mesh:             WITH Service Mesh:              │
│                                                                      │
│   ┌─────────┐                       ┌─────────┐                     │
│   │ Service │                       │ Service │                     │
│   │    A    │───────┐               │    A    │                     │
│   │(handles │       │               │(business│                     │
│   │ network,│       │               │ logic   │                     │
│   │ retry,  │       │               │ only)   │                     │
│   │ circuit │       │               └────┬────┘                     │
│   │ breaker)│       │                    │                          │
│   └─────────┘       │               ┌────┴────┐                     │
│        │            │               │ Sidecar │ ◄── Handles all    │
│        ▼            ▼               │ (Envoy) │     networking      │
│   ┌─────────┐  ┌─────────┐          └────┬────┘                     │
│   │ Service │  │ Service │               │                          │
│   │    B    │  │    C    │               ▼                          │
│   └─────────┘  └─────────┘          ┌────────┐                      │
│                                     │ Sidecar│                      │
│                                     └────┬───┘                      │
│                                          │                          │
│                                     ┌────┴────┐                     │
│                                     │ Service │                     │
│                                     │    B    │                     │
│                                     └─────────┘                     │
│                                                                      │
│   Service mesh handles: mTLS, retries, timeouts, circuit breaker,   │
│   load balancing, traffic management, observability                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Istio Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         ISTIO ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   CONTROL PLANE (istiod)                                            │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  ┌─────────┐  ┌─────────┐  ┌─────────┐                      │   │
│   │  │  Pilot  │  │ Citadel │  │ Galley  │                      │   │
│   │  │(config) │  │(certs)  │  │(valid.) │                      │   │
│   │  └─────────┘  └─────────┘  └─────────┘                      │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                    Configuration push                                │
│                              │                                       │
│                              ▼                                       │
│   DATA PLANE (Envoy sidecars)                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  ┌─────────────────┐    ┌─────────────────┐                 │   │
│   │  │   Pod A         │    │   Pod B         │                 │   │
│   │  │ ┌─────┐ ┌─────┐ │    │ ┌─────┐ ┌─────┐ │                 │   │
│   │  │ │ App │ │Envoy│ │◄──►│ │Envoy│ │ App │ │                 │   │
│   │  │ └─────┘ └─────┘ │    │ └─────┘ └─────┘ │                 │   │
│   │  └─────────────────┘    └─────────────────┘                 │   │
│   │                                                              │   │
│   │  All traffic flows through Envoy sidecars                   │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Traffic Management

```yaml
# VirtualService - Routing rules
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-service
spec:
  hosts:
    - user-service
  http:
    # Canary: 10% traffic to v2
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: user-service
            subset: v2
    
    # A/B testing: Route by header
    - match:
        - headers:
            x-user-group:
              exact: "beta"
      route:
        - destination:
            host: user-service
            subset: v2
    
    # Default: 90% v1, 10% v2
    - route:
        - destination:
            host: user-service
            subset: v1
          weight: 90
        - destination:
            host: user-service
            subset: v2
          weight: 10

---
# DestinationRule - Define subsets
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: user-service
spec:
  host: user-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: UPGRADE
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    circuitBreaker:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

### Resilience with Istio

```yaml
# Retry policy
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service
spec:
  hosts:
    - payment-service
  http:
    - route:
        - destination:
            host: payment-service
      timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 3s
        retryOn: 5xx,reset,connect-failure,retriable-4xx

---
# Circuit Breaker
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
spec:
  host: payment-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5      # Open after 5 errors
      interval: 10s                # Check every 10 seconds
      baseEjectionTime: 30s        # Eject for 30 seconds
      maxEjectionPercent: 50       # Max 50% of pods ejected
```

### mTLS (Mutual TLS)

```yaml
# Enable strict mTLS for entire mesh
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT

---
# Service-to-service authorization
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: order-service-policy
spec:
  selector:
    matchLabels:
      app: order-service
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/default/sa/api-gateway"
              - "cluster.local/ns/default/sa/admin-service"
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/orders/*"]
```

---

## 2. Distributed Tracing

### Why Distributed Tracing?

```text
Problem: Request fails. Which of 50 services caused it?

Without tracing:
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Gateway │────►│ Order   │────►│ Payment │────►│ Fraud   │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
     │              │               │               │
     │         Where did it fail?  Was it slow?     │
     │              │               │               │
     └──────────────┴───────────────┴───────────────┘
                         ????

With tracing (same trace ID across all):
┌─────────────────────────────────────────────────────────────────────┐
│ Trace ID: abc123                                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Gateway    ██████████████████████████████████████████████  500ms   │
│ └─ Order      ████████████████████████████████████        400ms   │
│    └─ Payment    ████████████████████████████             350ms   │
│       └─ Fraud      ██████████████████████████████        300ms ❌ │
│                           ← Slow DB query here!                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### OpenTelemetry Setup (Spring Boot)

```xml
<!-- pom.xml -->
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-api</artifactId>
</dependency>
<dependency>
    <groupId>io.opentelemetry.instrumentation</groupId>
    <artifactId>opentelemetry-spring-boot-starter</artifactId>
</dependency>
```

```yaml
# application.yml
otel:
  exporter:
    otlp:
      endpoint: http://jaeger:4317
  resource:
    attributes:
      service.name: order-service
      service.version: 1.0.0
      deployment.environment: production
```

```java
// Manual span creation for custom operations
@Service
public class PaymentService {
    
    @Autowired
    private Tracer tracer;
    
    public PaymentResult processPayment(Payment payment) {
        Span span = tracer.spanBuilder("process-payment")
            .setAttribute("payment.id", payment.getId().toString())
            .setAttribute("payment.amount", payment.getAmount().doubleValue())
            .startSpan();
        
        try (Scope scope = span.makeCurrent()) {
            // Validate payment
            Span validateSpan = tracer.spanBuilder("validate-payment")
                .startSpan();
            try {
                validatePayment(payment);
            } finally {
                validateSpan.end();
            }
            
            // Call external gateway
            Span gatewaySpan = tracer.spanBuilder("call-payment-gateway")
                .setAttribute("gateway.name", "stripe")
                .startSpan();
            try {
                return gateway.charge(payment);
            } catch (Exception e) {
                gatewaySpan.setStatus(StatusCode.ERROR, e.getMessage());
                gatewaySpan.recordException(e);
                throw e;
            } finally {
                gatewaySpan.end();
            }
            
        } finally {
            span.end();
        }
    }
}
```

### Spring Cloud Sleuth (Legacy but Common)

```java
// Automatic trace propagation with Sleuth
@RestController
public class OrderController {
    
    private static final Logger log = LoggerFactory.getLogger(OrderController.class);
    
    @Autowired
    private UserClient userClient;
    
    @GetMapping("/orders/{id}")
    public Order getOrder(@PathVariable Long id) {
        // Trace ID automatically in logs
        log.info("Getting order: {}", id);
        
        Order order = orderRepository.findById(id);
        
        // Trace ID automatically propagated to user-service
        User user = userClient.getUser(order.getUserId());
        
        return order.withUser(user);
    }
}

// Log output with trace ID:
// 2024-01-15 10:30:00 [order-service,abc123,def456] INFO Getting order: 42
//                      ^service    ^traceId ^spanId
```

### Correlation ID Pattern

```java
// Filter to ensure correlation ID exists
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {
    
    public static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        
        String correlationId = request.getHeader(CORRELATION_ID_HEADER);
        if (correlationId == null) {
            correlationId = UUID.randomUUID().toString();
        }
        
        // Add to MDC for logging
        MDC.put("correlationId", correlationId);
        
        // Add to response
        response.setHeader(CORRELATION_ID_HEADER, correlationId);
        
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove("correlationId");
        }
    }
}

// Propagate to downstream services
@Configuration
public class FeignConfig {
    
    @Bean
    public RequestInterceptor correlationIdInterceptor() {
        return template -> {
            String correlationId = MDC.get("correlationId");
            if (correlationId != null) {
                template.header("X-Correlation-ID", correlationId);
            }
        };
    }
}

// Logback configuration for correlation ID
// logback-spring.xml
<pattern>%d{yyyy-MM-dd HH:mm:ss} [%X{correlationId}] %-5level %logger{36} - %msg%n</pattern>
```

---

## 3. Metrics & Monitoring

### Prometheus + Grafana Setup

```java
// Spring Boot Actuator + Micrometer
@Configuration
public class MetricsConfig {
    
    @Bean
    MeterRegistryCustomizer<MeterRegistry> metricsCommonTags() {
        return registry -> registry.config()
            .commonTags("application", "order-service")
            .commonTags("environment", "production");
    }
}

// Custom business metrics
@Service
public class OrderService {
    
    private final Counter orderCounter;
    private final Timer orderProcessingTimer;
    private final AtomicInteger activeOrders;
    
    public OrderService(MeterRegistry registry) {
        this.orderCounter = Counter.builder("orders.created")
            .description("Total orders created")
            .tag("type", "all")
            .register(registry);
        
        this.orderProcessingTimer = Timer.builder("orders.processing.time")
            .description("Time to process orders")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry);
        
        this.activeOrders = registry.gauge("orders.active",
            new AtomicInteger(0));
    }
    
    public Order createOrder(CreateOrderRequest request) {
        activeOrders.incrementAndGet();
        
        return orderProcessingTimer.record(() -> {
            try {
                Order order = processOrder(request);
                orderCounter.increment();
                return order;
            } finally {
                activeOrders.decrementAndGet();
            }
        });
    }
}
```

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'spring-boot-apps'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets:
          - 'order-service:8080'
          - 'user-service:8080'
          - 'payment-service:8080'
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
```

### Key Metrics to Monitor

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    THE FOUR GOLDEN SIGNALS                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. LATENCY                                                          │
│     ├── http_request_duration_seconds (p50, p95, p99)               │
│     └── Alert if p99 > 500ms                                        │
│                                                                      │
│  2. TRAFFIC                                                          │
│     ├── http_requests_total (rate)                                  │
│     └── requests_per_second by endpoint                             │
│                                                                      │
│  3. ERRORS                                                           │
│     ├── http_requests_total{status=~"5.."}                          │
│     └── Error rate = errors / total requests                        │
│     └── Alert if error_rate > 1%                                    │
│                                                                      │
│  4. SATURATION                                                       │
│     ├── jvm_memory_used_bytes / jvm_memory_max_bytes                │
│     ├── hikaricp_connections_active / hikaricp_connections_max      │
│     └── Alert if > 80% saturated                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Alerting Rules

```yaml
# Prometheus alerting rules
groups:
  - name: microservices
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          / sum(rate(http_requests_total[5m])) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"
      
      - alert: SlowResponses
        expr: |
          histogram_quantile(0.99, 
            rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow response times"
          description: "p99 latency is {{ $value }}s"
      
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.job }} is not responding"
```

---

## 4. Health Checks

### Spring Boot Actuator

```java
// Custom health indicator
@Component
public class PaymentGatewayHealthIndicator implements HealthIndicator {
    
    @Autowired
    private PaymentGateway gateway;
    
    @Override
    public Health health() {
        try {
            boolean isHealthy = gateway.ping();
            if (isHealthy) {
                return Health.up()
                    .withDetail("gateway", "reachable")
                    .withDetail("latency_ms", gateway.getLatency())
                    .build();
            } else {
                return Health.down()
                    .withDetail("gateway", "unreachable")
                    .build();
            }
        } catch (Exception e) {
            return Health.down()
                .withException(e)
                .build();
        }
    }
}
```

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,prometheus,info
  endpoint:
    health:
      show-details: always
      probes:
        enabled: true
  health:
    livenessState:
      enabled: true
    readinessState:
      enabled: true
```

### Kubernetes Probes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    spec:
      containers:
        - name: order-service
          image: order-service:latest
          ports:
            - containerPort: 8080
          
          # Liveness: Is the app running?
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3
          
          # Readiness: Can it accept traffic?
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 3
          
          # Startup: For slow-starting apps
          startupProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 0
            periodSeconds: 10
            failureThreshold: 30  # 30 * 10s = 5 minutes to start
```

---

## 5. Interview Questions

### Q1: How do you debug a slow request across microservices?

```text
Answer:
"I use distributed tracing with Jaeger or Zipkin:

1. FIND THE TRACE:
   - Search by trace ID (from logs or response header)
   - Or search by service + time range + high latency

2. ANALYZE THE WATERFALL:
   - See all spans in the request
   - Identify which service/operation is slow
   - Check span-level attributes (DB query, external call)

3. DRILL DOWN:
   - If DB query slow → Check query explain plan
   - If external call slow → Check that service's traces
   - If CPU-bound → Check profiler data

4. CORRELATE WITH METRICS:
   - Check if issue is isolated or widespread
   - Look at p99 latency trends
   - Check error rates around same time

Example: Found that Fraud-Check service was calling
ML model synchronously. Moved to async with cache
for repeat customers. Latency dropped 80%."
```

### Q2: What is a service mesh and when would you use it?

```text
Answer:
"A service mesh is an infrastructure layer that handles
service-to-service communication through sidecar proxies.

COMPONENTS:
- Data plane: Envoy sidecars next to each service
- Control plane: Istio/Linkerd managing configuration

WHAT IT HANDLES:
├── mTLS between services (zero-trust security)
├── traffic management (canary, A/B testing)
├── circuit breakers and retries
├── observability (traces, metrics)
└── rate limiting

WHEN TO USE:
├── 20+ microservices
├── Need zero-trust security (mTLS everywhere)
├── Complex traffic routing (canary releases)
├── Polyglot services (mesh is language-agnostic)
└── Centralized observability needed

WHEN NOT TO USE:
├── Few services (overhead not justified)
├── Team unfamiliar with Kubernetes
├── Simple networking requirements
└── Performance-critical (sidecar adds ~1ms latency)"
```

### Q3: How do you ensure observability in microservices?

```text
Answer:
"I implement the three pillars of observability:

1. LOGGING (What happened):
   - Structured JSON logs
   - Correlation IDs in every log
   - Centralized in ELK or Loki
   - Log levels: ERROR for alerts, INFO for flow

2. METRICS (How is it performing):
   - Four Golden Signals: latency, traffic, errors, saturation
   - Business metrics: orders/minute, conversion rate
   - Prometheus + Grafana dashboards
   - Alerting on SLO violations

3. TRACING (Where did time go):
   - OpenTelemetry or Jaeger
   - Auto-instrumentation for HTTP, DB, messaging
   - Manual spans for business operations
   - Sample rate: 100% for errors, 1% for success

INTEGRATION:
- Link traces to logs via correlation ID
- Link metrics to traces via exemplars
- Single pane of glass in Grafana"
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│              SERVICE MESH & OBSERVABILITY CHEAT SHEET                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ SERVICE MESH (Istio):                                                 │
│   Sidecar (Envoy)      Handles all networking                        │
│   Control Plane        Pushes config to sidecars                     │
│   mTLS                 Automatic encryption                          │
│   Traffic Management   Canary, A/B testing                          │
│   Circuit Breaker      outlierDetection in DestinationRule          │
│                                                                       │
│ DISTRIBUTED TRACING:                                                  │
│   Trace ID             Unique ID for entire request flow            │
│   Span ID              Single operation within trace                │
│   Propagation          Pass trace context in headers                │
│   Jaeger/Zipkin        Visualization and analysis                   │
│                                                                       │
│ FOUR GOLDEN SIGNALS:                                                  │
│   Latency              p50, p95, p99 response times                 │
│   Traffic              Requests per second                          │
│   Errors               Error rate (5xx / total)                     │
│   Saturation           Resource usage (memory, connections)         │
│                                                                       │
│ HEALTH CHECKS (Kubernetes):                                           │
│   Liveness             Is app running? Restart if not               │
│   Readiness            Can accept traffic? Remove from LB           │
│   Startup              For slow-starting apps                       │
│                                                                       │
│ CORRELATION ID:                                                       │
│   Generate at edge gateway                                           │
│   Propagate via X-Correlation-ID header                             │
│   Include in all logs via MDC                                        │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Next:** [4. Deployment Strategies →](./deployment-strategies)

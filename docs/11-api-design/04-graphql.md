---
title: 4. GraphQL
sidebar_position: 4
description: Master GraphQL - queries, mutations, N+1 problem, DataLoader, and when to use GraphQL vs REST for interviews.
keywords: [graphql, rest vs graphql, n+1 problem, dataloader, api design, schema]
---

# GraphQL

:::info Interview Importance ⭐⭐⭐
GraphQL questions are increasingly common, especially for companies with mobile apps or complex data relationships. Understanding when to use GraphQL vs REST is key.
:::

## 1. What is GraphQL?

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    GRAPHQL OVERVIEW                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ GraphQL is a QUERY LANGUAGE for APIs and a RUNTIME for executing   │
│ those queries. Developed by Facebook, open-sourced in 2015.        │
│                                                                      │
│ Key Concepts:                                                        │
│ ├── Single endpoint (typically /graphql)                           │
│ ├── Client specifies exactly what data it needs                    │
│ ├── Strongly typed schema                                          │
│ ├── No over-fetching or under-fetching                             │
│ └── Introspection (self-documenting)                               │
│                                                                      │
│   REST:                            GraphQL:                          │
│   GET /users/123                   query {                          │
│   GET /users/123/posts               user(id: 123) {                │
│   GET /users/123/friends               name                         │
│   (3 requests!)                        posts { title }              │
│                                        friends { name }              │
│                                      }                               │
│                                    }                                 │
│                                    (1 request!)                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. GraphQL Operations

### Schema Definition Language (SDL)

```graphql
# Type definitions
type User {
  id: ID!              # Non-nullable ID
  name: String!        # Non-nullable String
  email: String!
  bio: String          # Nullable String
  posts: [Post!]!      # Non-nullable list of non-nullable Posts
  friends: [User!]!
  createdAt: DateTime!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
  comments: [Comment!]!
  published: Boolean!
  createdAt: DateTime!
}

type Comment {
  id: ID!
  text: String!
  author: User!
  post: Post!
}

# Input types for mutations
input CreateUserInput {
  name: String!
  email: String!
  password: String!
}

input CreatePostInput {
  title: String!
  content: String!
  published: Boolean = false
}

# Custom scalar
scalar DateTime

# Enum
enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}
```

### Queries

```graphql
# Query type defines read operations
type Query {
  # Get single user
  user(id: ID!): User
  
  # Get all users with pagination
  users(page: Int = 0, size: Int = 20): UserConnection!
  
  # Search users
  searchUsers(query: String!): [User!]!
  
  # Get current logged-in user
  me: User
}

# Example query from client
query GetUserWithPosts {
  user(id: "123") {
    name
    email
    posts {
      title
      createdAt
    }
  }
}

# Query with variables
query GetUser($userId: ID!) {
  user(id: $userId) {
    name
    email
  }
}
# Variables: { "userId": "123" }
```

### Mutations

```graphql
# Mutation type defines write operations
type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, name: String, email: String): User!
  deleteUser(id: ID!): Boolean!
  
  createPost(input: CreatePostInput!): Post!
  publishPost(id: ID!): Post!
  
  addComment(postId: ID!, text: String!): Comment!
}

# Example mutation
mutation CreateNewUser {
  createUser(input: {
    name: "John Doe"
    email: "john@example.com"
    password: "secret123"
  }) {
    id
    name
    email
  }
}

# Mutation with variables
mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    id
    title
    published
  }
}
# Variables: { "input": { "title": "Hello World", "content": "..." }}
```

### Subscriptions

```graphql
# Real-time updates via WebSocket
type Subscription {
  postCreated: Post!
  commentAdded(postId: ID!): Comment!
  userStatusChanged(userId: ID!): User!
}

# Client subscribes to new posts
subscription OnNewPost {
  postCreated {
    id
    title
    author {
      name
    }
  }
}
```

---

## 3. REST vs GraphQL

### Detailed Comparison

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    REST vs GRAPHQL                                   │
├──────────────────┬──────────────────┬───────────────────────────────┤
│ Aspect           │ REST             │ GraphQL                       │
├──────────────────┼──────────────────┼───────────────────────────────┤
│ Endpoints        │ Multiple         │ Single (/graphql)             │
│                  │ /users, /posts   │                               │
├──────────────────┼──────────────────┼───────────────────────────────┤
│ Data Fetching    │ Server decides   │ Client decides                │
│                  │ what to return   │ what to return                │
├──────────────────┼──────────────────┼───────────────────────────────┤
│ Over-fetching    │ Common (get all  │ Eliminated (get only          │
│                  │ fields)          │ requested fields)             │
├──────────────────┼──────────────────┼───────────────────────────────┤
│ Under-fetching   │ Need multiple    │ Get all data in               │
│                  │ requests         │ single request                │
├──────────────────┼──────────────────┼───────────────────────────────┤
│ Versioning       │ /api/v1, /api/v2 │ No versioning needed          │
│                  │                  │ (evolve schema)               │
├──────────────────┼──────────────────┼───────────────────────────────┤
│ HTTP Caching     │ Easy (HTTP cache)│ Harder (POST requests)        │
├──────────────────┼──────────────────┼───────────────────────────────┤
│ File Upload      │ Native support   │ Needs extension               │
├──────────────────┼──────────────────┼───────────────────────────────┤
│ Error Handling   │ HTTP status codes│ Always 200, errors in body    │
├──────────────────┼──────────────────┼───────────────────────────────┤
│ Learning Curve   │ Low              │ Medium                        │
├──────────────────┼──────────────────┼───────────────────────────────┤
│ Tooling          │ Mature           │ Growing rapidly               │
└──────────────────┴──────────────────┴───────────────────────────────┘
```

### When to Use What?

```text
USE REST WHEN:
├── Simple CRUD operations
├── Public API (caching important)
├── File uploads/downloads
├── Team unfamiliar with GraphQL
├── Microservices internal communication
└── API is resource-centric

USE GRAPHQL WHEN:
├── Complex, nested data relationships
├── Mobile apps (bandwidth matters)
├── Multiple client types (web, mobile, IoT)
├── Rapid frontend iteration needed
├── Data-driven dashboards
└── Aggregating multiple data sources
```

---

## 4. The N+1 Problem

### What is the N+1 Problem?

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    N+1 PROBLEM                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Query: Get all posts with their authors                             │
│                                                                      │
│   query {                                                           │
│     posts {           ← 1 query to get all posts                    │
│       title                                                          │
│       author {        ← N queries to get each author!               │
│         name                                                         │
│       }                                                              │
│     }                                                                │
│   }                                                                  │
│                                                                      │
│ SQL executed:                                                        │
│   1. SELECT * FROM posts                    ← 1 query               │
│   2. SELECT * FROM users WHERE id = 1       ← +1                    │
│   3. SELECT * FROM users WHERE id = 2       ← +1                    │
│   4. SELECT * FROM users WHERE id = 3       ← +1                    │
│   ...                                                                │
│   N+1. SELECT * FROM users WHERE id = N     ← +1                    │
│                                                                      │
│ Result: N+1 database queries for N posts!                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Naive Implementation (Bad)

```java
@Component
public class PostResolver {
    
    @Autowired
    private PostRepository postRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    public List<Post> posts() {
        return postRepository.findAll();  // 1 query
    }
    
    // Called for each post - N queries!
    public User author(Post post) {
        return userRepository.findById(post.getAuthorId());  // N queries
    }
}
```

---

## 5. DataLoader: The Solution

### How DataLoader Works

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    DATALOADER BATCHING                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ WITHOUT DataLoader:                                                  │
│   Post 1 → fetch author(1)    → SQL query                          │
│   Post 2 → fetch author(2)    → SQL query                          │
│   Post 3 → fetch author(1)    → SQL query (duplicate!)             │
│   Post 4 → fetch author(3)    → SQL query                          │
│   = 4 queries                                                        │
│                                                                      │
│ WITH DataLoader:                                                     │
│   Post 1 → batch(authorId=1)                                        │
│   Post 2 → batch(authorId=2)                                        │
│   Post 3 → batch(authorId=1)  ← deduplicated                        │
│   Post 4 → batch(authorId=3)                                        │
│                                                                      │
│   End of batch window...                                             │
│   Execute: SELECT * FROM users WHERE id IN (1, 2, 3)                │
│   = 1 query!                                                         │
│                                                                      │
│ DataLoader provides:                                                 │
│   1. BATCHING: Collect IDs, make single query                       │
│   2. CACHING: Don't fetch same ID twice in request                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Java Implementation with DataLoader

```java
// Define a BatchLoader
@Component
public class UserBatchLoader implements BatchLoader<Long, User> {
    
    @Autowired
    private UserRepository userRepository;
    
    @Override
    public CompletionStage<List<User>> load(List<Long> userIds) {
        // Single batched query
        return CompletableFuture.supplyAsync(() -> 
            userRepository.findAllById(userIds)
        );
    }
}

// DataLoader registry (per-request)
@Component
public class DataLoaderRegistry {
    
    @Autowired
    private UserBatchLoader userBatchLoader;
    
    public DataLoader<Long, User> getUserLoader() {
        return DataLoader.newDataLoader(userBatchLoader);
    }
}

// Resolver using DataLoader
@Component
public class PostResolver {
    
    public CompletableFuture<User> author(Post post, DataLoader<Long, User> userLoader) {
        // Doesn't execute immediately - batches with other calls
        return userLoader.load(post.getAuthorId());
    }
}
```

### Spring GraphQL with @BatchMapping

```java
// Spring for GraphQL (simpler approach)
@Controller
public class PostController {
    
    @Autowired
    private PostRepository postRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @QueryMapping
    public List<Post> posts() {
        return postRepository.findAll();
    }
    
    // Automatically batches author resolution
    @BatchMapping
    public Map<Post, User> author(List<Post> posts) {
        // Get all unique author IDs
        Set<Long> authorIds = posts.stream()
            .map(Post::getAuthorId)
            .collect(Collectors.toSet());
        
        // Single query for all authors
        Map<Long, User> usersById = userRepository.findAllById(authorIds)
            .stream()
            .collect(Collectors.toMap(User::getId, u -> u));
        
        // Map posts to authors
        return posts.stream()
            .collect(Collectors.toMap(
                post -> post,
                post -> usersById.get(post.getAuthorId())
            ));
    }
}
```

---

## 6. GraphQL Error Handling

### Error Response Format

```json
{
  "data": {
    "user": null
  },
  "errors": [
    {
      "message": "User not found",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["user"],
      "extensions": {
        "code": "NOT_FOUND",
        "timestamp": "2024-01-15T10:30:00Z"
      }
    }
  ]
}
```

### Custom Exception Handling

```java
// Custom exception
public class UserNotFoundException extends RuntimeException {
    private final String userId;
    
    public UserNotFoundException(String userId) {
        super("User not found: " + userId);
        this.userId = userId;
    }
}

// Exception resolver
@Component
public class CustomExceptionResolver extends DataFetcherExceptionResolverAdapter {
    
    @Override
    protected GraphQLError resolveToSingleError(Throwable ex, DataFetchingEnvironment env) {
        if (ex instanceof UserNotFoundException) {
            return GraphqlErrorBuilder.newError(env)
                .message(ex.getMessage())
                .errorType(ErrorType.NOT_FOUND)
                .extensions(Map.of("code", "USER_NOT_FOUND"))
                .build();
        }
        
        if (ex instanceof ValidationException) {
            return GraphqlErrorBuilder.newError(env)
                .message(ex.getMessage())
                .errorType(ErrorType.BAD_REQUEST)
                .extensions(Map.of("code", "VALIDATION_ERROR"))
                .build();
        }
        
        // Default: internal error (hide details in production)
        return GraphqlErrorBuilder.newError(env)
            .message("Internal server error")
            .errorType(ErrorType.INTERNAL_ERROR)
            .build();
    }
}
```

---

## 7. Security Considerations

### Query Depth Limiting

```text
PROBLEM: Malicious deep nested queries
query {
  user {
    friends {
      friends {
        friends {
          friends {
            ... (100 levels deep - DoS attack!)
          }
        }
      }
    }
  }
}

SOLUTION: Limit query depth
```

```java
// Spring GraphQL configuration
@Configuration
public class GraphQLConfig {
    
    @Bean
    public RuntimeWiringConfigurer runtimeWiringConfigurer() {
        return wiringBuilder -> wiringBuilder
            .directive("maxDepth", new MaxDepthDirective(5))
            .scalar(ExtendedScalars.DateTime);
    }
}

// Or use instrumentation
@Bean
public Instrumentation maxQueryDepthInstrumentation() {
    return new MaxQueryDepthInstrumentation(10);
}
```

### Query Complexity Analysis

```java
// Limit based on query complexity
@Bean
public Instrumentation maxQueryComplexityInstrumentation() {
    return new MaxQueryComplexityInstrumentation(100, (env, complexity) -> {
        if (complexity > 100) {
            throw new RuntimeException("Query too complex: " + complexity);
        }
    });
}
```

### Rate Limiting

```java
@Component
public class RateLimitingInterceptor implements WebGraphQlInterceptor {
    
    @Autowired
    private RateLimiter rateLimiter;
    
    @Override
    public Mono<WebGraphQlResponse> intercept(WebGraphQlRequest request, Chain chain) {
        String clientId = extractClientId(request);
        
        if (!rateLimiter.tryAcquire(clientId)) {
            return Mono.error(new TooManyRequestsException("Rate limit exceeded"));
        }
        
        return chain.next(request);
    }
}
```

---

## 8. Interview Questions

### Q1: What is the N+1 problem and how do you solve it?

```text
Answer:
"The N+1 problem occurs when fetching nested data. For example,
if I query 10 posts with their authors, naive implementation
would execute 1 query for posts + 10 queries for authors = 11 queries.

I solve this with DataLoader which provides:
1. BATCHING: Collects all author IDs, executes single IN query
2. CACHING: Deduplicates requests for same author

In Spring GraphQL, I use @BatchMapping:

@BatchMapping
public Map<Post, User> author(List<Post> posts) {
    Set<Long> authorIds = posts.stream()
        .map(Post::getAuthorId)
        .collect(toSet());
    
    Map<Long, User> usersById = userRepository.findAllById(authorIds)
        .stream().collect(toMap(User::getId, u -> u));
    
    return posts.stream().collect(toMap(p -> p, 
        p -> usersById.get(p.getAuthorId())));
}

This reduces N+1 queries to just 2 queries."
```

### Q2: When would you choose GraphQL over REST?

```text
Answer:
"I choose GraphQL when:

1. MULTIPLE CLIENT TYPES: Mobile needs less data than web
   - GraphQL lets each client request exactly what they need
   - Mobile saves bandwidth
   
2. COMPLEX NESTED DATA: User → Posts → Comments → Authors
   - REST would need multiple round trips
   - GraphQL gets everything in one request

3. RAPIDLY CHANGING REQUIREMENTS
   - Frontend can add fields without backend changes
   - No versioning needed

4. AGGREGATING DATA FROM MULTIPLE SOURCES
   - Single GraphQL layer over multiple microservices

I choose REST when:
- Simple CRUD operations
- HTTP caching is critical
- File upload/download
- Public API (simpler for consumers)
- Team is new to GraphQL"
```

### Q3: How do you handle security in GraphQL?

```text
Answer:
"GraphQL has unique security concerns I address:

1. QUERY DEPTH LIMITING
   Prevent deeply nested queries (DoS):
   MaxQueryDepthInstrumentation(10)

2. QUERY COMPLEXITY ANALYSIS
   Assign cost to fields, limit total cost:
   Complex query = user(1) + posts(10*5) + comments(50*2)

3. RATE LIMITING
   Per-user/IP at GraphQL layer

4. FIELD-LEVEL AUTHORIZATION
   @PreAuthorize on resolvers:
   @SchemaMapping
   @PreAuthorize("hasRole('ADMIN')")
   public String sensitiveField(User user) { ... }

5. INPUT VALIDATION
   Validate all input arguments

6. QUERY WHITELISTING (Production)
   Only allow pre-approved queries (Apollo persisted queries)

7. DISABLE INTROSPECTION in production
   Attackers can't discover schema"
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│                     GRAPHQL CHEAT SHEET                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ OPERATIONS:                                                           │
│ ├── Query: Read data (GET equivalent)                                │
│ ├── Mutation: Write data (POST/PUT/DELETE equivalent)                │
│ └── Subscription: Real-time updates (WebSocket)                      │
│                                                                       │
│ SCHEMA TYPES:                                                         │
│ ├── Scalar: ID, String, Int, Float, Boolean                          │
│ ├── Object: Custom types (User, Post)                                │
│ ├── Input: For mutation arguments                                    │
│ ├── Enum: Fixed set of values                                        │
│ └── ! = Non-nullable, [] = List                                      │
│                                                                       │
│ N+1 PROBLEM:                                                          │
│ Problem: 1 query + N nested queries                                   │
│ Solution: DataLoader (batching + caching)                             │
│ Spring: @BatchMapping                                                 │
│                                                                       │
│ GRAPHQL vs REST:                                                      │
│ ├── GraphQL: Single endpoint, client decides data                    │
│ ├── REST: Multiple endpoints, server decides data                    │
│ ├── Use GraphQL: Complex relationships, mobile apps                  │
│ └── Use REST: Simple CRUD, caching, file uploads                     │
│                                                                       │
│ SECURITY:                                                             │
│ ├── Query depth limiting                                             │
│ ├── Query complexity analysis                                        │
│ ├── Rate limiting                                                    │
│ ├── Field-level authorization                                        │
│ └── Disable introspection in production                              │
│                                                                       │
│ ERROR HANDLING:                                                       │
│ ├── Always returns HTTP 200                                          │
│ ├── Errors in response body                                          │
│ └── Partial data with partial errors possible                        │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Back to:** [← API Design Overview](./01-intro.md)

**Next:** [12. Java 8+ Features →](../12-java-features/01-intro.md)

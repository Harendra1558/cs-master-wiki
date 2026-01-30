---
title: 5. Spring Security Deep Dive
sidebar_position: 5
description: Master Spring Security filter chain, authentication, authorization, and custom security for interviews.
keywords: [spring security, security filter chain, authentication, authorization, method security]
---

# Spring Security Deep Dive

:::info Interview Essential
Spring Security questions are common in Java backend interviews. Understanding the filter chain and customization is crucial.
:::

## 1. Security Filter Chain

### How Requests Flow

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    SPRING SECURITY FILTER CHAIN                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   HTTP Request                                                       │
│        │                                                             │
│        ▼                                                             │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  SecurityContextPersistenceFilter                           │   │
│   │  └── Load SecurityContext from session                      │   │
│   ├─────────────────────────────────────────────────────────────┤   │
│   │  CorsFilter                                                 │   │
│   │  └── Handle CORS preflight requests                         │   │
│   ├─────────────────────────────────────────────────────────────┤   │
│   │  CsrfFilter                                                 │   │
│   │  └── CSRF token verification                                │   │
│   ├─────────────────────────────────────────────────────────────┤   │
│   │  LogoutFilter                                               │   │
│   │  └── Handle /logout requests                                │   │
│   ├─────────────────────────────────────────────────────────────┤   │
│   │  UsernamePasswordAuthenticationFilter                       │   │
│   │  └── Handle form login (/login POST)                        │   │
│   ├─────────────────────────────────────────────────────────────┤   │
│   │  BearerTokenAuthenticationFilter (for JWT)                  │   │
│   │  └── Extract and validate JWT from Authorization header     │   │
│   ├─────────────────────────────────────────────────────────────┤   │
│   │  ExceptionTranslationFilter                                 │   │
│   │  └── Convert security exceptions to HTTP responses          │   │
│   ├─────────────────────────────────────────────────────────────┤   │
│   │  FilterSecurityInterceptor                                  │   │
│   │  └── Authorization check (do they have access?)             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│        │                                                             │
│        ▼                                                             │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    YOUR CONTROLLER                          │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Basic Configuration

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            // Disable CSRF for stateless API (JWT-based)
            .csrf(csrf -> csrf.disable())
            
            // Configure authorization
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                
                // Role-based access
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/users/**").hasAnyRole("USER", "ADMIN")
                
                // Everything else requires authentication
                .anyRequest().authenticated()
            )
            
            // Stateless session (for JWT)
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            
            // Add custom JWT filter
            .addFilterBefore(jwtAuthFilter(), UsernamePasswordAuthenticationFilter.class)
            
            // Exception handling
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
                .accessDeniedHandler((req, res, e) -> {
                    res.setStatus(HttpStatus.FORBIDDEN.value());
                    res.getWriter().write("{\"error\": \"Access denied\"}");
                })
            )
            
            .build();
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

---

## 2. Custom JWT Authentication

### JWT Filter

```java
@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    
    @Autowired
    private JwtService jwtService;
    
    @Autowired
    private UserDetailsService userDetailsService;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        
        // Extract token from header
        String authHeader = request.getHeader("Authorization");
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }
        
        String token = authHeader.substring(7);
        
        try {
            // Validate and extract username
            String username = jwtService.extractUsername(token);
            
            // If valid and not already authenticated
            if (username != null && 
                SecurityContextHolder.getContext().getAuthentication() == null) {
                
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                
                if (jwtService.isTokenValid(token, userDetails)) {
                    // Create authentication object
                    UsernamePasswordAuthenticationToken authToken = 
                        new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                        );
                    
                    authToken.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                    );
                    
                    // Set in security context
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (JwtException e) {
            // Invalid token - don't authenticate, but continue chain
            // FilterSecurityInterceptor will return 401 if required
        }
        
        chain.doFilter(request, response);
    }
    
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Skip filter for public endpoints
        String path = request.getServletPath();
        return path.startsWith("/api/auth/") || path.startsWith("/api/public/");
    }
}
```

### JWT Service

```java
@Service
public class JwtService {
    
    @Value("${jwt.secret}")
    private String secret;
    
    @Value("${jwt.expiration:86400000}")  // 24 hours default
    private long expiration;
    
    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("roles", userDetails.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList()));
        
        return Jwts.builder()
            .setClaims(claims)
            .setSubject(userDetails.getUsername())
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + expiration))
            .signWith(getSigningKey(), SignatureAlgorithm.HS256)
            .compact();
    }
    
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }
    
    public boolean isTokenValid(String token, UserDetails userDetails) {
        String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }
    
    private boolean isTokenExpired(String token) {
        Date expiry = extractClaim(token, Claims::getExpiration);
        return expiry.before(new Date());
    }
    
    private <T> T extractClaim(String token, Function<Claims, T> resolver) {
        Claims claims = Jwts.parserBuilder()
            .setSigningKey(getSigningKey())
            .build()
            .parseClaimsJws(token)
            .getBody();
        return resolver.apply(claims);
    }
    
    private Key getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
```

---

## 3. Custom UserDetailsService

```java
@Service
public class CustomUserDetailsService implements UserDetailsService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(username)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
        
        return org.springframework.security.core.userdetails.User.builder()
            .username(user.getEmail())
            .password(user.getPassword())
            .authorities(mapRolesToAuthorities(user.getRoles()))
            .accountExpired(false)
            .accountLocked(user.isLocked())
            .credentialsExpired(false)
            .disabled(!user.isEnabled())
            .build();
    }
    
    private Collection<? extends GrantedAuthority> mapRolesToAuthorities(Set<Role> roles) {
        return roles.stream()
            .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getName()))
            .collect(Collectors.toSet());
    }
}

// Or with custom UserDetails implementation
public class CustomUserPrincipal implements UserDetails {
    
    private final User user;
    
    public CustomUserPrincipal(User user) {
        this.user = user;
    }
    
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return user.getRoles().stream()
            .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getName()))
            .collect(Collectors.toSet());
    }
    
    @Override
    public String getPassword() { return user.getPassword(); }
    
    @Override
    public String getUsername() { return user.getEmail(); }
    
    @Override
    public boolean isAccountNonExpired() { return true; }
    
    @Override
    public boolean isAccountNonLocked() { return !user.isLocked(); }
    
    @Override
    public boolean isCredentialsNonExpired() { return true; }
    
    @Override
    public boolean isEnabled() { return user.isEnabled(); }
    
    // Custom method to access user entity
    public User getUser() { return user; }
}
```

---

## 4. Method-Level Security

### Enable Method Security

```java
@Configuration
@EnableMethodSecurity(
    prePostEnabled = true,   // @PreAuthorize, @PostAuthorize
    securedEnabled = true,   // @Secured
    jsr250Enabled = true     // @RolesAllowed
)
public class MethodSecurityConfig { }
```

### Authorization Annotations

```java
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    // Role-based
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }
    
    // Multiple roles
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @PutMapping("/{id}/suspend")
    public ResponseEntity<User> suspendUser(@PathVariable Long id) {
        return ResponseEntity.ok(userService.suspend(id));
    }
    
    // Permission-based
    @PreAuthorize("hasAuthority('user:write')")
    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody User user) {
        return ResponseEntity.ok(userService.update(id, user));
    }
    
    // Access method parameters
    @PreAuthorize("#id == authentication.principal.id or hasRole('ADMIN')")
    @GetMapping("/{id}/profile")
    public ResponseEntity<UserProfile> getProfile(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getProfile(id));
    }
    
    // Post-authorization (filter result)
    @PostAuthorize("returnObject.body.owner == authentication.principal.username")
    @GetMapping("/documents/{id}")
    public ResponseEntity<Document> getDocument(@PathVariable Long id) {
        return ResponseEntity.ok(documentService.findById(id));
    }
    
    // Filter collections
    @PostFilter("filterObject.public or filterObject.owner == authentication.principal.username")
    @GetMapping("/documents")
    public List<Document> getAllDocuments() {
        return documentService.findAll();  // Results are filtered
    }
}
```

### Custom Security Expressions

```java
@Component("userSecurity")
public class UserSecurityService {
    
    @Autowired
    private UserRepository userRepository;
    
    public boolean isOwner(Long resourceId, Long userId) {
        return userRepository.isOwnerOfResource(resourceId, userId);
    }
    
    public boolean canAccessOrganization(Long orgId, Authentication auth) {
        CustomUserPrincipal principal = (CustomUserPrincipal) auth.getPrincipal();
        return principal.getUser().getOrganizationId().equals(orgId);
    }
}

@RestController
public class ResourceController {
    
    // Use custom security expression
    @PreAuthorize("@userSecurity.isOwner(#id, authentication.principal.id)")
    @DeleteMapping("/resources/{id}")
    public ResponseEntity<Void> deleteResource(@PathVariable Long id) {
        resourceService.delete(id);
        return ResponseEntity.noContent().build();
    }
    
    @PreAuthorize("@userSecurity.canAccessOrganization(#orgId, authentication)")
    @GetMapping("/organizations/{orgId}/users")
    public List<User> getOrgUsers(@PathVariable Long orgId) {
        return userService.findByOrganization(orgId);
    }
}
```

---

## 5. Authentication Providers

### Custom Authentication Provider

```java
// For custom authentication logic (e.g., LDAP, external service)
@Component
public class CustomAuthenticationProvider implements AuthenticationProvider {
    
    @Autowired
    private LdapService ldapService;
    
    @Autowired
    private UserRepository userRepository;
    
    @Override
    public Authentication authenticate(Authentication authentication) 
            throws AuthenticationException {
        
        String username = authentication.getName();
        String password = authentication.getCredentials().toString();
        
        // Authenticate against LDAP
        if (!ldapService.authenticate(username, password)) {
            throw new BadCredentialsException("Invalid credentials");
        }
        
        // Load user from local DB (or create if first login)
        User user = userRepository.findByUsername(username)
            .orElseGet(() -> createUserFromLdap(username));
        
        List<GrantedAuthority> authorities = user.getRoles().stream()
            .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getName()))
            .collect(Collectors.toList());
        
        return new UsernamePasswordAuthenticationToken(
            new CustomUserPrincipal(user),
            null,
            authorities
        );
    }
    
    @Override
    public boolean supports(Class<?> authentication) {
        return UsernamePasswordAuthenticationToken.class.isAssignableFrom(authentication);
    }
}

// Register custom provider
@Configuration
public class SecurityConfig {
    
    @Autowired
    private CustomAuthenticationProvider customAuthProvider;
    
    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
    
    @Bean
    public AuthenticationProvider authenticationProvider() {
        return customAuthProvider;
    }
}
```

### Multi-Factor Authentication

```java
@Service
public class MfaAuthenticationService {
    
    @Autowired
    private TotpService totpService;
    
    @Autowired
    private AuthenticationManager authManager;
    
    public AuthResponse authenticate(LoginRequest request) {
        // Step 1: Verify username/password
        Authentication auth = authManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                request.getUsername(),
                request.getPassword()
            )
        );
        
        CustomUserPrincipal principal = (CustomUserPrincipal) auth.getPrincipal();
        User user = principal.getUser();
        
        // Step 2: Check if MFA enabled
        if (user.isMfaEnabled()) {
            if (request.getTotpCode() == null) {
                // Return partial auth - needs MFA code
                return AuthResponse.mfaRequired(user.getId());
            }
            
            // Verify TOTP
            if (!totpService.verifyCode(user.getMfaSecret(), request.getTotpCode())) {
                throw new BadCredentialsException("Invalid MFA code");
            }
        }
        
        // Generate JWT
        String token = jwtService.generateToken(principal);
        return AuthResponse.success(token);
    }
}

@Service
public class TotpService {
    
    public String generateSecret() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[20];
        random.nextBytes(bytes);
        return Base32.encode(bytes);
    }
    
    public String generateQrCodeUri(String secret, String email) {
        return String.format(
            "otpauth://totp/MyApp:%s?secret=%s&issuer=MyApp",
            email, secret
        );
    }
    
    public boolean verifyCode(String secret, String code) {
        GoogleAuthenticator gAuth = new GoogleAuthenticator();
        return gAuth.authorize(secret, Integer.parseInt(code));
    }
}
```

---

## 6. Security Events & Auditing

```java
@Component
public class AuthenticationEventListener {
    
    @Autowired
    private AuditLogService auditLogService;
    
    @EventListener
    public void onSuccess(AuthenticationSuccessEvent event) {
        Authentication auth = event.getAuthentication();
        String username = auth.getName();
        
        auditLogService.log(AuditEvent.builder()
            .type("LOGIN_SUCCESS")
            .username(username)
            .details("Successful login")
            .build());
    }
    
    @EventListener
    public void onFailure(AuthenticationFailureBadCredentialsEvent event) {
        String username = event.getAuthentication().getName();
        
        auditLogService.log(AuditEvent.builder()
            .type("LOGIN_FAILURE")
            .username(username)
            .details("Invalid credentials")
            .build());
        
        // Increment failed attempts
        loginAttemptService.recordFailure(username);
    }
    
    @EventListener
    public void onAuthorizationDenied(AuthorizationDeniedEvent event) {
        Authentication auth = event.getAuthentication();
        
        auditLogService.log(AuditEvent.builder()
            .type("ACCESS_DENIED")
            .username(auth != null ? auth.getName() : "anonymous")
            .details("Access denied to: " + event.getSource())
            .build());
    }
}

// Account lockout after failed attempts
@Service
public class LoginAttemptService {
    
    private final Cache<String, Integer> attemptsCache = Caffeine.newBuilder()
        .expireAfterWrite(Duration.ofMinutes(15))
        .build();
    
    private static final int MAX_ATTEMPTS = 5;
    
    public void recordFailure(String username) {
        int attempts = attemptsCache.getIfPresent(username) == null ? 
            0 : attemptsCache.getIfPresent(username);
        attemptsCache.put(username, attempts + 1);
        
        if (attempts + 1 >= MAX_ATTEMPTS) {
            userService.lockAccount(username);
        }
    }
    
    public void resetAttempts(String username) {
        attemptsCache.invalidate(username);
    }
    
    public boolean isBlocked(String username) {
        Integer attempts = attemptsCache.getIfPresent(username);
        return attempts != null && attempts >= MAX_ATTEMPTS;
    }
}
```

---

## 7. Testing Security

```java
@SpringBootTest
@AutoConfigureMockMvc
class SecurityIntegrationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private JwtService jwtService;
    
    // Test unauthenticated access
    @Test
    void accessProtectedEndpoint_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/users"))
            .andExpect(status().isUnauthorized());
    }
    
    // Test with JWT
    @Test
    @WithMockUser(username = "user@test.com", roles = {"USER"})
    void accessProtectedEndpoint_withUserRole_succeeds() throws Exception {
        mockMvc.perform(get("/api/users/me"))
            .andExpect(status().isOk());
    }
    
    // Test authorization
    @Test
    @WithMockUser(username = "user@test.com", roles = {"USER"})
    void accessAdminEndpoint_withUserRole_returns403() throws Exception {
        mockMvc.perform(delete("/api/admin/users/1"))
            .andExpect(status().isForbidden());
    }
    
    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void accessAdminEndpoint_withAdminRole_succeeds() throws Exception {
        mockMvc.perform(delete("/api/admin/users/1"))
            .andExpect(status().isNoContent());
    }
    
    // Test with real JWT
    @Test
    void accessWithRealJwt() throws Exception {
        String token = jwtService.generateToken(testUser);
        
        mockMvc.perform(get("/api/users/me")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("test@example.com"));
    }
    
    // Custom security context
    @Test
    @WithCustomUser(id = 1L, email = "test@example.com", roles = {"USER"})
    void customSecurityContext() throws Exception {
        mockMvc.perform(get("/api/users/1/profile"))
            .andExpect(status().isOk());
    }
}

// Custom annotation for test user
@Retention(RetentionPolicy.RUNTIME)
@WithSecurityContext(factory = WithCustomUserSecurityContextFactory.class)
public @interface WithCustomUser {
    long id() default 1L;
    String email() default "test@example.com";
    String[] roles() default {"USER"};
}

public class WithCustomUserSecurityContextFactory 
        implements WithSecurityContextFactory<WithCustomUser> {
    
    @Override
    public SecurityContext createSecurityContext(WithCustomUser annotation) {
        User user = new User();
        user.setId(annotation.id());
        user.setEmail(annotation.email());
        
        CustomUserPrincipal principal = new CustomUserPrincipal(user);
        
        List<GrantedAuthority> authorities = Arrays.stream(annotation.roles())
            .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
            .collect(Collectors.toList());
        
        Authentication auth = new UsernamePasswordAuthenticationToken(
            principal, null, authorities);
        
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        return context;
    }
}
```

---

## 8. Interview Questions

### Q1: Explain the Spring Security filter chain

```text
Answer:
"Spring Security uses a chain of filters that process each request:

FILTER ORDER:
1. SecurityContextPersistenceFilter
   - Loads SecurityContext from session (if exists)
   
2. CorsFilter
   - Handles CORS preflight requests
   
3. CsrfFilter
   - Validates CSRF tokens for state-changing requests
   
4. LogoutFilter
   - Processes logout requests
   
5. Authentication Filters (e.g., JwtAuthFilter)
   - Extracts credentials and authenticates
   - Sets Authentication in SecurityContext
   
6. ExceptionTranslationFilter
   - Catches security exceptions
   - Returns 401/403 responses
   
7. FilterSecurityInterceptor
   - Authorization check
   - Verifies user has required permissions

CUSTOMIZATION:
- Add custom filters with addFilterBefore/After
- For JWT, add before UsernamePasswordAuthenticationFilter
- Each filter can short-circuit the chain"
```

### Q2: How do you implement role-based access control?

```text
Answer:
"I implement RBAC at multiple levels:

1. URL-LEVEL (HttpSecurity):
   .authorizeHttpRequests(auth -> auth
       .requestMatchers('/admin/**').hasRole('ADMIN')
       .requestMatchers('/api/**').hasAnyRole('USER', 'ADMIN'))

2. METHOD-LEVEL (@PreAuthorize):
   @PreAuthorize('hasRole(\"ADMIN\")')
   public void deleteUser(Long id) { ... }

3. DYNAMIC AUTHORIZATION:
   @PreAuthorize('@permissionService.canAccess(#id, authentication)')
   
4. DATA-LEVEL (@PostFilter):
   @PostFilter('filterObject.owner == authentication.name')
   public List<Document> getDocuments() { ... }

HIERARCHY:
- Configure role hierarchy: ADMIN > MODERATOR > USER
- ADMIN automatically has USER permissions

BEST PRACTICES:
- Use hasRole for roles, hasAuthority for permissions
- Keep authorization close to business logic
- Log all access denied events"
```

### Q3: How do you secure a stateless REST API?

```text
Answer:
"For stateless API security:

1. DISABLE SESSION:
   .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))

2. DISABLE CSRF:
   .csrf(csrf -> csrf.disable())
   // Safe because we use tokens, not cookies for auth

3. JWT AUTHENTICATION:
   - Custom filter extracts token from Authorization header
   - Validates signature and expiration
   - Sets Authentication in SecurityContext
   - Each request is independent

4. TOKEN STORAGE:
   - Short-lived access tokens (15 min)
   - Refresh tokens in HttpOnly cookies
   - No session on server

5. SECURITY HEADERS:
   - HSTS for HTTPS enforcement
   - Content-Security-Policy
   - X-Frame-Options: DENY

6. RATE LIMITING:
   - Prevent brute force attacks
   - Track by IP and user

FILTER CHAIN:
Request → CORS → JWT Filter → Authorization → Controller"
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│               SPRING SECURITY CHEAT SHEET                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ URL-BASED AUTHORIZATION:                                              │
│   .requestMatchers("/admin/**").hasRole("ADMIN")                     │
│   .requestMatchers("/api/**").authenticated()                        │
│   .anyRequest().denyAll()                                            │
│                                                                       │
│ METHOD-LEVEL AUTHORIZATION:                                           │
│   @PreAuthorize("hasRole('ADMIN')")                                  │
│   @PreAuthorize("#id == authentication.principal.id")                │
│   @PreAuthorize("@service.canAccess(#id, authentication)")           │
│   @PostFilter("filterObject.owner == authentication.name")           │
│                                                                       │
│ CUSTOM FILTER:                                                        │
│   extends OncePerRequestFilter                                       │
│   .addFilterBefore(myFilter, UsernamePasswordAuthFilter.class)       │
│                                                                       │
│ JWT FLOW:                                                             │
│   1. Extract token from Authorization header                         │
│   2. Validate signature and expiration                               │
│   3. Extract username and load UserDetails                           │
│   4. Create Authentication object                                    │
│   5. Set in SecurityContextHolder                                    │
│                                                                       │
│ PASSWORD ENCODING:                                                    │
│   @Bean PasswordEncoder passwordEncoder() {                          │
│       return new BCryptPasswordEncoder();                            │
│   }                                                                   │
│                                                                       │
│ TESTING:                                                              │
│   @WithMockUser(roles = "ADMIN")                                     │
│   @WithAnonymousUser                                                 │
│   .header("Authorization", "Bearer " + token)                        │
│                                                                       │
│ HTTP STATUS CODES:                                                    │
│   401 Unauthorized   Not authenticated                               │
│   403 Forbidden      Authenticated but not authorized                │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Next:** [6. API Security & OWASP →](./api-security-owasp)

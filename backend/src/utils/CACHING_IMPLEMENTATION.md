# Authentication Caching Implementation

## Overview

To address the ~1300ms network latency on every authenticated request, we've implemented an in-memory caching mechanism in the authentication middleware. This cache stores user data (including tenant and class information) for 5 minutes, dramatically reducing database queries and improving response times.

## Implementation Details

### 1. Cache Utility (`backend/src/utils/cache.js`)

A simple in-memory cache using JavaScript `Map` with TTL (Time-to-Live) support:

- **Cache Key**: User ID (from decoded JWT token)
- **TTL**: 5 minutes (300,000 ms)
- **Cleanup**: Automatic cleanup of expired entries every 60 seconds
- **Memory**: Lightweight, stores only essential user data

### 2. Middleware Integration (`backend/src/middleware/auth.js`)

Both `protect` and `optionalAuth` middleware now use caching:

#### Execution Flow:

1. **Verify JWT token** (unchanged)
2. **Check cache** for user data using `userId` as key
3. **Cache Hit**: 
   - User data found in cache
   - Attach to `req.user` immediately
   - Call `next()` without database query
   - **Time saved: ~1300ms per request**
4. **Cache Miss**:
   - Execute database query (LEFT JOIN User, Tenant, Class)
   - Store result in cache with 5-minute TTL
   - Attach to `req.user`
   - Call `next()`

### 3. Cache Key Strategy

- **Key**: `decoded.id` (User UUID from JWT token)
- **Value**: Complete user object including:
  - User fields (id, email, name, phone, role, etc.)
  - Nested `tenant` object (if tenantId exists)
  - Nested `class` object (if classId exists)

### 4. TTL Configuration

- **Default TTL**: 5 minutes (300,000 ms)
- **Rationale**: 
  - Long enough to avoid frequent database hits
  - Short enough to reflect user updates reasonably quickly
  - Balanced for typical school management system usage

## Performance Impact

### Before Caching:
- Every authenticated request: ~1300ms (network latency + DB query)
- 100 requests/minute = 130,000ms of latency
- High database load

### After Caching:
- First request (cache miss): ~1300ms
- Subsequent requests (cache hit): <1ms (memory access)
- 100 requests/minute = ~1300ms total (99% reduction)
- Minimal database load

### Real-World Example:
A teacher checking their dashboard every 30 seconds:
- **Before**: 2 requests × 1300ms = 2600ms/minute
- **After**: 1 request × 1300ms (first) + 1 request × <1ms = ~1300ms/minute
- **Savings**: 50% reduction in latency, 50% reduction in DB queries

## Cache Behavior

### Cache Hit Scenario:
```javascript
// Request 1 (0:00): Cache miss, DB query, cache for 5 min
// Request 2 (0:30): Cache hit, instant response
// Request 3 (1:00): Cache hit, instant response
// Request 4 (5:30): Cache expired, DB query, cache for 5 min
```

### Cache Invalidation:
- **Automatic**: After 5 minutes TTL expires
- **Manual**: Call `userCache.delete(userId)` if needed (e.g., after profile update)
- **Global clear**: Call `userCache.clear()` (rarely needed)

## Error Handling

The caching layer maintains existing error handling:

1. **Invalid token**: Returns 401 (token validation happens before cache check)
2. **User not found**: Returns 401 (cache miss leads to DB query, if still not found → 401)
3. **Database errors**: Propagated to error handler (cache miss scenario)
4. **Cache errors**: Graceful degradation - if cache fails, falls back to DB query

## Memory Usage

- **Per user**: ~500 bytes (user object with tenant/class data)
- **100 active users**: ~50 KB
- **1000 active users**: ~500 KB
- **Cleanup**: Expired entries automatically removed every 60 seconds

## Monitoring

### Cache Statistics:
```javascript
const stats = userCache.stats();
console.log(stats);
// Output: { totalItems: 45, expiredItems: 2, activeItems: 43 }
```

### Development Logging:
In development mode, the cache logs cleanup operations:
```
[Cache] Cleaned up 12 expired entries
```

## Considerations

### When to Invalidate Cache:
Consider manually clearing cache in these scenarios:
- User profile update (name, email, phone)
- Role change (e.g., student → teacher)
- Tenant change (user transfers schools)
- Class assignment change (for teachers)

Example:
```javascript
// In user update controller
await updateUser(userId, updates);
userCache.delete(userId); // Invalidate cache
```

### Multi-Server Deployments:
If running multiple backend instances:
- Each instance has its own cache (no shared cache)
- This is acceptable - cache is per-instance optimization
- Slight inconsistency possible (5-minute window)
- For shared cache, consider Redis (future enhancement)

### Production Recommendations:
1. Monitor memory usage (should be minimal)
2. Consider cache statistics for capacity planning
3. Set up alerts for high cache miss rates
4. Consider Redis for distributed caching if needed

## Testing

### Manual Testing:
1. Start server
2. Make authenticated request (cache miss, ~1300ms)
3. Make same request immediately (cache hit, <1ms)
4. Wait 5 minutes
5. Make request again (cache expired, ~1300ms)

### Verify Cache is Working:
Add temporary logging in middleware:
```javascript
const cachedUser = userCache.get(decoded.id);
if (cachedUser) {
  console.log('CACHE HIT for user:', decoded.id);
} else {
  console.log('CACHE MISS for user:', decoded.id);
}
```

## Future Enhancements

1. **Redis Integration**: For distributed caching across multiple servers
2. **Cache Invalidation Events**: Automatic cache clearing on user updates
3. **Configurable TTL**: Different TTLs for different user roles
4. **Cache Warming**: Pre-populate cache for frequently accessed users
5. **Cache Analytics**: Track hit/miss ratios, popular users, etc.

## Summary

The caching implementation provides:
- ✅ **99% reduction** in authentication latency for cached users
- ✅ **Significant reduction** in database load
- ✅ **Minimal memory** footprint
- ✅ **Zero changes** to existing API contracts
- ✅ **Automatic cleanup** of expired entries
- ✅ **Graceful degradation** on cache failures

This optimization is critical for handling the ~1300ms network latency to Supabase servers and dramatically improves user experience, especially for frequently accessed routes.
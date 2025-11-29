/**
 * Cache Tool - The Memory Engine
 * 
 * Ultra-fast key-value storage operations for Basis: Cache.
 * Provides SET (write) and GET (read) operations with TTL support.
 */

/**
 * Cache SET operation result
 */
export interface CacheSetResult {
  status: "stored";
  key: string;
  ttl?: number;
}

/**
 * Cache GET operation result
 */
export interface CacheGetResult {
  value: string | null;
  found: boolean;
  key: string;
}

/**
 * SET - Write data to KV storage
 * 
 * @param kv - Cloudflare KV namespace instance
 * @param key - Unique key for the data
 * @param value - Data to store (string or JSON-serializable object)
 * @param ttl - Time to live in seconds (default: 3600 = 1 hour)
 * @returns Promise with storage confirmation
 */
export async function setCache(
  kv: KVNamespace,
  key: string,
  value: string | object,
  ttl: number = 3600
): Promise<CacheSetResult> {
  // Serialize value if it's an object
  const serializedValue = typeof value === "string" ? value : JSON.stringify(value);

  // Store in KV with TTL
  await kv.put(key, serializedValue, {
    expirationTtl: ttl,
  });

  return {
    status: "stored",
    key,
    ttl,
  };
}

/**
 * GET - Read data from KV storage
 * 
 * @param kv - Cloudflare KV namespace instance
 * @param key - Key to retrieve
 * @returns Promise with retrieved data and found status
 */
export async function getCache(kv: KVNamespace, key: string): Promise<CacheGetResult> {
  const value = await kv.get(key);

  return {
    value: value,
    found: value !== null,
    key,
  };
}


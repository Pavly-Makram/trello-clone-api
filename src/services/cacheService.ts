import redis from "../config/redis";

/**
 * @param key
 */
export const getCache = async (key: string) => {
    try {
        const cachedData = await redis.get(key);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
    } catch (error) {
        console.error(`[Redis Error] Failed to get ${key}:`, error);
    }
    return null; 
};

/**
 * @param key
 * @param data
 * @param ttlSeconds
 */
export const setCache = async (key: string, data: any, ttlSeconds: number = 3600) => {
    try {
        await redis.setex(key, ttlSeconds, JSON.stringify(data));
    } catch (error) {
        console.error(`[Redis Error] Failed to set ${key}:`, error);
    }
};

export const deleteCache = async (key: string) => {
    try {
        await redis.del(key);
    } catch (error) {
        console.error(`[Redis Error] Failed to delete ${key}:`, error);
    }
};
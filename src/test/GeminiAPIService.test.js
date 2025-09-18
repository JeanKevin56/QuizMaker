/**
 * Tests for GeminiAPIService
 */

import { GeminiAPIService, API_ERROR_TYPES } from '../services/GeminiAPIService.js';
import { EnvLoader } from '../utils/envLoader.js';

// Mock fetch for testing
global.fetch = jest.fn();

// Mock EnvLoader
jest.mock('../utils/envLoader.js', () => ({
  EnvLoader: {
    load: jest.fn(),
    get: jest.fn(),
    has: jest.fn(),
    getAll: jest.fn()
  }
}));

describe('GeminiAPIService', () => {
  let service;
  
  beforeEach(() => {
    service = new GeminiAPIService();
    fetch.mockClear();
    EnvLoader.load.mockClear();
    EnvLoader.get.mockClear();
  });

  describe('API Key Management', () => {
    test('should initialize API key from environment', async () => {
      const testKey = 'test-api-key-123';
      EnvLoader.load.mockResolvedValue({});
      EnvLoader.get.mockReturnValue(testKey);

      await service.initializeAPIKey();
      
      expect(service.apiKey).toBe(testKey);
      expect(EnvLoader.load).toHaveBeenCalled();
      expect(EnvLoader.get).toHaveBeenCalledWith('GEMINI_API_KEY');
    });

    test('should validate API key format', async () => {
      await expect(service.setAPIKey('')).rejects.toThrow('Invalid API key format');
      await expect(service.setAPIKey(null)).rejects.toThrow('Invalid API key format');
      await expect(service.setAPIKey(123)).rejects.toThrow('Invalid API key format');
    });

    test('should return API key status', () => {
      service.apiKey = 'test-key-123';
      const status = service.getAPIKeyStatus();
      
      expect(status.hasKey).toBe(true);
      expect(status.isValid).toBe(true);
      expect(status.keyPreview).toBe('test-key...');
    });

    test('should return empty status when no API key', () => {
      service.apiKey = null;
      const status = service.getAPIKeyStatus();
      
      expect(status.hasKey).toBe(false);
      expect(status.isValid).toBe(false);
      expect(status.keyPreview).toBe(null);
    });
  });

  describe('Request Handling', () => {
    beforeEach(() => {
      service.apiKey = 'test-api-key';
    });

    test('should reject requests without API key', async () => {
      service.apiKey = null;
      
      await expect(service.makeRequest({})).rejects.toThrow('API key not set');
    });

    test('should handle successful API response', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'Test response' }]
          }
        }]
      };

      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await service.makeRequest({ contents: [{ parts: [{ text: 'test' }] }] });
      
      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    test('should handle rate limiting', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({ error: { message: 'Rate limited' } })
      });

      await expect(service.makeRequest({})).rejects.toThrow('Rate limited');
      
      // Check that rate limit is set
      const queueStatus = service.getQueueStatus();
      expect(queueStatus.isRateLimited).toBe(true);
    });

    test('should handle network errors', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      await expect(service.makeRequest({})).rejects.toThrow();
    });

    test('should handle timeout errors', async () => {
      // Mock a request that takes too long
      fetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 35000))
      );

      await expect(service.makeRequest({})).rejects.toThrow('Request timeout');
    });
  });

  describe('Response Processing', () => {
    test('should extract text from valid response', () => {
      const response = {
        candidates: [{
          content: {
            parts: [
              { text: 'Hello ' },
              { text: 'world!' }
            ]
          }
        }]
      };

      const text = service.extractTextFromResponse(response);
      expect(text).toBe('Hello world!');
    });

    test('should validate response structure', () => {
      const validResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'test' }]
          }
        }]
      };

      const invalidResponse = { error: 'Invalid' };

      expect(service.isValidResponse(validResponse)).toBe(true);
      expect(service.isValidResponse(invalidResponse)).toBe(false);
    });

    test('should throw error for invalid response format', () => {
      const invalidResponse = { error: 'Invalid' };
      
      expect(() => service.extractTextFromResponse(invalidResponse))
        .toThrow('Invalid response format');
    });
  });

  describe('Queue Management', () => {
    beforeEach(() => {
      service.apiKey = 'test-key';
    });

    test('should get queue status', () => {
      const status = service.getQueueStatus();
      
      expect(status).toHaveProperty('queueLength');
      expect(status).toHaveProperty('isProcessing');
      expect(status).toHaveProperty('rateLimitUntil');
      expect(status).toHaveProperty('isRateLimited');
    });

    test('should clear queue', () => {
      // Add some mock items to queue
      service.requestQueue = [
        { reject: jest.fn() },
        { reject: jest.fn() }
      ];

      service.clearQueue();
      
      expect(service.requestQueue).toHaveLength(0);
    });

    test('should reset rate limit', () => {
      service.rateLimitUntil = Date.now() + 60000;
      service.resetRateLimit();
      
      expect(service.rateLimitUntil).toBe(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      service.apiKey = 'test-key';
    });

    test('should categorize HTTP errors correctly', async () => {
      const errorCases = [
        { status: 400, expectedType: API_ERROR_TYPES.INVALID_API_KEY },
        { status: 429, expectedType: API_ERROR_TYPES.RATE_LIMIT_EXCEEDED },
        { status: 403, expectedType: API_ERROR_TYPES.QUOTA_EXCEEDED },
        { status: 503, expectedType: API_ERROR_TYPES.SERVICE_UNAVAILABLE },
        { status: 500, expectedType: API_ERROR_TYPES.NETWORK_ERROR }
      ];

      for (const { status, expectedType } of errorCases) {
        fetch.mockResolvedValue({
          ok: false,
          status,
          statusText: 'Error',
          json: () => Promise.resolve({ error: { message: 'Test error' } })
        });

        try {
          await service.makeRequest({});
        } catch (error) {
          expect(error.type).toBe(expectedType);
        }
      }
    });

    test('should determine retry eligibility correctly', () => {
      const queueItem = { retryCount: 0 };
      
      // Should retry network errors
      const networkError = new Error('Network error');
      networkError.type = API_ERROR_TYPES.NETWORK_ERROR;
      expect(service.shouldRetryRequest(queueItem, networkError)).toBe(true);

      // Should not retry invalid API key
      const apiKeyError = new Error('Invalid API key');
      apiKeyError.type = API_ERROR_TYPES.INVALID_API_KEY;
      expect(service.shouldRetryRequest(queueItem, apiKeyError)).toBe(false);

      // Should not retry after max retries
      queueItem.retryCount = 5;
      expect(service.shouldRetryRequest(queueItem, networkError)).toBe(false);
    });
  });
});
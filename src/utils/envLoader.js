/**
 * Environment Variable Loader for Client-Side Applications
 * Loads environment variables from .env file for development
 */

/**
 * Load environment variables from .env file
 * This is a simple implementation for client-side development
 * In production, environment variables should be injected at build time
 */
export class EnvLoader {
  static envVars = {};
  static loaded = false;

  /**
   * Load environment variables
   * @returns {Promise<Object>} - Environment variables object
   */
  static async load() {
    if (this.loaded) {
      return this.envVars;
    }

    try {
      // Try to fetch .env file (only works in development)
      const response = await fetch('/.env');
      if (response.ok) {
        const envContent = await response.text();
        this.parseEnvContent(envContent);
      }
    } catch (error) {
      console.warn('Could not load .env file:', error);
    }

    this.loaded = true;
    return this.envVars;
  }

  /**
   * Parse .env file content
   * @param {string} content - .env file content
   * @private
   */
  static parseEnvContent(content) {
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // Parse key=value pairs
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmedLine.substring(0, equalIndex).trim();
        let value = trimmedLine.substring(equalIndex + 1).trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        this.envVars[key] = value;
      }
    }
  }

  /**
   * Get environment variable
   * @param {string} key - Variable name
   * @param {string} defaultValue - Default value if not found
   * @returns {string|null} - Variable value
   */
  static get(key, defaultValue = null) {
    return this.envVars[key] || defaultValue;
  }

  /**
   * Check if environment variable exists
   * @param {string} key - Variable name
   * @returns {boolean} - True if exists
   */
  static has(key) {
    return key in this.envVars;
  }

  /**
   * Get all environment variables
   * @returns {Object} - All environment variables
   */
  static getAll() {
    return { ...this.envVars };
  }
}
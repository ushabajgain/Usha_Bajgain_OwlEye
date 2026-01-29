/**
 * Location System Utilities for OwlEye Frontend
 * 
 * CRITICAL ARCHITECTURE RULE:
 * Frontend does NOT validate, enrich, or transform location data.
 * 
 * Single flow:
 * 1. Frontend: Capture raw GPS {lat, lng, timestamp}
 * 2. WebSocket: Send to backend
 * 3. Backend: Validate, enrich, store structured location_data
 * 
 * This file provides ONLY UI-level location display utilities.
 * All validation, enrichment, and authorization belongs in the backend.
 */

/**
 * ISO 3166-1 alpha-2 country codes and names
 * For UI display only - backend is the authority on location validation
 */
export const ISO_COUNTRIES = {
  NP: "Nepal",
  IN: "India",
  BD: "Bangladesh",
  PK: "Pakistan",
  US: "United States",
  GB: "United Kingdom",
  AU: "Australia",
  CA: "Canada",
  DE: "Germany",
  FR: "France",
  JP: "Japan",
  CN: "China",
  BR: "Brazil",
  ZA: "South Africa",
};

/**
 * Format coordinates for display
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string} Formatted coordinate string
 */
export const formatCoordinates = (lat, lng) => {
  if (lat === null || lng === null || lat === undefined || lng === undefined) {
    return "Location unavailable";
  }
  return `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`;
};

/**
 * Get country name from code
 * @param {string} countryCode - ISO country code
 * @returns {string} Country name or "Unknown"
 */
export const getCountryName = (countryCode) => {
  return ISO_COUNTRIES[countryCode?.toUpperCase()] || "Unknown";
};

/**
 * Format location for display
 * @param {object} locationData - Location object from backend
 * @returns {string} Display name or formatted coordinates
 */
export const formatLocation = (locationData) => {
  if (!locationData) return "Location unavailable";
  
  // Prefer backend-enriched display_name
  if (locationData.display_name) {
    return locationData.display_name;
  }
  
  // Fallback to coordinates
  return formatCoordinates(locationData.lat, locationData.lng);
};

/**
 * Validator for country codes
 */
export class CountryValidator {
  /**
   * @param {string} countryCode - Two-letter code
   * @returns {string} Validated country code (uppercase)
   * @throws {Error} If code is invalid
   */
  static validateCode(countryCode) {
    if (typeof countryCode !== "string") {
      throw new Error(
        `country_code must be string, got ${typeof countryCode}`
      );
    }

    countryCode = countryCode.toUpperCase().trim();

    if (countryCode.length !== 2) {
      throw new Error(
        `country_code must be exactly 2 characters, got '${countryCode}'`
      );
    }

    if (!/^[A-Z]{2}$/.test(countryCode)) {
      throw new Error(
        `country_code must contain only letters, got '${countryCode}'`
      );
    }

    if (!(countryCode in ISO_COUNTRIES)) {
      throw new Error(
        `country_code '${countryCode}' is not a valid ISO 3166-1 alpha-2 code`
      );
    }

    return countryCode;
  }

  /**
   * Get English country name from code
   * @param {string} countryCode
   * @returns {string} Full country name
   */
  static getCountryName(countryCode) {
    const code = CountryValidator.validateCode(countryCode);
    return ISO_COUNTRIES[code];
  }

  /**
   * Get country info by code
   * @param {string} countryCode
   * @returns {Object} {country_code, country_name}
   */
  static getByCode(countryCode) {
    const code = CountryValidator.validateCode(countryCode);
    return {
      country_code: code,
      country_name: ISO_COUNTRIES[code],
    };
  }
}

/**
 * Enforces the standard location schema
 */
export class LocationSchema {
  /**
   * Validate complete location object
   * @param {Object} location - Location data
   * @returns {Object} Validated and normalized location
   * @throws {Error} If validation fails
   */
  static validate(location) {
    if (!location || typeof location !== "object") {
      throw new Error(`Location must be object, got ${typeof location}`);
    }

    // Check required fields
    const required = ["country_code", "country_name", "location_id", "lat", "lng"];
    const missing = required.filter((field) => !(field in location));
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(", ")}`);
    }

    const validated = {};

    // Validate country
    validated.country_code = CountryValidator.validateCode(
      location.country_code
    );
    validated.country_name = CountryValidator.getCountryName(
      validated.country_code
    );

    // Verify country_name matches
    if (validated.country_name !== location.country_name) {
      throw new Error(
        `country_name mismatch: '${location.country_name}' does not match ` +
        `code '${validated.country_code}' which corresponds to '${validated.country_name}'`
      );
    }

    // Validate location ID
    validated.location_id = LocationIDValidator.validate(location.location_id);

    // Verify country code in location_id matches
    const idCountryCode = LocationIDValidator.extractCountryCode(
      validated.location_id
    );
    if (idCountryCode !== validated.country_code) {
      throw new Error(
        `location_id country '${idCountryCode}' does not match ` +
        `country_code '${validated.country_code}'`
      );
    }

    // Validate coordinates
    const [lat, lng] = CoordinateValidator.validate(location.lat, location.lng);
    validated.lat = lat;
    validated.lng = lng;

    // Validate or generate display_name
    if ("display_name" in location) {
      const displayName = String(location.display_name).trim();
      if (!displayName) {
        throw new Error("display_name cannot be empty");
      }
      validated.display_name = displayName;
    } else {
      validated.display_name = `${validated.country_name} (${validated.location_id})`;
    }

    return validated;
  }

  /**
   * Create a validated location object
   * @param {Object} params - {country_code, location_id, lat, lng, display_name?}
   * @returns {Object} Validated location
   */
  static create({
    country_code,
    location_id,
    lat,
    lng,
    display_name,
  }) {
    const country_name = CountryValidator.getCountryName(country_code);

    const location = {
      country_code,
      country_name,
      location_id,
      lat,
      lng,
    };

    if (display_name) {
      location.display_name = display_name;
    }

    return LocationSchema.validate(location);
  }
}

/**
 * Convert legacy location format to structured format
 * Used for backward compatibility with old API responses
 * @param {Object} legacyLocation - {lat, lng, location_name?, country_code?}
 * @returns {Object} Structured location
 */
export function convertLegacyLocation(legacyLocation) {
  const {
    lat,
    lng,
    location_name = null,
    country_code = "NP",
  } = legacyLocation;

  // Infer location_id from coordinates (simplified for frontend)
  const locationId = inferLocationId(lat, lng, country_code);

  return LocationSchema.create({
    country_code,
    location_id: locationId,
    lat,
    lng,
    display_name: location_name || undefined,
  });
}

/**
 * Infer location_id from coordinates
 * This is a simplified mapping for frontend use.
 * For production, should match backend's geocoding.
 * @param {number} lat
 * @param {number} lng
 * @param {string} countryCode
 * @returns {string} location_id
 */
function inferLocationId(lat, lng, countryCode) {
  // Simple mappings for Nepal (example)
  if (countryCode === "NP") {
    if (lat >= 27.7 && lat <= 27.72 && lng >= 85.3 && lng <= 85.35) {
      return "NP-KTM-05"; // Kathmandu Ward 5
    } else if (lat >= 27.6 && lat <= 27.8 && lng >= 85.2 && lng <= 85.4) {
      return "NP-KTM"; // Kathmandu
    } else {
      return "NP"; // Nepal
    }
  }

  return countryCode;
}

/**
 * Sanitize location_name to prevent XSS
 * @param {string} locationName
 * @returns {string} Sanitized location name
 */
export function sanitizeLocationName(locationName) {
  const div = document.createElement("div");
  div.textContent = locationName;
  return div.innerHTML;
}

/**
 * Format location for display
 * @param {Object} location - Structured location
 * @returns {string} Human-readable location string
 */
export function formatLocation(location) {
  if (!location || !location.display_name) {
    return "Unknown Location";
  }
  return location.display_name;
}

/**
 * Format coordinates for display
 * @param {number} lat
 * @param {number} lng
 * @param {number} decimals - Number of decimal places to show (default: 4)
 * @returns {string} Formatted coordinates
 */
export function formatCoordinates(lat, lng, decimals = 4) {
  return `${lat.toFixed(decimals)}, ${lng.toFixed(decimals)}`;
}

/**
 * Calculate distance between two points in kilometers
 * Uses Haversine formula
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number} Radians
 */
function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Check if location is within bounds
 * @param {Object} location - Structured location
 * @returns {boolean} True if location coordinates are valid
 */
export function isValidLocation(location) {
  try {
    if (!location) return false;
    LocationSchema.validate(location);
    return true;
  } catch {
    return false;
  }
}

/**
 * Hook for validating location data in React components
 * Usage: const {errors, validate} = useLocationValidator();
 */
export function useLocationValidator() {
  const [errors, setErrors] = require("react").useState([]);

  const validate = (location) => {
    try {
      LocationSchema.validate(location);
      setErrors([]);
      return true;
    } catch (error) {
      setErrors([error.message]);
      return false;
    }
  };

  return { errors, validate };
}

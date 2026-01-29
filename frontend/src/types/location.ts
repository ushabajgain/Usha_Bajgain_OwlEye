/**
 * TypeScript type definitions for OwlEye Location System
 * 
 * Usage:
 * import type { Location, LocationID, CountryCode } from './types/location';
 */

/**
 * ISO 3166-1 alpha-2 country code (e.g., "NP", "IN", "US")
 * Limited to known countries in the system
 */
export type CountryCode = 'NP' | 'IN' | 'BD' | 'PK' | 'US' | 'GB' | 'AU' | 'CA' | 'DE' | 'FR' | 'JP' | 'CN' | 'BR' | 'ZA';

/**
 * Hierarchical location ID format: CC-STATE-WARD
 * Examples:
 * - "NP" (country level)
 * - "NP-KTM" (city level)
 * - "NP-KTM-05" (ward level)
 */
export type LocationID = string & { readonly __brand: 'LocationID' };

/**
 * Standard Location Data Structure
 * 
 * This is the single source of truth for location format across the system.
 * All locations MUST conform to this structure.
 */
export interface Location {
  /**
   * ISO 3166-1 alpha-2 country code (immutable, used for database joins)
   * Example: "NP"
   */
  country_code: CountryCode;
  
  /**
   * Full English country name (immutable, used for compliance)
   * Example: "Nepal"
   */
  country_name: string;
  
  /**
   * Hierarchical location ID (immutable, used for analytics and routing)
   * Example: "NP-KTM-05"
   */
  location_id: LocationID;
  
  /**
   * Human-readable location name (UI only, never used for backend logic)
   * Example: "Ward 5, Kathmandu, Nepal"
   * Can be localized, derived from coordinates or user input
   */
  display_name: string;
  
  /**
   * Latitude coordinate (-90 to 90 degrees)
   * Precision: 6 decimals (±0.111 meters)
   */
  lat: number;
  
  /**
   * Longitude coordinate (-180 to 180 degrees)
   * Precision: 6 decimals (±0.111 meters)
   */
  lng: number;
}

/**
 * Legacy location format (for backward compatibility)
 * Should be converted to Location using convertLegacyLocation()
 */
export interface LegacyLocation {
  lat: number;
  lng: number;
  location_name?: string;
  country_code?: CountryCode;
}

/**
 * Location filter parameters for API queries
 */
export interface LocationFilter {
  country_code?: CountryCode;
  location_id?: LocationID;
  location_id_hierarchy?: LocationID;  // Includes all sub-locations
}

/**
 * Coordinates tuple
 */
export type Coordinates = [number, number];  // [lat, lng]

/**
 * Location validation error
 */
export class LocationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LocationValidationError';
  }
}

/**
 * API response for location operations
 */
export interface LocationResponse {
  success: boolean;
  location?: Location;
  message?: string;
  errors?: Record<string, string[]>;
  source?: 'structured' | 'legacy';
}

/**
 * Batch location validation request
 */
export interface BatchLocationRequest {
  locations: Location[];
}

/**
 * Batch location validation response
 */
export interface BatchLocationResponse {
  results: Array<{
    valid: boolean;
    location?: Location;
    errors?: Record<string, string[]>;
  }>;
}

/**
 * Utility function to create a branded LocationID type
 */
export function createLocationID(id: string): LocationID {
  return id as LocationID;
}

/**
 * Type guard to check if value is a valid Location
 */
export function isLocation(value: any): value is Location {
  return (
    typeof value === 'object' &&
    typeof value.country_code === 'string' &&
    typeof value.country_name === 'string' &&
    typeof value.location_id === 'string' &&
    typeof value.display_name === 'string' &&
    typeof value.lat === 'number' &&
    typeof value.lng === 'number'
  );
}

/**
 * Type guard to check if value is a valid LegacyLocation
 */
export function isLegacyLocation(value: any): value is LegacyLocation {
  return (
    typeof value === 'object' &&
    typeof value.lat === 'number' &&
    typeof value.lng === 'number'
  );
}

/**
 * React component props for location-aware components
 */
export interface LocationProps {
  location: Location | null;
  isLoading?: boolean;
  error?: string | null;
}

/**
 * React component props for location input
 */
export interface LocationInputProps {
  value?: Location | null;
  onChange?: (location: Location) => void;
  onError?: (error: string) => void;
  countryCode?: CountryCode;
  required?: boolean;
}

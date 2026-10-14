import type { LocationData, StructuredAddress } from '../types';
import { api } from './api';

export interface GeoCaptureResult {
  location?: LocationData;
  error?: string;
  errorCode?: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNSUPPORTED' | 'INSUFFICIENT_ACCURACY';
}

export async function getCurrentGPSLocation(
  maxAccuracyMeters: number = 50,
  timeoutMs: number = 15000,
  isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true
): Promise<GeoCaptureResult> {
  if (!navigator.geolocation) {
    return {
      error: 'Geolocation hardware or API is not supported on this device/browser.',
      errorCode: 'UNSUPPORTED',
    };
  }

  return new Promise((resolve) => {
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: timeoutMs,
      maximumAge: 10000, // Reject stale positions older than 10 seconds
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const accuracy = Math.round(position.coords.accuracy);
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));

        let structuredAddress: StructuredAddress = {
          formattedAddress: 'Location captured — address pending',
          provider: 'offline_pending',
          status: 'pending',
        };

        if (isOnline) {
          try {
            structuredAddress = await api.reverseGeocode(lat, lng);
          } catch (e) {
            console.warn('[Geo Service] Reverse geocoding failed or offline, marked pending:', e);
            structuredAddress = {
              formattedAddress: 'Location captured — address pending',
              provider: 'offline_pending',
              status: 'pending',
            };
          }
        }

        const loc: LocationData = {
          latitude: lat,
          longitude: lng,
          accuracy,
          capturedAt: new Date(position.timestamp).toISOString(),
          source: 'gps',
          isVerified: accuracy <= maxAccuracyMeters,
          addressApprox: structuredAddress.formattedAddress,
          structuredAddress,
        };

        if (accuracy > maxAccuracyMeters) {
          resolve({
            location: loc,
            error: `Reported accuracy (${accuracy}m) exceeds recommended threshold (${maxAccuracyMeters}m), but coordinate captured.`,
            errorCode: 'INSUFFICIENT_ACCURACY',
          });
        } else {
          resolve({ location: loc });
        }
      },
      (err) => {
        let code: GeoCaptureResult['errorCode'] = 'POSITION_UNAVAILABLE';
        let msg = 'Failed to acquire satellite or cellular positioning.';

        if (err.code === err.PERMISSION_DENIED) {
          code = 'PERMISSION_DENIED';
          msg = 'Location permission was denied. Please allow location access in your device/browser settings.';
        } else if (err.code === err.TIMEOUT) {
          code = 'TIMEOUT';
          msg = 'GPS satellite lock timed out. Try moving toward an open sky or window.';
        }

        resolve({
          error: msg,
          errorCode: code,
        });
      },
      options
    );
  });
}

/**
 * Resolve pending structured address for a location (called during sync or reconnect)
 */
export async function resolvePendingAddress(location: LocationData): Promise<LocationData> {
  if (location.structuredAddress?.status === 'resolved') {
    return location;
  }

  try {
    const resolved = await api.reverseGeocode(location.latitude, location.longitude);
    return {
      ...location,
      addressApprox: resolved.formattedAddress,
      structuredAddress: resolved,
    };
  } catch {
    return location;
  }
}

/**
 * Format coordinates as standard WKT for PostGIS:
 * ST_GeomFromText('POINT(longitude latitude)', 4326)
 */
export function toPostGisPoint(lat: number, lng: number): string {
  return `SRID=4326;POINT(${lng.toFixed(6)} ${lat.toFixed(6)})`;
}

/**
 * Calculate Great-Circle distance between two points in kilometers (Haversine)
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Backend API configuration
 * Uses NEXT_PUBLIC prefix so it's available on both client and server
 */
export const API_CONFIG = {
  BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5000',
} as const;


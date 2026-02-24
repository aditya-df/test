// Timeout configurations - all values in milliseconds

// Server-side timeout (backend API)
export const SERVER_TIMEOUT = parseInt(process.env.CHAT_RESPONSE_TIMEOUT || '600000');

// Client-side timeouts (frontend)
export const CLIENT_TIMEOUTS = {
  // Main response timeout (should match server)
  RESPONSE: parseInt(process.env.NEXT_PUBLIC_CHAT_RESPONSE_TIMEOUT || '600000'),
  
  // When to show manual "Finish Response" button
  MANUAL_FINISH: parseInt(process.env.NEXT_PUBLIC_CHAT_MANUAL_FINISH_TIMEOUT || '15000'),
  
  // When to auto-finish incomplete responses  
  AUTO_FINISH: parseInt(process.env.NEXT_PUBLIC_CHAT_AUTO_FINISH_TIMEOUT || '45000'),
  
  // When to detect message as finished in logic
  DETECTION: parseInt(process.env.NEXT_PUBLIC_CHAT_DETECTION_TIMEOUT || '30000'),
} as const;

// Helper to convert ms to seconds for logging
export const msToSeconds = (ms: number) => Math.round(ms / 1000);

// Validation - ensure timeouts make sense
if (CLIENT_TIMEOUTS.MANUAL_FINISH >= CLIENT_TIMEOUTS.DETECTION) {
  console.warn('⚠️ MANUAL_FINISH_TIMEOUT should be less than DETECTION_TIMEOUT');
}

if (CLIENT_TIMEOUTS.DETECTION >= CLIENT_TIMEOUTS.AUTO_FINISH) {
  console.warn('⚠️ DETECTION_TIMEOUT should be less than AUTO_FINISH_TIMEOUT');
}

if (CLIENT_TIMEOUTS.AUTO_FINISH >= CLIENT_TIMEOUTS.RESPONSE) {
  console.warn('⚠️ AUTO_FINISH_TIMEOUT should be less than RESPONSE_TIMEOUT');
}
import { handlers } from "@/auth.config"

// Export all supported HTTP methods for Auth.js
export const { GET, POST } = handlers

// Ensure runtime is set to nodejs for proper Auth.js functionality
export const runtime = 'nodejs'
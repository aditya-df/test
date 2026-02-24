/*eslint-disable @typescript-eslint/no-require-imports */
import { createVertex } from '@ai-sdk/google-vertex'

// Multi-region Vertex AI configuration
// Chat services use asia-southeast2, Image generation uses us-central1

// Chat services configuration (asia-southeast2)
export const vertexAiChat = createVertex({
  project: process.env.GOOGLE_PROJECT_ID as string,
  location: 'asia-southeast2', // Fixed region for chat services
  googleAuthOptions: {
    credentials: require('../docs/credentials.json'),
  },
})

// Image generation configuration (us-central1)
export const vertexAiImage = createVertex({
  project: process.env.GOOGLE_PROJECT_ID as string,
  location: 'us-central1', // Fixed region for image generation
  googleAuthOptions: {
    credentials: require('../docs/credentials.json'),
  },
})

// Default export for backward compatibility (uses original env variable)
export const vertexAi = createVertex({
  project: process.env.GOOGLE_PROJECT_ID as string,
  location: process.env.GOOGLE_LOCATION as string,
  googleAuthOptions: {
    credentials: require('../docs/credentials.json'),
  },
})
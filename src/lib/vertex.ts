/*eslint-disable @typescript-eslint/no-require-imports */
import { createVertex } from '@ai-sdk/google-vertex'
// import { createVertex } from '@ai-sdk/google-vertex/edge';


export const vertexAi = createVertex({
  project: process.env.GOOGLE_PROJECT_ID as string,
  location: process.env.GOOGLE_LOCATION as string,
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

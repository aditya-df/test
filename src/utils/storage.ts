/* eslint-disable @typescript-eslint/no-require-imports */
import { Storage } from "@google-cloud/storage";

export const storage = new Storage({
    projectId: process.env.GOOGLE_PROJECT_ID,
    credentials: require('../docs/credentials.json'),
})


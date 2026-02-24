export class Data {
  id?: string;
  name!: string;
  description!: string;
  credentialFile!: string | File;
  wikipediaAPIKey: string | null = null;
  weatherAPIKey: string | null = null;
  googleAPIKey: string | null = null;
  googleCSID: string | null = null;
  createdAt?: string;
  updatedAt?: string;
}

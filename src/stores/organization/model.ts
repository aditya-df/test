import { User } from "@prisma/client";

export class Data {
  id?: string;
  name!: string;
  email!: string;
  phone!: string;
  address!: string;
  user?: User;
}

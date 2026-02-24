// app/api/decrypt/route.ts (App Router)
import { NextResponse } from "next/server";
import crypto from "crypto";
import { fromBase64Url } from "@/utils/utils";

const SECRET = "my-shared-secret"; // must match client

function getKey(secret: string) {
  return crypto.createHash("sha256").update(secret).digest();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const json = JSON.parse(searchParams.get("data")!);

  const ivBuf = fromBase64Url(json.iv);
  const dataBuf = fromBase64Url(json.data);

  const key = getKey(SECRET);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, ivBuf);

  const decrypted = Buffer.concat([decipher.update(dataBuf), decipher.final()]);

  return NextResponse.json({ decrypted: JSON.parse(decrypted.toString()) });
}

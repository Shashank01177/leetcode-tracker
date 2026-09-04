import { LeetCode, Credential } from "leetcode-query";
import * as dotenv from "dotenv";

dotenv.config();

let _client: LeetCode | null = null;

async function buildClient(): Promise<LeetCode> {
  if (process.env.LEETCODE_SESSION) {
    const credential = new Credential();
    await credential.init(process.env.LEETCODE_SESSION);
    console.log("[LeetCode] Authenticated with session cookie.");
    return new LeetCode(credential);
  }
  console.log("[LeetCode] Using public (unauthenticated) access.");
  return new LeetCode();
}

export async function getLeetCodeClient(): Promise<LeetCode> {
  if (!_client) {
    _client = await buildClient();
  }
  return _client;
}

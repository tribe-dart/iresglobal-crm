import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import type { ScanCommandInput } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./aws";

export async function scanAll<T>(input: ScanCommandInput): Promise<T[]> {
  const items: NonNullable<Awaited<ReturnType<ScanCommand["resolveMiddleware"]>> extends never ? never : Record<string, unknown>[]> = [];
  let cursor = input.ExclusiveStartKey;
  do {
    const page = await docClient.send(new ScanCommand({ ...input, ExclusiveStartKey: cursor }));
    items.push(...(page.Items ?? []));
    cursor = page.LastEvaluatedKey;
  } while (cursor && Object.keys(cursor).length);
  return items as unknown as T[];
}

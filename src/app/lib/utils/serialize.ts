import { ObjectId } from 'mongodb';

export function serializeDocument<T = Record<string, unknown>>(doc: any): T {
  if (doc === null || doc === undefined) return doc;

  if (doc instanceof Date)   return doc.toISOString() as unknown as T;
  if (doc instanceof ObjectId) return doc.toString() as unknown as T;

  if (Array.isArray(doc)) {
    return doc.map(serializeDocument) as unknown as T;
  }

  if (typeof doc === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(doc)) {
      result[key] = serializeDocument(value);
    }
    return result as T;
  }

  return doc;
}
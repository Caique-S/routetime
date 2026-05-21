import { ObjectId } from 'mongodb';

/**
 * serialize.ts
 *
 * Converte documentos MongoDB para objetos JSON seguros,
 * transformando tipos não serializáveis (Date, ObjectId) em strings.
 *
 * Anteriormente definido inline em app/api/carregamento/route.ts.
 */

/**
 * Serializa recursivamente um documento MongoDB.
 *  - Date       → ISO string (UTC)
 *  - ObjectId   → string hexadecimal
 *  - Arrays     → mapeados recursivamente
 *  - Objetos    → percorridos recursivamente
 *  - null/undefined → mantidos como estão
 */
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
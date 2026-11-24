/**
 * Bytes on the wire per request, from CDP Network events.
 *
 * Chrome reports two different streams in Network.dataReceived:
 *  - body chunks: dataLength = DECODED bytes (after br/gzip), encodedDataLength = 0;
 *  - transfer-size updates: dataLength = 0, encodedDataLength = bytes on the wire.
 * Adding `encodedDataLength || dataLength` therefore summed decoded + encoded (a 72 KB
 * Brotli script counted as 72 + 229 = 301 KB), and taking max() with the final size kept
 * that sum. Here:
 *  - a finished request is exactly Network.loadingFinished.encodedDataLength (headers + body
 *    as transferred) — the authoritative number, same as DevTools' "Transferred";
 *  - a request still in flight is the response's header bytes plus the transfer-size updates
 *    so far; if Chrome sent none yet and the body is not content-encoded, decoded bytes ARE the
 *    wire bytes, so those are used. A compressed body with no transfer updates yet counts only
 *    its headers until it finishes (never the larger decoded size).
 */
export type Wire = { headerBytes: number; encoded: number; decoded: number; contentEncoded: boolean; final: number | null };

export const newWire = (): Wire => ({ headerBytes: 0, encoded: 0, decoded: 0, contentEncoded: false, final: null });

export function onResponse(w: Wire, encodedSoFar: number | undefined, contentEncoding: string | undefined): void {
  w.headerBytes = Math.max(0, encodedSoFar ?? 0);
  w.contentEncoded = !!contentEncoding && !/^identity$/i.test(contentEncoding.trim());
}

export function onData(w: Wire, dataLength: number | undefined, encodedDataLength: number | undefined): void {
  w.decoded += Math.max(0, dataLength ?? 0);
  w.encoded += Math.max(0, encodedDataLength ?? 0);
}

export function onFinished(w: Wire, encodedDataLength: number): void {
  w.final = Math.max(0, encodedDataLength);
}

export function wireBytes(w: Wire): number {
  if (w.final !== null) return w.final;
  if (w.encoded > 0) return w.headerBytes + w.encoded;
  return w.headerBytes + (w.contentEncoded ? 0 : w.decoded);
}

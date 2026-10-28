/** POST raw bytes to Storage. The secret is stripped from any error body. */
export async function putStorageBytes(
  request: { url: string; headers: Record<string, string> },
  body: Uint8Array,
  secret: string,
): Promise<void> {
  const payload = new ArrayBuffer(body.byteLength);
  new Uint8Array(payload).set(body);
  const response = await fetch(request.url, {
    method: 'POST',
    headers: request.headers,
    body: payload,
  });
  if (!response.ok) {
    const text = await response.text();
    const safe = secret ? text.split(secret).join('[redacted]') : text;
    throw new Error(`Storage ${response.status}: ${safe.slice(0, 300)}`);
  }
}

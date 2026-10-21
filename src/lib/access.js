export async function accessRequest(method = 'GET', pin, signal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 12000);
  try {
    const response = await fetch(new URL('api/access.php', document.baseURI).pathname, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: method === 'POST' ? JSON.stringify({ pin }) : undefined,
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(typeof data.error === 'string' ? data.error : 'Access could not be verified. Try again.');
      error.retryAfter = Number(data.retryAfter) || 0;
      throw error;
    }
    if (typeof data.authenticated !== 'boolean') throw new Error('The access service returned an invalid response.');
    return data.authenticated;
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError || error.name === 'AbortError') {
      throw new Error('The access service could not be reached. Your workspace remains locked.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

/** Thin API client: JSON errors, device header, upload helper. */

import { getDeviceId } from "../lib/device";

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function handle(res) {
  if (res.ok) {
    if (res.status === 204) return null;
    return res.json();
  }
  let code = "request_failed";
  let message = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    if (body?.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
    }
  } catch {
    /* non-JSON error body */
  }
  throw new ApiError(res.status, code, message);
}

function headers(extra = {}) {
  return { "X-Device-Id": getDeviceId(), ...extra };
}

export const api = {
  async get(path) {
    const res = await fetch(path, { headers: headers(), credentials: "same-origin" });
    return handle(res);
  },

  async post(path, body) {
    const res = await fetch(path, {
      method: "POST",
      headers: headers(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      credentials: "same-origin",
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
    return handle(res);
  },

  /** Upload an image (Blob or File) to /api/predict. */
  async predict(blob, onProgress) {
    // fetch has no upload progress; report a synthetic progress while waiting.
    onProgress?.(0.15);
    const form = new FormData();
    form.append("image", blob, "scan.jpg");
    onProgress?.(0.4);
    const res = await fetch("/api/predict", {
      method: "POST",
      headers: headers(),
      credentials: "same-origin",
      body: form,
    });
    onProgress?.(0.95);
    const data = await handle(res);
    onProgress?.(1);
    return data;
  },
};

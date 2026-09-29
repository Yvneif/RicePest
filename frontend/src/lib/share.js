/**
 * Share a scan result through the device share sheet (Messenger, SMS, etc.)
 * with graceful fallbacks to plain text sharing and clipboard copy.
 */

export async function shareScanResult({ label, confidence, imageUrl, blob }) {
  const pct = Math.round(confidence * 100);
  const text = `RicePest result: ${label} — ${pct}% confidence. Photo: ${imageUrl}`;

  try {
    if (blob && typeof navigator.canShare === "function") {
      const file = new File([blob], "scan.jpg", { type: blob.type || "image/jpeg" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return "shared";
      }
    }
    if (typeof navigator.share === "function") {
      await navigator.share({ title: "RicePest", text });
      return "shared";
    }
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch (err) {
    // Closing the share sheet is not an error.
    if (err?.name === "AbortError") return "cancelled";
    throw err;
  }
}

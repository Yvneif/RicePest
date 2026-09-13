import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Rear-camera access with graceful failure.
 * Returns { videoRef, ready, error, start, stop, snap, supported }.
 */
export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const supported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    !!window.isSecureContext;

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  const start = useCallback(async () => {
    if (!supported) {
      setError(new Error("Camera requires HTTPS or localhost."));
      return false;
    }
    try {
      stop();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setReady(true);
      setError(null);
      return true;
    } catch (err) {
      setError(err);
      setReady(false);
      return false;
    }
  }, [stop, supported]);

  /** Capture the current video frame as a JPEG blob. */
  const snap = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9));
  }, []);

  useEffect(() => stop, [stop]);

  return { videoRef, ready, error, supported, start, stop, snap };
}

/** On-device identification with TensorFlow.js.
 *
 * The compact model (3.8 MB) is served from /models and cached by the
 * service worker (CacheFirst), so after the first download identification
 * works with no internet at all. tfjs is imported dynamically so it never
 * touches the main bundle.
 */

let loadPromise = null;

export function onDeviceEnabledPref() {
  return localStorage.getItem("ricepest.onDevice") === "1";
}

export function setOnDeviceEnabledPref(on) {
  localStorage.setItem("ricepest.onDevice", on ? "1" : "0");
}

/** True once the model files are in the service-worker cache. */
export async function isModelCached() {
  try {
    const cache = await caches.open("tfjs-model-cache");
    const manifest = await cache.match("/models/manifest.json");
    if (!manifest) return false;
    const meta = await manifest.json();
    return Boolean(await cache.match(meta.url));
  } catch {
    return false;
  }
}

/**
 * Load (and cache) the on-device model.
 * @param {(fraction: number) => void} onProgress
 */
export function loadOnDeviceModel(onProgress) {
  if (!loadPromise) {
    loadPromise = (async () => {
      const tf = await import("@tensorflow/tfjs");
      const manifestRes = await fetch("/models/manifest.json");
      if (!manifestRes.ok) throw new Error("On-device model not available.");
      const manifest = await manifestRes.json();
      const model = await tf.loadLayersModel(manifest.url, { onProgress });
      return { tf, manifest, model };
    })().catch((err) => {
      loadPromise = null; // allow retry (e.g. after going back online)
      throw err;
    });
  }
  return loadPromise;
}

function loadImageElement(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/** Run identification fully on-device. Same shape as the /api/predict reply. */
export async function predictOnDevice(blob) {
  const { tf, manifest, model } = await loadOnDeviceModel();
  const img = await loadImageElement(blob);
  const input = tf.browser
    .fromPixels(img)
    .resizeBilinear([manifest.inputSize, manifest.inputSize])
    .toFloat()
    .expandDims(0);

  let probs;
  try {
    probs = model.predict(input);
    const values = Array.from(await probs.data());
    const best = Math.max(...values);
    const bestIdx = values.indexOf(best);

    let labels = manifest.labels;
    let adjusted = values;
    // The compact model has no trained "Unrecognized" class - a low best
    // probability maps there instead (threshold from the manifest).
    if (manifest.threshold && best < manifest.threshold) {
      labels = [...manifest.labels, "Unrecognized"];
      adjusted = [...values.map(() => 0), best];
    }
    const top3 = labels
      .map((label, i) => ({ label, prob: adjusted[i] }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 3)
      .map((t) => ({ label: t.label, prob: Math.round(t.prob * 10000) / 10000 }));

    return {
      label: labels[bestIdx] ?? "Unrecognized",
      confidence: Math.round(best * 10000) / 10000,
      top3,
      imageUrl: URL.createObjectURL(blob),
      offline: true,
      model: { version: `${manifest.version} (on-device)`, inputSize: manifest.inputSize },
    };
  } finally {
    input.dispose();
    probs?.dispose();
  }
}

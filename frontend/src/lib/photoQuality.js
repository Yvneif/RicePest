/**
 * Photo quality pre-check: warns the farmer before wasting an identify
 * attempt on a photo that is too dark, too bright, or blurry.
 * Non-blocking — the farmer can always continue anyway.
 */

/** Pure threshold logic, kept separate from canvas measurement so it stays testable. */
export function assessQuality({ meanLuma, blurScore }) {
  const issues = [];
  if (meanLuma < 55) issues.push("dark");
  else if (meanLuma > 215) issues.push("bright");
  if (blurScore < 20) issues.push("blurry");
  return { ok: issues.length === 0, issues };
}

const TAGALOG_MESSAGES = {
  dark: "Maitim ang litrato — subukan sa mas maliwanag na lugar.",
  bright: "Masyadong maliwanag — iwasan ang direktang sikat ng araw.",
  blurry: "Malabo ang litrato — humawak nang steady at lumapit nang bahagya.",
};

export function qualityMessage(issues) {
  return issues.map((issue) => TAGALOG_MESSAGES[issue]).join(" ");
}

/** Measure the photo on a small offscreen canvas and assess it. */
export async function checkPhotoQuality(blob) {
  try {
    const size = 128;
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, size, size);
    bitmap.close?.();
    const { data } = ctx.getImageData(0, 0, size, size);

    // Mean luminance (0 = black, 255 = white)
    const gray = new Float32Array(size * size);
    let sum = 0;
    for (let i = 0; i < size * size; i++) {
      const luma = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
      gray[i] = luma;
      sum += luma;
    }
    const meanLuma = sum / (size * size);

    // Variance of the Laplacian as a blur proxy: sharp photos score high,
    // out-of-focus ones stay near zero. Values shrink with resolution,
    // hence the small threshold on a 128px downscale.
    let lapSum = 0;
    let lapSumSq = 0;
    let n = 0;
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const i = y * size + x;
        const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - size] - gray[i + size];
        lapSum += lap;
        lapSumSq += lap * lap;
        n++;
      }
    }
    const lapMean = lapSum / n;
    const blurScore = lapSumSq / n - lapMean * lapMean;

    return { ...assessQuality({ meanLuma, blurScore }), meanLuma, blurScore };
  } catch {
    // Measurement is a nicety — never block the farmer on a failed check.
    return { ok: true, issues: [] };
  }
}

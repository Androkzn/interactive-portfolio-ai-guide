// Visual progress and Speed Index from the race's screencast frames, the way
// speedline (the library behind Lighthouse's Speed Index) computes them: compare
// colour histograms of each frame against the first and the last frame,
// ignoring near-white pixels, then integrate how much of the screen was still
// missing over time.

export type Histogram = [Uint32Array, Uint32Array, Uint32Array];

export function emptyHistogram(): Histogram {
  return [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
}

/** RGBA pixel data → per-channel histograms, skipping near-white pixels (r, g, b ≥ 249). */
export function histogram(rgba: Uint8ClampedArray | Uint8Array): Histogram {
  const hist = emptyHistogram();
  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
    if (r >= 249 && g >= 249 && b >= 249) continue;
    hist[0][r] += 1;
    hist[1][g] += 1;
    hist[2][b] += 1;
  }
  return hist;
}

/** speedline's calculateFrameProgress, as a 0–1 fraction. */
export function frameProgress(current: Histogram, initial: Histogram, target: Histogram): number {
  let total = 0;
  let match = 0;
  for (let channel = 0; channel < 3; channel += 1) {
    for (let value = 0; value < 256; value += 1) {
      const currentDiff = Math.abs(current[channel][value] - initial[channel][value]);
      const targetDiff = Math.abs(target[channel][value] - initial[channel][value]);
      match += Math.min(currentDiff, targetDiff);
      total += targetDiff;
    }
  }
  if (total === 0) return 1;
  return Math.floor((match / total) * 100) / 100;
}

export type ProgressPoint = { t: number; progress: number };

/**
 * Speed Index: the area above the visual-progress curve, from navigation start.
 * Each frame's progress holds until the next frame.
 */
export function speedIndex(points: ProgressPoint[]): number | null {
  const sorted = points.filter((point) => point.t >= 0).sort((a, b) => a.t - b.t);
  if (!sorted.length) return null;
  let index = 0;
  let lastT = 0;
  let lastProgress = 0;
  for (const point of sorted) {
    index += (point.t - lastT) * (1 - lastProgress);
    lastT = point.t;
    lastProgress = point.progress;
  }
  return Math.round(index);
}

/** Visually complete: the first moment progress reaches 100%. */
export function visuallyComplete(points: ProgressPoint[]): number | null {
  return points.filter((point) => point.t >= 0).sort((a, b) => a.t - b.t).find((point) => point.progress >= 1)?.t ?? null;
}

/**
 * Browser-only: decodes each frame (a data: URL), takes its histogram at a
 * reduced size, and returns the progress curve. Frames before navigation start
 * show about:blank, which is all white, so the initial histogram is empty.
 */
export async function progressFromFrames(frames: { t: number; src: string }[], sampleWidth = 120): Promise<ProgressPoint[]> {
  const usable = frames.filter((frame) => frame.t >= 0).sort((a, b) => a.t - b.t);
  if (!usable.length || typeof document === "undefined") return [];
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [];
  const histograms: Histogram[] = [];
  for (const frame of usable) {
    const image = new Image();
    image.src = frame.src;
    await image.decode();
    const height = Math.max(1, Math.round((image.naturalHeight / image.naturalWidth) * sampleWidth));
    canvas.width = sampleWidth;
    canvas.height = height;
    context.drawImage(image, 0, 0, sampleWidth, height);
    histograms.push(histogram(context.getImageData(0, 0, sampleWidth, height).data));
  }
  const initial = emptyHistogram();
  const target = histograms[histograms.length - 1];
  return usable.map((frame, index) => ({ t: frame.t, progress: frameProgress(histograms[index], initial, target) }));
}

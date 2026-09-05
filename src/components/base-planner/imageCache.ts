export const imageCache = new Map<string, HTMLImageElement>();
const loadingPromises = new Map<string, Promise<HTMLImageElement>>();
const failedIds = new Set<string>();

export function getCachedImage(id: string): HTMLImageElement | undefined {
  return imageCache.get(id);
}

/** True once `id` has failed to load — callers use this to stop retrying a missing per-level asset every redraw. */
export function hasFailed(id: string): boolean {
  return failedIds.has(id);
}

export function preloadImage(id: string, src: string): Promise<HTMLImageElement> {
  if (imageCache.has(id)) {
    return Promise.resolve(imageCache.get(id)!);
  }
  if (failedIds.has(id)) {
    return Promise.reject(new Error(`Image "${id}" previously failed to load`));
  }
  if (loadingPromises.has(id)) {
    return loadingPromises.get(id)!;
  }
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(id, img);
      loadingPromises.delete(id);
      resolve(img);
    };
    img.onerror = (e) => {
      loadingPromises.delete(id);
      failedIds.add(id);
      reject(e);
    };
  });
  loadingPromises.set(id, promise);
  return promise;
}

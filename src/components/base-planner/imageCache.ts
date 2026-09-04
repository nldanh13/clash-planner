export const imageCache = new Map<string, HTMLImageElement>();
const loadingPromises = new Map<string, Promise<HTMLImageElement>>();

export function getCachedImage(id: string): HTMLImageElement | undefined {
  return imageCache.get(id);
}

export function preloadImage(id: string, src: string): Promise<HTMLImageElement> {
  if (imageCache.has(id)) {
    return Promise.resolve(imageCache.get(id)!);
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
      reject(e);
    };
  });
  loadingPromises.set(id, promise);
  return promise;
}

import { getCachedImage, preloadImage, hasFailed } from "./imageCache";

/**
 * Resolves the uploaded image for a decoration, if the admin has added one
 * (`public/decorations/<id>.png` — see AdminImageManager). Decorations ship
 * with no bundled art of their own (see decorationCatalog.ts), only an
 * emoji glyph, so callers should keep drawing that glyph as a fallback when
 * this returns undefined — that isn't a loading state that will resolve on
 * its own, it may just mean no image was ever uploaded for this one.
 */
export function getDecorationImage(decorationId: string, onLoaded?: () => void): HTMLImageElement | undefined {
  const key = `deco::${decorationId}`;
  const cached = getCachedImage(key);
  if (cached) return cached;

  if (!hasFailed(key)) {
    preloadImage(key, `/decorations/${decorationId}.png`)
      .then(() => onLoaded?.())
      .catch(() => {});
  }
  return undefined;
}

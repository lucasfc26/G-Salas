export interface ImageVariantUrls {
  thumbnail: string;
  medium: string;
  original: string;
}

/**
 * Rebuilds the {thumbnail, medium, original} public URLs (roadmap Fase 15)
 * from the base storage key persisted on the entity — never store the
 * fully-qualified URLs, since the storage base URL can change per env.
 */
export function toImageVariantUrls(
  baseKey: string | null | undefined,
  publicUrlFor: (key: string) => string,
): ImageVariantUrls | null {
  if (!baseKey) {
    return null;
  }
  return {
    thumbnail: publicUrlFor(`${baseKey}/thumbnail.webp`),
    medium: publicUrlFor(`${baseKey}/medium.webp`),
    original: publicUrlFor(`${baseKey}/original.webp`),
  };
}

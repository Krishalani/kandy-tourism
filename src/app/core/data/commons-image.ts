import { GalleryImage, ImageCredit } from '../models/attraction.model';

/**
 * Builds a Wikimedia Commons thumbnail URL from a commons path such as
 * "e/eb/Some_File.jpg". Only standard thumbnail widths are served reliably.
 */
export function commonsImageUrl(path: string, width: 330 | 500 | 960 | 1280 = 960): string {
  const fileName = path.split('/').pop() ?? '';
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/${width}px-${fileName}`;
}

export function commonsCredit(path: string): ImageCredit {
  const fileName = path.split('/').pop() ?? '';
  return {
    label: 'Wikimedia Commons',
    sourceUrl: `https://commons.wikimedia.org/wiki/File:${fileName}`,
  };
}

export function commonsGalleryImage(path: string, alt: string): GalleryImage {
  return { url: commonsImageUrl(path), alt, credit: commonsCredit(path) };
}

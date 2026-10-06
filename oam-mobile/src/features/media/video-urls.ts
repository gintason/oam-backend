/**
 * Cloudinary video URLs that every phone can play.
 *
 * Phones record in formats other phones often can't play (iPhone .mov/HEVC on
 * Android, for example). Cloudinary converts on request: we ask for an H.264
 * MP4 first and fall back to the original file, plus a JPG frame as the poster.
 * Non-Cloudinary URLs are returned unchanged.
 */
const UPLOAD = "/video/upload/";

function isCloudinaryVideo(url: string) {
  return /^https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\//.test(url);
}

function withTransform(url: string, transform: string, ext: string) {
  const i = url.indexOf(UPLOAD) + UPLOAD.length;
  const rest = url.slice(i).replace(/\.[a-z0-9]+(\?.*)?$/i, "");
  return `${url.slice(0, i)}${transform}/${rest}.${ext}`;
}

/** Sources to try in order. */
export function videoSources(url: string): string[] {
  if (!isCloudinaryVideo(url)) return [url];
  return [withTransform(url, "vc_h264,q_auto,w_1280,c_limit", "mp4"), url];
}

export function videoPoster(url: string, given?: string | null): string | undefined {
  if (given) return given;
  if (!isCloudinaryVideo(url)) return undefined;
  return withTransform(url, "so_1,w_960,c_limit,q_auto", "jpg");
}

import { cloudinaryApi, cloudinaryUploadUrl } from 'src/api/cloudinary-api';
import { fileWithUrl } from 'src/composables/services/useServiceCreateEdit';

/**
 * Inyecta `f_auto,q_auto` (y opcionalmente `w_<width>`) en una URL de Cloudinary
 * para que el CDN sirva el formato y tamaño óptimos por dispositivo.
 *
 * https://cloudinary.com/documentation/image_optimization
 */
export function optimizeCloudinaryUrl(url: string | undefined, width?: number): string {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url || '';
  }
  const transforms = ['f_auto', 'q_auto'];
  if (width) transforms.push(`w_${width}`, 'c_limit');
  const transformPart = transforms.join(',');
  if (/\/upload\/(f_auto|q_auto|w_)/i.test(url)) return url;
  return url.replace('/upload/', `/upload/${transformPart}/`);
}

export function buildCloudinarySrcset(url: string | undefined, widths: number[] = [240, 480, 720, 1080]): string {
  if (!url || !url.includes('res.cloudinary.com')) return '';
  return widths.map((w) => `${optimizeCloudinaryUrl(url, w)} ${w}w`).join(', ');
}

interface CloudinarySign {
  signature: string;
  timestamp: string;
  cloudName: string;
  api_key: string;
  folder: string;
}

// UPLOAD IMAGES TO CLOUDINARY
export const uploadImageToCloudinary = async (
  image: fileWithUrl,
  sign: CloudinarySign
) => {
  const fd = new FormData();
  fd.append('file', image);
  fd.append('api_key', sign.api_key);
  fd.append('timestamp', sign.timestamp);
  fd.append('signature', sign.signature);
  fd.append('folder', sign.folder);
  const res = await fetch(cloudinaryUploadUrl(sign.cloudName), {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) throw new Error(`Cloudinary ${res.status}`);
  return res.json();
};

interface ImageUploadResult {
  url: string;
  publicId: string;
  isPrincipal: boolean;
  version: string;
}
export const prepareImagesForUpload = async (files: fileWithUrl[]) => {
  const { data: sign } = await cloudinaryApi.post('/cloudinary/sign');
  const imagesToUpload: ImageUploadResult[] = [];
  const promises: Promise<{
    secure_url: string;
    public_id: string;
    version: string;
  }>[] = [];
  files.forEach((img) => promises.push(uploadImageToCloudinary(img, sign)));
  const returners = await Promise.all(promises);

  const amountOfImages = files.length;
  const randomIndex = Math.floor(Math.random() * amountOfImages);
  returners.forEach((result, index) => {
    imagesToUpload.push({
      url: result.secure_url,
      publicId: result.public_id,
      isPrincipal: index === randomIndex,
      version: result.version,
    });
  });
  return imagesToUpload;
};

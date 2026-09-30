import { cloudinaryUploadUrl } from 'src/api/cloudinary-api';
import { adminServiceApi } from 'src/api/services-api';
import { fileWithUrl } from 'src/composables/services/useServiceCreateEdit';

// Las dos funciones de URL se mudaron a `cloudinaryUrl.ts`, que es puro: un
// componente que solo pinta una miniatura no tiene por qué arrastrar hasta aquí
// las instancias de Axios de la firma y la subida. Se reexportan para no romper
// a quien ya las importaba de este módulo.
export {
  optimizeCloudinaryUrl,
  buildCloudinarySrcset,
} from './cloudinaryUrl';

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
  // El endpoint /cloudinary/sign exige rol admin: se llama por el cliente
  // autenticado (adminServiceApi añade el Bearer del store), no por el público.
  const { data: sign } = await adminServiceApi.post('/cloudinary/sign');
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

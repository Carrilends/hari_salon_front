export const SALON_NAME = 'Peluquería Marlene';
export const SALON_PHONE = '+57 320 897 7471';
export const SALON_STREET = 'Carrera 3 #1-18';
export const SALON_LOCALITY = 'Sopó';
export const SALON_REGION = 'Cundinamarca';
export const SALON_COUNTRY = 'CO';
export const SALON_POSTAL = '251001';

export const SALON_ADDRESS = `${SALON_STREET}, ${SALON_LOCALITY}, ${SALON_REGION}`;

// Coordenadas de referencia para la zona centro de Sopó (dirección del salón).
export const SALON_LAT = 4.893144;
export const SALON_LNG = -73.953414;

const BBOX_DELTA = 0.0038;

const bboxLeft = (SALON_LNG - BBOX_DELTA).toFixed(6);
const bboxBottom = (SALON_LAT - BBOX_DELTA).toFixed(6);
const bboxRight = (SALON_LNG + BBOX_DELTA).toFixed(6);
const bboxTop = (SALON_LAT + BBOX_DELTA).toFixed(6);

export const MAPS_EMBED_URL = `https://www.openstreetmap.org/export/embed.html?bbox=${bboxLeft}%2C${bboxBottom}%2C${bboxRight}%2C${bboxTop}&layer=mapnik&marker=${SALON_LAT}%2C${SALON_LNG}`;

export const MAPS_EXTERNAL_URL = `https://www.google.com/maps/search/?api=1&query=${SALON_LAT}%2C${SALON_LNG}`;

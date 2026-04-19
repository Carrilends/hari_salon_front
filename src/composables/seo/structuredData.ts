/**
 * Generadores de objetos schema.org (JSON-LD) para inyectar via useSeo({ jsonLd }).
 * Mantenelos centralizados para reusarlos y validarlos facilmente con
 * https://search.google.com/test/rich-results
 */

const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') || '';
const BUSINESS_NAME = 'Peluquería Pecas';
const BUSINESS_PHONE = '+54 0000000000';
const BUSINESS_STREET = 'Av. Siempre Viva 123';
const BUSINESS_LOCALITY = 'Ciudad';
const BUSINESS_REGION = 'Provincia';
const BUSINESS_COUNTRY = 'AR';
const BUSINESS_POSTAL = '0000';

function url(path: string): string {
  if (!SITE_URL) return path;
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function hairSalonSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'HairSalon',
    '@id': url('/#business'),
    name: BUSINESS_NAME,
    url: SITE_URL || undefined,
    image: url('/icons/favicon-128x128.png'),
    telephone: BUSINESS_PHONE,
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS_STREET,
      addressLocality: BUSINESS_LOCALITY,
      addressRegion: BUSINESS_REGION,
      postalCode: BUSINESS_POSTAL,
      addressCountry: BUSINESS_COUNTRY,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '19:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Saturday',
        opens: '09:00',
        closes: '14:00',
      },
    ],
  };
}

export interface ServiceItem {
  name: string;
  description?: string;
  price?: number | string;
  currency?: string;
}

export function servicesSchema(items: ServiceItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Service',
        name: item.name,
        description: item.description,
        provider: {
          '@type': 'HairSalon',
          '@id': url('/#business'),
          name: BUSINESS_NAME,
        },
        ...(item.price !== undefined
          ? {
              offers: {
                '@type': 'Offer',
                price: item.price,
                priceCurrency: item.currency || 'ARS',
              },
            }
          : {}),
      },
    })),
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqPageSchema(items: FaqItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export interface ReviewItem {
  author: string;
  body: string;
  rating?: number;
  date?: string;
}

export function reviewsSchema(items: ReviewItem[]): Record<string, unknown> {
  const ratings = items
    .map((item) => item.rating)
    .filter((rating): rating is number => typeof rating === 'number');
  const aggregate =
    ratings.length > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: (ratings.reduce((acc, n) => acc + n, 0) / ratings.length).toFixed(1),
          reviewCount: ratings.length,
        }
      : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'HairSalon',
    '@id': url('/#business'),
    name: BUSINESS_NAME,
    ...(aggregate ? { aggregateRating: aggregate } : {}),
    review: items.map((item) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: item.author },
      reviewBody: item.body,
      ...(item.date ? { datePublished: item.date } : {}),
      ...(typeof item.rating === 'number'
        ? {
            reviewRating: {
              '@type': 'Rating',
              ratingValue: item.rating,
              bestRating: 5,
            },
          }
        : {}),
    })),
  };
}

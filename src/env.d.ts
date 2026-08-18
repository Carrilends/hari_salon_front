/* eslint-disable */

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    VUE_ROUTER_MODE: 'hash' | 'history' | 'abstract' | undefined;
    VUE_ROUTER_BASE: string | undefined;
  }
}

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_CLOUDINARY_CLOUD_NAME: string;
  readonly VITE_CLOUDINARY_UPLOAD_PRESET: string;
  readonly VITE_SITE_URL: string;
  // Fase 3b: client id público de Google Identity Services (viaja al navegador).
  readonly VITE_GOOGLE_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Google Identity Services, cargado desde el script del cliente (accounts.google.com/gsi/client).
interface Window {
  google?: {
    accounts: {
      id: {
        initialize(config: {
          client_id: string;
          callback: (response: { credential: string }) => void;
        }): void;
        renderButton(
          parent: HTMLElement,
          options: Record<string, unknown>
        ): void;
      };
    };
  };
}

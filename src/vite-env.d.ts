/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_STRIPE_PAYMENT_LINK?: string;
  readonly VITE_PREVIEW?: string;
  readonly VITE_SIGNUP_URL?: string;
  readonly VITE_META_PIXEL_ID?: string;
  readonly VITE_TIKTOK_PIXEL_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

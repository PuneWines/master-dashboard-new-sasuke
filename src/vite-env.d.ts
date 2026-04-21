/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAYTAPI_PRODUCT_ID: string
  readonly VITE_MAYTAPI_PHONE_ID: string
  readonly VITE_MAYTAPI_TOKEN: string
  readonly VITE_WHATSAPP_SEND_MESSAGE_ID: string
  readonly VITE_PURCHASE_MANAGEMENT_ID: string
  readonly VITE_MASTER_LOGIN_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

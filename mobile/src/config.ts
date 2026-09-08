import Constants from 'expo-constants';

// The mobile app always talks to the deployed backend over HTTPS. Override in
// development by setting EXPO_PUBLIC_API_BASE_URL (e.g. a LAN IP) if you run the
// server locally.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  'https://roundsahead.com/api';

// The marketing site origin — where the publicly hosted Privacy Policy and
// Terms of Service live. Both app stores require these to be reachable from
// inside the app. Derived from the API base so a dev/staging override carries.
export const WEB_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');
export const PRIVACY_URL = `${WEB_BASE_URL}/privacy`;
export const TERMS_URL = `${WEB_BASE_URL}/terms`;

// Google OAuth client IDs, created in the Google Cloud console (one per
// platform). The returned id_token's audience is the platform's client id, and
// the backend must allow it via GOOGLE_NATIVE_CLIENT_IDS. Until these are set,
// the Google button stays disabled. Set them via EXPO_PUBLIC_* or app.json extra.
const extra = Constants.expoConfig?.extra ?? {};
export const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ??
  (extra.googleIosClientId as string | undefined);
export const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ??
  (extra.googleAndroidClientId as string | undefined);
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  (extra.googleWebClientId as string | undefined);

// Google native sign-in is available once a usable client id exists.
export const googleNativeConfigured = Boolean(
  GOOGLE_IOS_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
);

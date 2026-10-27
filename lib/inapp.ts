/**
 * Google refuses OAuth inside embedded webviews, so a participant who opens
 * the link from LINE, Facebook or Instagram cannot sign in where they are.
 * We detect those user agents and offer a way out to the real browser.
 */
export type InAppBrowser = 'line' | 'facebook' | 'instagram';

const SIGNATURES: Array<{ app: InAppBrowser; pattern: RegExp }> = [
  // LINE sets "Line/x.y.z"; its mini-app frame reports LIFF.
  { app: 'line', pattern: /\bline\/[\d.]+|liff/i },
  // Instagram must be tested before Facebook: its webview carries both.
  { app: 'instagram', pattern: /\binstagram\b/i },
  // FBAN/FBAV cover the Facebook app, FB_IAB its in-app browser frame.
  { app: 'facebook', pattern: /\bfban\/|\bfbav\/|fb_iab|messenger/i },
];

export function detectInAppBrowser(userAgent: string | null | undefined): InAppBrowser | null {
  if (!userAgent) return null;
  for (const { app, pattern } of SIGNATURES) {
    if (pattern.test(userAgent)) return app;
  }
  return null;
}

export const IN_APP_BROWSER_LABEL: Record<InAppBrowser, string> = {
  line: 'LINE',
  facebook: 'Facebook',
  instagram: 'Instagram',
};

/**
 * LINE opens a link in the system browser when the URL carries
 * openExternalBrowser=1. Facebook and Instagram have no such parameter, so the
 * URL is returned unchanged and the UI tells the user to use the app's menu.
 */
export function externalBrowserUrl(url: string, app: InAppBrowser): string {
  if (app !== 'line') return url;

  const separator = url.includes('?') ? '&' : '?';
  return url.includes('openExternalBrowser=1') ? url : `${url}${separator}openExternalBrowser=1`;
}

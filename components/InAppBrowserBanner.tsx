import { IN_APP_BROWSER_LABEL, externalBrowserUrl, type InAppBrowser } from '@/lib/inapp';

/**
 * Google blocks OAuth inside embedded webviews, so sign-in simply cannot work
 * here. LINE can be told to hand the link to the system browser; Facebook and
 * Instagram cannot, so those users are pointed at the app's own menu.
 */
export function InAppBrowserBanner({ app, url }: { app: InAppBrowser; url: string }) {
  const label = IN_APP_BROWSER_LABEL[app];
  const canOpenDirectly = app === 'line';

  return (
    <div
      role="alert"
      className="flex flex-col gap-2.5 rounded-card border-2 border-science bg-science-soft p-4 text-science-text"
    >
      <div className="flex flex-col gap-1">
        <span className="font-heading text-[15px] font-medium">
          เปิดในเบราว์เซอร์ก่อนนะ
        </span>
        <span className="text-[13px] leading-relaxed">
          Google ไม่อนุญาตให้เข้าสู่ระบบจากในแอป {label}
          {canOpenDirectly ? ' กดปุ่มด้านล่างเพื่อเปิดในเบราว์เซอร์' : ' กดปุ่ม ••• มุมขวาบน แล้วเลือก “เปิดในเบราว์เซอร์”'}
        </span>
      </div>

      {canOpenDirectly ? (
        <a
          href={externalBrowserUrl(url, app)}
          className="flex min-h-touch items-center justify-center rounded-input bg-brown px-4 font-heading text-[15px] text-card no-underline hover:text-card"
        >
          เปิดในเบราว์เซอร์
        </a>
      ) : null}
    </div>
  );
}

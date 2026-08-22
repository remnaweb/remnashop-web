import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { BRAND_NAME } from "@/lib/format";
import TgWebAppTheme from "@/components/TgWebAppTheme";
import TelegramMiniAppBootstrap from "@/components/TelegramMiniAppBootstrap";
import ThemeRoot from "@/components/ThemeRoot";
import "./globals.css";
import "./mini-app-theme.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: `${BRAND_NAME} — кабинет`,
  description: "Личный кабинет VPN",
  appleWebApp: {
    capable: true,
    title: BRAND_NAME,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0b12",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.variable}>
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <Script id="tg-webapp-detect" strategy="beforeInteractive">
          {`(function(){try{var h=location.hash||"";if(h.charAt(0)==="#")h=h.slice(1);var p=new URLSearchParams(h);var d=p.get("tgWebAppData");if(d){try{sessionStorage.setItem("tg_init_data",d);}catch(e){}}var tg=window.Telegram&&window.Telegram.WebApp;if(tg&&tg.initData){try{sessionStorage.setItem("tg_init_data",tg.initData);}catch(e){}}if((tg&&(tg.initData||(tg.platform&&tg.platform!=="unknown")))||d){document.documentElement.classList.add("tg-webapp");}}catch(e){}})();`}
        </Script>
      </head>
      <body className={`${inter.className} min-h-screen`}>
        <TgWebAppTheme />
        <ThemeRoot />
        <TelegramMiniAppBootstrap />
        <div className="site-bg" aria-hidden>
          <div className="site-bg-grid" />
          <div className="site-bg-glow-tl" />
          <div className="site-bg-glow-tr" />
          <div className="site-bg-glow-bl" />
        </div>
        <div className="site-content min-h-screen">{children}</div>
      </body>
    </html>
  );
}

import type {ReactNode} from "react";
import {HeadContent, Outlet, Scripts, createRootRoute} from "@tanstack/react-router";
import {Toaster} from "@/components/ui/toaster";
import {Toaster as Sonner} from "@/components/ui/sonner";
import {TooltipProvider} from "@/components/ui/tooltip";
import {PLATFORM_META, PLATFORM_SCRIPTS} from "@/platform/scripts.gen";
import {HMR_CLIENT} from "@/platform/dev-hmr";
import NotFound from "@/pages/NotFound";
import appCss from "@/index.css?url";
import onest400 from "@fontsource/onest/400.css?url";
import onest500 from "@fontsource/onest/500.css?url";
import onest600 from "@fontsource/onest/600.css?url";
import onest700 from "@fontsource/onest/700.css?url";
import jb400 from "@fontsource/jetbrains-mono/400.css?url";
import jb500 from "@fontsource/jetbrains-mono/500.css?url";

const TITLE = "Рукоборец — программа для турниров по армрестлингу";
const DESCRIPTION =
    "Регистрация и взвешивание, жеребьёвка, сетка до двух поражений, пульт судьи, протоколы и табло для зала.";
const OG_IMAGE = "https://cdn.poehali.dev/projects/***/files/og-image-1792636897855.png";
const METRIKA = `(function (m, e, t, r, i, k, a) {
    m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments) };
    m[i].l = 1 * new Date();
    for (var j = 0; j < document.scripts.length; j++) { if (document.scripts[j].src === r) { return; } }
    k = e.createElement(t), a = e.getElementsByTagName(t)[0], k.async = 1, k.src = r, a.parentNode.insertBefore(k, a)
})(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
ym(101026698, "init", { trustedDomains: ["poehali.dev"], clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true, trackHash: true });`;

export const Route = createRootRoute({
    head: () => ({
        meta: [
            {charSet: "utf-8"},
            {name: "viewport", content: "width=device-width, initial-scale=1.0"},
            {title: TITLE},
            {name: "description", content: DESCRIPTION},
            {name: "author", content: "poehali.dev"},
            {property: "og:title", content: TITLE},
            {property: "og:description", content: DESCRIPTION},
            {property: "og:image", content: OG_IMAGE},
            {property: "og:image:width", content: "1360"},
            {property: "og:image:height", content: "768"},
            {name: "twitter:image", content: OG_IMAGE},
            ...PLATFORM_META,
        ],
        links: [
            {rel: "stylesheet", href: onest400},
            {rel: "stylesheet", href: onest500},
            {rel: "stylesheet", href: onest600},
            {rel: "stylesheet", href: onest700},
            {rel: "stylesheet", href: jb400},
            {rel: "stylesheet", href: jb500},
            {rel: "stylesheet", href: appCss},
            {rel: "icon", type: "image/png", href: "/favicon.png"},
        ],
        // IMPORTANT: DO NOT REMOVE PLATFORM SCRIPTS AND THE DEV HMR CLIENT!
        scripts: [
            ...(import.meta.env.DEV ? [{children: HMR_CLIENT}] : []),
            ...PLATFORM_SCRIPTS,
            {children: METRIKA},
        ],
    }),
    component: RootComponent,
    notFoundComponent: NotFound,
});

function RootComponent() {
    return (
        <RootDocument>
            <TooltipProvider>
                <Toaster/>
                <Sonner/>
                <Outlet/>
            </TooltipProvider>
        </RootDocument>
    );
}

function RootDocument({children}: { children: ReactNode }) {
    return (
        <html lang="ru">
        <head>
            <HeadContent/>
        </head>
        <body>
        {children}
        <Scripts/>
        </body>
        </html>
    );
}

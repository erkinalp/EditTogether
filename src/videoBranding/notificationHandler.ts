import { waitFor } from "../../maze-utils/src";
import { waitForElement } from "../../maze-utils/src/dom";
import { onMobile } from "../../maze-utils/src/pageInfo";
import { isOnInvidious } from "../../maze-utils/src/video";
import { getOriginalTitleElement } from "../titles/titleRenderer";
import { logError } from "../utils/logger";
import { BrandingLocation, replaceVideoCardBranding } from "./videoBranding";

let mutationObserver: MutationObserver | null = null;
async function onNotificationMenuOpened() {
    const notificationMenu = await waitForElement("ytd-multi-page-menu-renderer")!;

    if (mutationObserver) {
        mutationObserver.disconnect();
    } else {
        mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node instanceof HTMLElement) {
                            if (node.tagName.toLowerCase() === "ytd-notification-renderer") {
                                replaceNotificationBranding(node, BrandingLocation.Notification);
                            } else if (node.tagName.toLowerCase() === "ytd-comment-video-thumbnail-header-renderer") {
                                // At the top after clicking a notification about recieving a comment on a video
                                replaceNotificationBranding(node, BrandingLocation.NotificationTitle);
                            }
                        }
                    }
                }
            });
        });
    }

    mutationObserver.observe(notificationMenu, { childList: true, subtree: true });
}

function replaceNotificationBranding(notification: HTMLElement, brandingLocation: BrandingLocation) {
    // Only if this notification format is supported
    const originalTitle = getOriginalTitleElement(notification as HTMLElement, brandingLocation)?.textContent;
    const hasThumbnail = !!notification.querySelector(".thumbnail-container img");
    if (hasThumbnail) {
        const validTitle = brandingLocation === BrandingLocation.NotificationTitle
            || (originalTitle && notificationToTitle(originalTitle));
        replaceVideoCardBranding(notification as HTMLElement, brandingLocation, { dontReplaceTitle: !validTitle }).catch(logError);
    }
}

export async function setupNotificationHandler() {
    if (!onMobile() && !isOnInvidious()) {
        try {
            const notificationButton = await waitFor(() => document.querySelector("ytd-notification-topbar-button-renderer"), 20000, 500);
    
            if (notificationButton) {
                notificationButton.addEventListener("click", () => void(onNotificationMenuOpened()));
            }
        } catch (e) { } // eslint-disable-line no-empty
    }
}

const notificationFormats = [
    "$CHANNEL$ uploaded: $TITLE$",
    "$CHANNEL$ premiering now: $TITLE$",
    "$CHANNEL$ is live: $TITLE$",
    "Watch $CHANNEL$ live in 30 minutes: $TITLE$",
    "$CHANNEL$ premiering in 30 minutes: $TITLE$",
    "$CHANNEL$ latasi videon: $TITLE$",
    "$CHANNEL$ alotti livestriimin: $TITLE$",
    "$CHANNEL$ hat ein Video hochgeladen: $TITLE$",
    "$CHANNEL$ hat $TITLE$ hochgeladen",
    "$CHANNEL$ startet gerade die Premiere von $TITLE$",
    "$CHANNEL$ überträgt einen Livestream: $TITLE$",
    "$CHANNEL$ ha subido: $TITLE$",
    "$CHANNEL$ está emitiendo en directo: $TITLE$",
    "Na kanal $CHANNEL$ został przesłany film $TITLE$",
    "$CHANNEL$ laddade upp:? $TITLE$",
    "Na kanale $CHANNEL$ trwa premiera filmu: $TITLE$",
    "Har premiär nu på $CHANNEL$: $TITLE$",
    "$CHANNEL$ nadaje: $TITLE$",
    "Za 30 min na kanale $CHANNEL$ premiera filmu: $TITLE$",
    "Oglądaj transmisję na żywo „$TITLE$” na kanale $CHANNEL$ za 30 min",
    "$CHANNEL$ est en direct : $TITLE$",
    "$CHANNEL$ a mis en ligne $TITLE$",
    "Première en cours sur la chaîne $CHANNEL$ : $TITLE$",
];
const channelTemplate = "$CHANNEL$";
const titleTemplate = "$TITLE$";
function formatToRegex(format: string): RegExp {
    return new RegExp(format.replace(channelTemplate, "(.+)").replace(titleTemplate, "(.+)"), "i");
}
export function notificationToTitle(title: string): string {
    for (const format of notificationFormats) {
        const titleMatch = title.match(formatToRegex(format))?.[2];

        if (titleMatch) {
            return titleMatch;
        }        
    }

    return "";
}

export function titleToNotificationFormat(newTitle: string, originalTitle: string): string {
    for (const format of notificationFormats) {
        const titleMatch = originalTitle.match(formatToRegex(format))?.[2];

        if (titleMatch) {
            return originalTitle.replace(titleMatch, newTitle);
        }        
    }

    return "";
}
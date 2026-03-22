import { VideoID } from "../types";

/**
 * Check if the current page is a Udemy lecture page.
 */
export function isOnUdemy(): boolean {
    return window.location.hostname.endsWith("udemy.com");
}

/**
 * Extract a unique video ID from the Udemy lecture URL.
 * URL format: https://www.udemy.com/course/{courseSlug}/learn/lecture/{lectureId}
 * Returns a VideoID string like "udemy-{courseSlug}-{lectureId}"
 */
export function getUdemyVideoID(): VideoID | null {
    if (!isOnUdemy()) return null;

    const match = window.location.pathname.match(
        /\/course\/([^/]+)\/learn\/lecture\/(\d+)/
    );
    if (match) {
        return `udemy-${match[1]}-${match[2]}` as VideoID;
    }

    return null;
}

/**
 * Extract the course slug from the Udemy URL.
 */
export function getUdemyCourseSlug(): string | null {
    const match = window.location.pathname.match(/\/course\/([^/]+)/);
    return match ? match[1] : null;
}

/**
 * Extract the lecture ID from the Udemy URL.
 */
export function getUdemyLectureId(): string | null {
    const match = window.location.pathname.match(
        /\/course\/[^/]+\/learn\/lecture\/(\d+)/
    );
    return match ? match[1] : null;
}

/**
 * Find the Udemy video player element.
 * Udemy uses a standard HTML5 video element within their custom player.
 */
export function getUdemyVideoElement(): HTMLVideoElement | null {
    // Udemy's video player selectors - try multiple approaches
    const selectors = [
        // Main video player
        "video[data-purpose='video-player']",
        // Fallback: any video inside the lecture content area
        ".video-player--container--YDQRW video",
        ".video-viewer--container--WMEhk video",
        // Generic fallback for Udemy video
        "[class*='video-player'] video",
        "[class*='video-viewer'] video",
        // Last resort: any video on the page
        "video",
    ];

    for (const selector of selectors) {
        const video = document.querySelector(selector) as HTMLVideoElement;
        if (video && video.src) {
            return video;
        }
    }

    // Try finding any video element even without src (may use MediaSource)
    const allVideos = document.querySelectorAll("video");
    if (allVideos.length > 0) {
        return allVideos[0] as HTMLVideoElement;
    }

    return null;
}

/**
 * Find the Udemy player controls container for injecting UI elements.
 */
export function getUdemyControls(): HTMLElement | null {
    const selectors = [
        "[class*='control-bar--control-bar']",
        "[class*='video-controls']",
        ".video-player--container--YDQRW [class*='control-bar']",
        "[data-purpose='video-controls']",
    ];

    for (const selector of selectors) {
        const controls = document.querySelector(selector) as HTMLElement;
        if (controls) {
            return controls;
        }
    }

    return null;
}

/**
 * Find the Udemy progress bar element for attaching the preview bar.
 */
export function getUdemyProgressBar(): HTMLElement | null {
    const selectors = [
        "[class*='progress-bar--progress-bar']",
        "[data-purpose='video-progress-bar']",
        "[class*='control-bar'] [class*='progress']",
        ".video-player--container--YDQRW [role='slider']",
    ];

    for (const selector of selectors) {
        const progressBar = document.querySelector(selector) as HTMLElement;
        if (progressBar) {
            return progressBar;
        }
    }

    return null;
}

/**
 * Find the Udemy video player container for positioning overlay elements.
 */
export function getUdemyPlayerContainer(): HTMLElement | null {
    const selectors = [
        "[class*='video-player--container']",
        "[class*='video-viewer--container']",
        "[data-purpose='curriculum-item-viewer']",
    ];

    for (const selector of selectors) {
        const container = document.querySelector(selector) as HTMLElement;
        if (container) {
            return container;
        }
    }

    return null;
}

import Config from "./config";
import {
    ActionType,
    Category,
    CategorySkipOption,
    SegmentUUID,
    SponsorHideType,
    SponsorSourceType,
    SponsorTime,
    VideoID,
} from "./types";
import { waitFor } from "../maze-utils/src";
import { getUdemyVideoID, getUdemyVideoElement, getUdemyPlayerContainer, isOnUdemy } from "./utils/udemyUtils";
import { getSegmentsForVideo } from "./utils/segmentData";
import { getCategorySelection } from "./utils/skipRule";

if (isOnUdemy()) {
    initUdemyContentScript();
}

// The video element on the Udemy page
let video: HTMLVideoElement | null = null;
let currentVideoID: VideoID | null = null;

// Segment data
let sponsorTimes: SponsorTime[] = [];
let sponsorSkipped: boolean[] = [];

// Skip scheduling
let currentSkipSchedule: ReturnType<typeof setTimeout> | null = null;
let currentSkipInterval: ReturnType<typeof setInterval> | null = null;

// Completion-safe skip state
let originalPlaybackRate = 1;
let originalMuted = false;
let isInFastForwardSkip = false;
// The playback rate to use during completion-safe skipping
const FAST_FORWARD_RATE = 16;

// Preview bar element
let previewBarContainer: HTMLElement | null = null;

// Skip notice element
let skipNoticeContainer: HTMLElement | null = null;

async function initUdemyContentScript(): Promise<void> {
    // Wait for config to be ready
    await waitFor(() => Config.isReady(), 5000, 10);

    // Inject CSS variables for category colors
    setCategoryColorCSSVariables();

    // Watch for URL changes (Udemy is a SPA)
    observeUrlChanges();

    // Initial video setup
    await setupVideo();
}

function observeUrlChanges(): void {
    let lastUrl = window.location.href;

    // Use a MutationObserver on the title to detect SPA navigation
    const observer = new MutationObserver(() => {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            void handleUrlChange();
        }
    });

    observer.observe(document.querySelector("title") || document.head, {
        childList: true,
        subtree: true,
        characterData: true,
    });

    // Also listen for popstate events
    window.addEventListener("popstate", () => {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            void handleUrlChange();
        }
    });
}

async function handleUrlChange(): Promise<void> {
    const newVideoID = getUdemyVideoID();

    if (newVideoID !== currentVideoID) {
        // Clean up previous state
        cancelSkipSchedule();
        removePreviewBar();
        removeSkipNotice();
        restorePlaybackState();
        removeVideoListeners();

        sponsorTimes = [];
        sponsorSkipped = [];

        currentVideoID = newVideoID;

        if (newVideoID) {
            await setupVideo();
        }
    }
}

async function setupVideo(): Promise<void> {
    currentVideoID = getUdemyVideoID();
    if (!currentVideoID) return;

    // Wait for the video element to appear
    try {
        video = await waitFor(() => getUdemyVideoElement(), 10000, 200);
    } catch {
        console.warn("[EditTogether] Could not find Udemy video element");
        return;
    }

    if (!video) return;

    // Set up video event listeners
    setupVideoListeners();

    // Fetch segments for this video
    await sponsorsLookup();
}

function setupVideoListeners(): void {
    if (!video) return;

    // Remove any existing listeners first to prevent duplicates
    removeVideoListeners();

    video.addEventListener("seeked", onSeeked);
    video.addEventListener("play", onPlay);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("ratechange", onRateChange);
}

function removeVideoListeners(): void {
    if (!video) return;

    video.removeEventListener("seeked", onSeeked);
    video.removeEventListener("play", onPlay);
    video.removeEventListener("playing", onPlaying);
    video.removeEventListener("pause", onPause);
    video.removeEventListener("ratechange", onRateChange);
}

function onSeeked(): void {
    // Reschedule skips on seek
    if (!isInFastForwardSkip) {
        startSponsorSchedule();
    }
}

function onPlay(): void {
    startSponsorSchedule();
}

function onPlaying(): void {
    startSponsorSchedule();
}

function onPause(): void {
    cancelSkipSchedule();
}

function onRateChange(): void {
    // Only update the stored rate if we're not in a fast-forward skip
    if (!isInFastForwardSkip && video) {
        originalPlaybackRate = video.playbackRate;
    }
}

async function sponsorsLookup(): Promise<void> {
    if (!currentVideoID) return;

    const segmentData = await getSegmentsForVideo(currentVideoID, false);

    // Verify video hasn't changed while fetching
    if (currentVideoID !== getUdemyVideoID()) return;

    if (segmentData.status === 200 && segmentData.segments) {
        sponsorTimes = segmentData.segments;
        sponsorSkipped = new Array(sponsorTimes.length).fill(false);

        // Also load local/unsubmitted segments
        const unsubmitted = Config.local.unsubmittedSegments[currentVideoID];
        if (unsubmitted) {
            sponsorTimes = sponsorTimes.concat(unsubmitted);
            sponsorSkipped = sponsorSkipped.concat(new Array(unsubmitted.length).fill(false));
        }

        // Hide segments below minimum duration
        if (Config.config.minDuration !== 0) {
            for (const segment of sponsorTimes) {
                const duration = segment.segment[1] - segment.segment[0];
                if (duration > 0 && duration < Config.config.minDuration) {
                    segment.hidden = SponsorHideType.MinimumDuration;
                }
            }
        }

        createPreviewBar();
        startSponsorSchedule();
    }
}

/**
 * Schedule the next segment skip based on current video time.
 * Uses completion-safe skipping: mute + speed up instead of seeking.
 */
function startSponsorSchedule(): void {
    cancelSkipSchedule();

    if (!video || video.paused || Config.config.disableSkipping) return;

    const currentTime = video.currentTime;
    const playbackRate = isInFastForwardSkip ? FAST_FORWARD_RATE : video.playbackRate;

    // Check if we're currently inside a segment that should end the fast-forward
    if (isInFastForwardSkip) {
        const activeSegment = getActiveSegment(currentTime);
        if (!activeSegment) {
            // We've exited the segment, restore normal playback
            restorePlaybackState();
        }
    }

    // Find the next segment to skip
    const nextSegment = getNextSegment(currentTime);
    if (!nextSegment) return;

    const { segment, index } = nextSegment;
    const startTime = segment.segment[0];
    const endTime = segment.segment[1] as number;

    if (currentTime >= startTime && currentTime < endTime) {
        // We're inside a segment right now - start completion-safe skip
        beginCompletionSafeSkip(segment, index, endTime);
    } else if (currentTime < startTime) {
        // Schedule the skip for when we reach the segment
        const timeUntilSegment = (startTime - currentTime) / playbackRate;
        const msUntilSegment = timeUntilSegment * 1000;

        if (msUntilSegment < 300) {
            // Very close, use an interval for precision
            currentSkipInterval = setInterval(() => {
                if (!video || video.paused) {
                    cancelSkipSchedule();
                    return;
                }

                if (video.currentTime >= startTime) {
                    cancelSkipSchedule();
                    beginCompletionSafeSkip(segment, index, endTime);
                }
            }, 10);
        } else {
            // Schedule for later, with some buffer
            currentSkipSchedule = setTimeout(() => {
                startSponsorSchedule();
            }, Math.max(msUntilSegment - 200, 0));
        }
    }
}

/**
 * Get the segment that the current time falls within.
 */
function getActiveSegment(currentTime: number): SponsorTime | null {
    for (const segment of sponsorTimes) {
        if (segment.hidden !== SponsorHideType.Visible && segment.hidden !== undefined) continue;

        const selection = getCategorySelection(segment);
        if (selection.option === CategorySkipOption.Disabled) continue;

        const startTime = segment.segment[0];
        const endTime = segment.segment[1] as number;

        if (currentTime >= startTime && currentTime < endTime) {
            return segment;
        }
    }
    return null;
}

/**
 * Find the next segment that should be skipped after the current time.
 */
function getNextSegment(currentTime: number): { segment: SponsorTime; index: number } | null {
    let bestSegment: SponsorTime | null = null;
    let bestIndex = -1;
    let bestStartTime = Infinity;

    for (let i = 0; i < sponsorTimes.length; i++) {
        const segment = sponsorTimes[i];
        if (segment.hidden !== SponsorHideType.Visible && segment.hidden !== undefined) continue;

        const selection = getCategorySelection(segment);
        if (selection.option === CategorySkipOption.Disabled) continue;

        // Skip POI and Chapter action types - they don't need skipping
        if (segment.actionType === ActionType.Poi || segment.actionType === ActionType.Chapter) continue;

        const startTime = segment.segment[0];
        const endTime = segment.segment[1] as number;

        // Check if we're inside this segment or if it's upcoming
        if (currentTime < endTime && startTime < bestStartTime) {
            bestSegment = segment;
            bestIndex = i;
            bestStartTime = startTime;
        }
    }

    if (bestSegment) {
        return { segment: bestSegment, index: bestIndex };
    }

    return null;
}

/**
 * Completion-safe skip: Instead of seeking past the segment (which would
 * break Udemy's progress tracking), we mute the audio and speed up playback
 * to 16x so the segment plays through quickly while Udemy still records it
 * as watched.
 */
function beginCompletionSafeSkip(segment: SponsorTime, index: number, endTime: number): void {
    if (!video || isInFastForwardSkip) return;

    const selection = getCategorySelection(segment);
    const autoSkip = selection.option === CategorySkipOption.AutoSkip;

    if (segment.actionType === ActionType.Mute) {
        // For mute segments, just mute without speeding up
        if (!video.muted) {
            originalMuted = video.muted;
            video.muted = true;
        }

        // Schedule unmute at end of segment
        scheduleEndOfSegment(endTime, () => {
            if (video && !originalMuted) {
                video.muted = false;
            }
            // Schedule next segment
            startSponsorSchedule();
        });

        showSkipNotice(segment, "muted");
        return;
    }

    if (!autoSkip && selection.option !== CategorySkipOption.ManualSkip) {
        // Show overlay only
        showSkipNotice(segment, "overlay");
        // Continue to next segment
        startSponsorSchedule();
        return;
    }

    if (autoSkip) {
        // Completion-safe skip: mute + speed up
        isInFastForwardSkip = true;
        originalPlaybackRate = video.playbackRate;
        originalMuted = video.muted;

        video.muted = true;
        video.playbackRate = FAST_FORWARD_RATE;

        showSkipNotice(segment, "fast-forward");

        // Schedule restoration at end of segment
        scheduleEndOfSegment(endTime, () => {
            restorePlaybackState();

            if (!sponsorSkipped[index]) {
                sponsorSkipped[index] = true;
                const secondsSkipped = (segment.segment[1] as number) - segment.segment[0];
                Config.config.minutesSaved = Config.config.minutesSaved + secondsSkipped / 60;
                Config.config.skipCount = Config.config.skipCount + 1;
            }

            // Schedule next segment
            startSponsorSchedule();
        });
    } else {
        // Manual skip - show notice with button
        showSkipNotice(segment, "manual", () => {
            beginCompletionSafeSkip(segment, index, endTime);
        });
    }
}

/**
 * Schedule a callback for when the video reaches the end of a segment.
 */
function scheduleEndOfSegment(endTime: number, callback: () => void): void {
    cancelSkipSchedule();

    currentSkipInterval = setInterval(() => {
        if (!video) {
            cancelSkipSchedule();
            return;
        }

        if (video.currentTime >= endTime || video.paused) {
            cancelSkipSchedule();
            callback();
        }
    }, 50);
}

/**
 * Restore the video to its normal playback state after a completion-safe skip.
 */
function restorePlaybackState(): void {
    if (video && isInFastForwardSkip) {
        video.playbackRate = originalPlaybackRate;
        video.muted = originalMuted;
    }
    isInFastForwardSkip = false;
}

function cancelSkipSchedule(): void {
    if (currentSkipSchedule !== null) {
        clearTimeout(currentSkipSchedule);
        currentSkipSchedule = null;
    }
    if (currentSkipInterval !== null) {
        clearInterval(currentSkipInterval);
        currentSkipInterval = null;
    }
}

/**
 * Create a preview bar showing segment positions on the Udemy progress bar.
 */
function createPreviewBar(): void {
    removePreviewBar();

    if (!video || sponsorTimes.length === 0) return;

    const playerContainer = getUdemyPlayerContainer();
    if (!playerContainer) return;

    const duration = video.duration;
    if (!duration || isNaN(duration)) return;

    previewBarContainer = document.createElement("div");
    previewBarContainer.id = "sb-udemy-preview-bar";
    previewBarContainer.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 4px;
        z-index: 100;
        pointer-events: none;
    `;

    for (const segment of sponsorTimes) {
        if (segment.hidden !== SponsorHideType.Visible && segment.hidden !== undefined) continue;

        const selection = getCategorySelection(segment);
        if (selection.option === CategorySkipOption.Disabled) continue;

        const startPercent = (segment.segment[0] / duration) * 100;
        const endPercent = ((segment.segment[1] as number) / duration) * 100;

        const barColor = getCategoryColor(segment.category);

        const bar = document.createElement("div");
        bar.style.cssText = `
            position: absolute;
            left: ${startPercent}%;
            width: ${endPercent - startPercent}%;
            height: 100%;
            background-color: ${barColor};
            opacity: 0.7;
        `;
        bar.title = `${segment.category} (${formatTime(segment.segment[0])} - ${formatTime(segment.segment[1] as number)})`;

        previewBarContainer.appendChild(bar);
    }

    // Insert the preview bar relative to the player container
    const progressContainer = playerContainer.querySelector("[class*='progress-bar']") 
        || playerContainer.querySelector("[role='slider']")
        || playerContainer;
    
    if (progressContainer) {
        const parent = progressContainer.parentElement || playerContainer;
        parent.style.position = parent.style.position || "relative";
        parent.appendChild(previewBarContainer);
    }
}

function removePreviewBar(): void {
    if (previewBarContainer) {
        previewBarContainer.remove();
        previewBarContainer = null;
    }
}

/**
 * Show a skip notice overlay on the Udemy video player.
 */
function showSkipNotice(segment: SponsorTime, type: "muted" | "fast-forward" | "overlay" | "manual", onSkip?: () => void): void {
    removeSkipNotice();

    const playerContainer = getUdemyPlayerContainer();
    if (!playerContainer) return;

    skipNoticeContainer = document.createElement("div");
    skipNoticeContainer.id = "sb-udemy-skip-notice";
    skipNoticeContainer.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        z-index: 1000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        max-width: 400px;
    `;

    const categoryColor = getCategoryColor(segment.category);
    const categoryDot = document.createElement("span");
    categoryDot.style.cssText = `
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: ${categoryColor};
        flex-shrink: 0;
    `;

    const text = document.createElement("span");
    const categoryName = segment.category.charAt(0).toUpperCase() + segment.category.slice(1);

    switch (type) {
        case "fast-forward":
            text.textContent = `Skipping ${categoryName} (fast-forward)`;
            break;
        case "muted":
            text.textContent = `Muted ${categoryName}`;
            break;
        case "overlay":
            text.textContent = `${categoryName} segment`;
            break;
        case "manual":
            text.textContent = `${categoryName} segment - `;
            break;
    }

    skipNoticeContainer.appendChild(categoryDot);
    skipNoticeContainer.appendChild(text);

    if (type === "manual" && onSkip) {
        const skipButton = document.createElement("button");
        skipButton.textContent = "Skip";
        skipButton.style.cssText = `
            background: #00d400;
            color: white;
            border: none;
            padding: 4px 12px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 13px;
        `;
        skipButton.addEventListener("click", () => {
            removeSkipNotice();
            onSkip();
        });
        skipNoticeContainer.appendChild(skipButton);
    }

    const closeButton = document.createElement("button");
    closeButton.textContent = "\u00D7";
    closeButton.style.cssText = `
        background: none;
        color: white;
        border: none;
        padding: 0 4px;
        cursor: pointer;
        font-size: 18px;
        flex-shrink: 0;
    `;
    closeButton.addEventListener("click", () => {
        removeSkipNotice();
    });
    skipNoticeContainer.appendChild(closeButton);

    playerContainer.style.position = playerContainer.style.position || "relative";
    playerContainer.appendChild(skipNoticeContainer);

    // Auto-dismiss after a few seconds for non-manual notices
    if (type !== "manual") {
        const dismissTime = (Config.config.skipNoticeDuration || 4) * 1000;
        setTimeout(() => {
            if (skipNoticeContainer?.parentElement) {
                removeSkipNotice();
            }
        }, dismissTime);
    }
}

function removeSkipNotice(): void {
    if (skipNoticeContainer) {
        skipNoticeContainer.remove();
        skipNoticeContainer = null;
    }
}

/**
 * Get the color associated with a category.
 */
function getCategoryColor(category: Category): string {
    const barTypes = Config.config.barTypes;
    const key = category as string;
    if (barTypes[key]) {
        return barTypes[key].color;
    }

    // Default colors for common categories
    const defaults: Record<string, string> = {
        "sponsor": "#00d400",
        "selfpromo": "#ffff00",
        "interaction": "#cc00ff",
        "intro": "#00ffff",
        "outro": "#0202ed",
        "preview": "#008fd6",
        "filler": "#7300FF",
        "music_offtopic": "#ff9900",
    };

    return defaults[key] || "#ffffff";
}

/**
 * Format seconds to a readable time string (MM:SS or HH:MM:SS).
 */
function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
        return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Set CSS custom properties for category colors.
 */
function setCategoryColorCSSVariables(): void {
    const barTypes = Config.config.barTypes;
    for (const key in barTypes) {
        document.documentElement.style.setProperty(
            `--sb-category-${key}`,
            barTypes[key].color
        );
        document.documentElement.style.setProperty(
            `--sb-category-${key}-opacity`,
            barTypes[key].opacity
        );
    }
}

// Listen for messages from the popup/background script
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (!isOnUdemy()) return;

    switch (request.message) {
        case "isInfoFound":
            sendResponse({
                found: sponsorTimes.length > 0,
                status: 200,
                sponsorTimes: sponsorTimes.filter(
                    (segment) => getCategorySelection(segment).option !== CategorySkipOption.Disabled
                ),
                time: video?.currentTime ?? 0,
                onMobileYouTube: false,
                videoID: currentVideoID,
            });
            return true;
        case "sponsorStart":
            // Start creating a new segment
            if (video) {
                const currentTime = video.currentTime;
                const newSegment: SponsorTime = {
                    segment: [currentTime],
                    category: Config.config.defaultCategory || "sponsor" as Category,
                    actionType: ActionType.Skip,
                    UUID: ("udemy-local-" + Date.now()) as SegmentUUID,
                    source: SponsorSourceType.Local,
                };
                
                const unsubmitted = Config.local.unsubmittedSegments[currentVideoID] || [];
                
                // Check if there's an incomplete segment (only start time)
                const incomplete = unsubmitted.find(s => s.segment.length === 1);
                if (incomplete) {
                    // Complete the segment with end time
                    incomplete.segment = [incomplete.segment[0], currentTime];
                } else {
                    // Start a new segment
                    unsubmitted.push(newSegment);
                }
                
                Config.local.unsubmittedSegments[currentVideoID] = unsubmitted;
                Config.forceLocalUpdate("unsubmittedSegments");

                sendResponse({ creatingSegment: !incomplete });
            }
            return true;
        case "refreshSegments":
            sendResponse({ hasVideo: !!currentVideoID });
            if (currentVideoID) {
                void sponsorsLookup();
            }
            return true;
        case "update":
            void handleUrlChange();
            sendResponse({});
            return true;
    }
});

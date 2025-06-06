import * as CompileConfig from "../../config.json";

export function logError(error: unknown): void {
    console.error("[CB]", error);
}

export function logWarn(...text: unknown[]): void {
    console.warn("[CB]", ...text);
}

export function logDebug(...text: unknown[]): void {
    if (CompileConfig.debug) {
        console.log("[CB]", ...text);
    }
}

export function log(...text: unknown[]): void {
    if (CompileConfig.debug) {
        console.log(...text);
    } else {
        window["CBLogs"] ??= [];
        window["CBLogs"].push({
            time: Date.now(),
            text
        });

        if (window["CBLogs"].length > 100) {
            window["CBLogs"].shift();
        }
    }
}

export function serializeOrStringify(e: unknown): string {
    if (e instanceof Error) return e.stack || e.message || String(e);
    try {
        if (typeof e === "object") return JSON.stringify(e);
    } catch (err) {
        return String(err);
    }
    return String(e);
}

export function logRequest(response: { status: number; ok: boolean; responseText?: string; headers?: Record<string, string> | null }, prefix = "SB", action = "request"): void {
    try {
        // eslint-disable-next-line no-console
        console.warn(`[${prefix}] Non-OK ${action}: status=${response.status} ok=${response.ok}`, response.responseText);
    } catch (_err) {
        void _err;
    }
}

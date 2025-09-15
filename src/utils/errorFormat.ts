export function formatJSErrorMessage(e: unknown): string {
    try {
        if (e instanceof Error) return e.message || String(e);
        if (typeof e === "object") return JSON.stringify(e);
    } catch (err) {
        return String(err);
    }
    return String(e);
}

export function getLongErrorMessage(status: number, responseText?: string): string {
    let base = `Error ${status}`;
    if (responseText) base += `: ${responseText}`;
    return base;
}

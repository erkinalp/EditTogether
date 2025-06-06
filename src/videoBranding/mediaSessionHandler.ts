export function setMediaSessionTitle(title: string) {
    if (!title) return;

    if ("mediaSession" in navigator) {
        if (navigator.mediaSession.metadata?.title !== title) {
            setMediaSessionInfo({
                title: title
            });
        }
    }
}

export function setMediaSessionThumbnail(url: string) {
    if ("mediaSession" in navigator) {
        setMediaSessionInfo({
            artwork: [{
                src: url
            }]
        });
    }
}

function setMediaSessionInfo(data: MediaMetadataInit) {
    window.postMessage({
        source: "edittogether-media-session",
        data
    }, "/");
}


export function resetMediaSessionThumbnail() {
    window.postMessage({
        source: "edittogether-reset-media-session-thumbnail"
    }, "/");
}

import { VideoID } from "../../maze-utils/src/video";
import Config from "./config";

const countedTitles = new Set<VideoID>();
const countedThumbnails = new Set<VideoID>();

export function countTitleReplacement(videoID: VideoID) {
    if (Config.config!.countReplacements && !countedTitles.has(videoID)) {
        countedTitles.add(videoID);

        Config.config!.titleReplacements++;

        if (countedTitles.size >= 500) {
            for (const id of countedTitles) {
                countedTitles.delete(id);
                break;
            }
        }
    }
}

export function countThumbnailReplacement(videoID: VideoID) {
    if (Config.config!.countReplacements && !countedThumbnails.has(videoID)) {
        countedThumbnails.add(videoID);

        Config.config!.thumbnailReplacements++;

        if (countedThumbnails.size >= 500) {
            for (const id of countedThumbnails) {
                countedThumbnails.delete(id);
                break;
            }
        }
    }
}
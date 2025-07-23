import { BrandingUUID } from "../videoBranding/videoBranding";
import { getYouTubeTitleNode } from "../../maze-utils/src/elements"

export interface TitleSubmission {
    title: string;
    original: boolean;
}

export interface TitleResult extends TitleSubmission {
    votes: number;
    locked: boolean;
    UUID: BrandingUUID;
}

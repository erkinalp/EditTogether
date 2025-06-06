import Config from "../config/config";

export function showDonationLink(): boolean {
    return navigator.vendor !== "Apple Computer, Inc." && Config.config!.showDonationLink;
}

export function shouldStoreVotes(): boolean {
    return Config.config!.keepUnsubmitted 
        && (!chrome.extension.inIncognitoContext || Config.config!.keepUnsubmittedInPrivate);
}

import { FetchResponse, sendRequestToCustomServer } from "../../maze-utils/src/background-request-proxy";
import Config from "../config/config";

export function asyncRequestToServer(type: string, url: string, data = {}, headers = {}): Promise<FetchResponse> {
    return sendRequestToCustomServer(type, Config.config!.serverAddress + url, data, headers);
}

export function sendRequestToServer(type: string, url: string, data = {}, headers = {}): Promise<FetchResponse> {
    return sendRequestToCustomServer(type, Config.config!.serverAddress + url, data, headers);
}

import * as React from "react";
import Config from "../config/config";
import { showDonationLink } from "../utils/configUtils";
import { YourWorkComponent } from "./YourWorkComponent";
import { ToggleOptionComponent } from "./ToggleOptionComponent";
import { FormattingOptionsComponent } from "./FormattingOptionsComponent";
import { isSafari } from "../../maze-utils/src/config";


import { FormattedText } from "./FormattedTextComponent";

export enum LoadingStatus {
    Loading,
    Loaded,
    Failed,
    SegmentsFound,
    NoSegmentsFound
}

export const PopupComponent = () => {
    const [status] = React.useState<LoadingStatus>(LoadingStatus.NoSegmentsFound);
    const [extensionEnabled, setExtensionEnabled] = React.useState(Config.config!.extensionEnabled);
    const [replaceTitles, setReplaceTitles] = React.useState(Config.config!.replaceTitles);
    const [replaceThumbnails, setReplaceThumbnails] = React.useState(Config.config!.replaceThumbnails);
    const [titleFormatting, setTitleFormatting] = React.useState(Config.config!.titleFormatting);

    return (
        <>
            <header className="sbPopupLogo">
                <img src="icons/pencil.svg" alt="EditTogether Logo" width="40" height="40" id="edittogetherPopupLogo"/>
                <p className="u-mZ">
                    <FormattedText
                        text="EditTogether"
                        titleFormatting={titleFormatting}
                    />
                </p>
            </header>

            <p id="videoFound" className="u-mZ grey-text">
                {getVideoStatusText(status)}
            </p>

            {
                <>
                    {/* Toggle Box */}
                    <div className="sbControlsMenu">
                        {/* github: mbledkowski/toggle-switch */}
                        <label id="disableExtension" htmlFor="toggleSwitch" className="toggleSwitchContainer sbControlsMenu-item">
                        <span className="toggleSwitchContainer-switch">
                            <input type="checkbox" 
                                style={{ "display": "none" }} 
                                id="toggleSwitch" 
                                checked={extensionEnabled}
                                onChange={(e) => {
                                    Config.config!.extensionEnabled = e.target.checked;
                                    setExtensionEnabled(e.target.checked)
                                }}/>
                            <span className="switchBg shadow"></span>
                            <span className="switchBg white"></span>
                            <span className="switchBg blue"></span>
                            <span className="switchDot"></span>
                        </span>
                        <span id="disableSkipping" className={extensionEnabled ? " hidden" : ""}>
                            <FormattedText
                                langKey="disable"
                                titleFormatting={titleFormatting}
                            />
                        </span>
                        <span id="enableSkipping" className={!extensionEnabled ? " hidden" : ""}>
                            <FormattedText
                                langKey="Enable"
                                titleFormatting={titleFormatting}
                            />
                        </span>
                        </label>
                        <button id="optionsButton" 
                            className="sbControlsMenu-item" 
                            title={chrome.i18n.getMessage("Options")}
                            onClick={() => {
                                chrome.runtime.sendMessage({ "message": "openConfig" });
                            }}>
                        <img src="/icons/settings.svg" alt="Settings icon" width="23" height="23" className="sbControlsMenu-itemIcon" id="sbPopupIconSettings" />
                            <FormattedText
                                langKey="Options"
                                titleFormatting={titleFormatting}
                            />
                        </button>
                    </div>

                    {/* Replace titles/thumbnails */}
                    <ToggleOptionComponent
                        id="replaceTitles"
                        onChange={(value) => {
                            setReplaceTitles(value);
                            Config.config!.replaceTitles = value;
                        }}
                        value={replaceTitles}
                        label={chrome.i18n.getMessage("replaceTitles")}
                        titleFormatting={titleFormatting}
                    />

                    <ToggleOptionComponent
                        id="replaceThumbnails"
                        style={{
                            paddingTop: "15px"
                        }}
                        onChange={(value) => {
                            setReplaceThumbnails(value);
                            Config.config!.replaceThumbnails = value;
                        }}
                        value={replaceThumbnails}
                        label={chrome.i18n.getMessage("replaceThumbnails")}
                        titleFormatting={titleFormatting}
                    />

                    <FormattingOptionsComponent
                        titleFormatting={titleFormatting}
                        setTitleFormatting={setTitleFormatting}
                    />

                    {/* Your Work box */}
                    <YourWorkComponent titleFormatting={titleFormatting}/>
                </>
            }

            {/* Footer */}
            <footer id="sbFooter">
                <a id="helpButton"
                    onClick={() => {
                        chrome.runtime.sendMessage({ "message": "openHelp" });
                    }}>
                        <FormattedText
                            langKey="help"
                            titleFormatting={titleFormatting}
                        />
                </a>
                <a href="https://github.com/erkinalp/EditTogether" target="_blank" rel="noreferrer">
                    <FormattedText
                        langKey="website"
                        titleFormatting={titleFormatting}
                    />
                </a>
                <a href="https://github.com/erkinalp/EditTogether" target="_blank" rel="noreferrer" className={isSafari() ? " hidden" : ""}>
                    <FormattedText
                        langKey="viewLeaderboard"
                        titleFormatting={titleFormatting}
                    />
                </a>
                <a href="https://github.com/erkinalp/EditTogether" target="_blank" rel="noreferrer" className={!showDonationLink() ? " hidden" : ""}>
                    <FormattedText
                        langKey="Donate"
                        titleFormatting={titleFormatting}
                    />
                </a>
                <br />
                <a href="https://github.com/erkinalp/EditTogether" target="_blank" rel="noreferrer">
                    <FormattedText
                        text="GitHub"
                        titleFormatting={titleFormatting}
                    />
                </a>
                <a href="https://matrix.to/#/#edittogether:matrix.org" target="_blank" rel="noreferrer">
                    <FormattedText
                        text="Matrix"
                        titleFormatting={titleFormatting}
                    />
                </a>
            </footer>


        </>
    );
};

function getVideoStatusText(status: LoadingStatus): string {
    switch (status) {
        case LoadingStatus.Loading:
            return chrome.i18n.getMessage("Loading");
        case LoadingStatus.SegmentsFound:
            return chrome.i18n.getMessage("sponsorFound");
        case LoadingStatus.NoSegmentsFound:
            return chrome.i18n.getMessage("sponsor404");
        case LoadingStatus.Failed:
            return chrome.i18n.getMessage("connectionError");
        case LoadingStatus.Loaded:
            return chrome.i18n.getMessage("sponsor404");
    }
}

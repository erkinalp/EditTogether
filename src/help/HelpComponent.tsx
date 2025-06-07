import * as React from "react";
import Config from "../config/config";
import { CasualChoiceComponent } from "../options/CasualChoiceComponent";

export const HelpComponent = () => {

    return (
        <>
            <div id="title">
                <img src="icons/logo-256.png" height="80" className="profilepic" />
                <span id="titleText">
                    EditTogether
                </span>
            </div>

            <div className="container editTogetherPageBody">

                <p className="createdBy">
                    <img src="https://ajay.app/newprofilepic.jpg" height="30" className="profilepiccircle" />
                    {chrome.i18n.getMessage("createdBy")}{" "}<a href="https://ajay.app">Ajay Ramachandran</a>
                </p>



                <p>
                    {chrome.i18n.getMessage("termsAgreement").split("{privacy-policy}")[0]}
                    <a href="https://gist.github.com/ajayyy/9bfec83d57ea34f5182658ec8445aa9d" target="_blank" rel="noreferrer">{chrome.i18n.getMessage("privacyPolicy")}</a>
                    {chrome.i18n.getMessage("termsAgreement").split("{privacy-policy}")[1].split("{terms}")[0]} 
                    <a href="https://gist.github.com/ajayyy/9e8100f069348e0bc062641f34d6af12" target="_blank" rel="noreferrer">{chrome.i18n.getMessage("termsOfUse")}</a>.{" "}
                </p>

                {
                    Config.config!.importedConfig ? 
                    <p>
                        {chrome.i18n.getMessage("editTogetherHelpEditTogetherImported")}
                    </p>
                    : null
                }


                <p style={{marginBottom: 0, marginTop: 0}} className="center">
                    {chrome.i18n.getMessage("helpPageReviewOptions")}
                </p>

                <CasualChoiceComponent />

                <iframe className="optionsFrame" src="../options/options.html#embed" style={{border: "none"}}></iframe>

                <h1>
                    {chrome.i18n.getMessage("howItWorks")}
                </h1>

                <p>
                    Please see <a href="https://github.com/erkinalp/EditTogether" target="_blank" rel="noreferrer">https://github.com/erkinalp/EditTogether</a> for more information.
                </p>

                <h1>
                    {chrome.i18n.getMessage("Credits")}
                </h1>

                <p>
                    Thanks to all <a href="https://github.com/erkinalp/EditTogether/graphs/contributors" target="_blank" rel="noreferrer">EditTogether contributors</a>,{" "}
                    <a href="https://github.com/ajayyy/SponsorBlock/graphs/contributors" target="_blank" rel="noreferrer">SponsorBlock contributors</a>,{" "}
                    <a href="https://github.com/ajayyy/SponsorBlockServer/graphs/contributors" target="_blank" rel="noreferrer">SponsorBlockServer contributors</a> and{" "}
                    <a href="https://github.com/ajayyy/SponsorBlockSite/graphs/contributors" target="_blank" rel="noreferrer">SponsorBlockSite contributors</a> such{" "}
                    as <a href="https://github.com/NDevTK" target="_blank" rel="noreferrer">NDev</a>, <a href="https://github.com/Joe-Dowd" target="_blank" rel="noreferrer">Joe Dowd</a>,{" "}
                    <a href="https://mchang.name/" target="_blank" rel="noreferrer">Michael Chang</a> and more.
                </p>

                <p>
                    {chrome.i18n.getMessage("editTogetherLogoCredit")}
                </p>

                <p style={{textAlign: "center"}}>
                    <a href="/oss-attribution/attribution.txt">
                        {chrome.i18n.getMessage("openSourceLicenses")}
                    </a>
                </p>
            </div>
        </>
    );
};

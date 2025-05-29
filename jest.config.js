module.exports = {
    "roots": [
        "test"
    ],
    "testEnvironment": "jsdom", // Added this line
    "transform": {
        "^.+\\.ts$": "ts-jest"
    },
    "reporters": ["default", "github-actions"]
};

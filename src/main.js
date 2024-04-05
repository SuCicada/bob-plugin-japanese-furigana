//@ts-check

var lang = require("./lang.js");
var SYSTEM_PROMPT = require("./const.js").SYSTEM_PROMPT;
var log = require("./log.js");
var {
    buildHeader,
    ensureHttpsAndNoTrailingSlash,
    // getApiKey,
    handleGeneralError,
    handleValidateError,
    // replacePromptKeywords
} = require("./utils.js");


/**
 * @param {Bob.TranslateQuery} query
 * @returns {{ 
 *  generatedSystemPrompt: string, 
 *  generatedUserPrompt: string 
 * }}
*/
function generatePrompts(query) {
    let generatedSystemPrompt = SYSTEM_PROMPT;
    const { detectFrom, detectTo } = query;
    const sourceLang = lang.langMap.get(detectFrom) || detectFrom;
    const targetLang = lang.langMap.get(detectTo) || detectTo;
    let generatedUserPrompt = `translate from ${sourceLang} to ${targetLang}`;

    if (detectTo === "wyw" || detectTo === "yue") {
        generatedUserPrompt = `翻译成${targetLang}`;
    }

    if (
        detectFrom === "wyw" ||
        detectFrom === "zh-Hans" ||
        detectFrom === "zh-Hant"
    ) {
        if (detectTo === "zh-Hant") {
            generatedUserPrompt = "翻译成繁体白话文";
        } else if (detectTo === "zh-Hans") {
            generatedUserPrompt = "翻译成简体白话文";
        } else if (detectTo === "yue") {
            generatedUserPrompt = "翻译成粤语白话文";
        }
    }
    if (detectFrom === detectTo) {
        generatedSystemPrompt =
            "You are a text embellisher, you can only embellish the text, don't interpret it.";
        if (detectTo === "zh-Hant" || detectTo === "zh-Hans") {
            generatedUserPrompt = "润色此句";
        } else {
            generatedUserPrompt = "polish this sentence";
        }
    }

    generatedUserPrompt = `${generatedUserPrompt}:\n\n${query.text}`

    return { generatedSystemPrompt, generatedUserPrompt };
}


/**
 * @param {Bob.TranslateQuery} query
 * @param {string} targetText
 * @param {string} textFromResponse
 * @returns {string}
*/
function handleStreamResponse(query, targetText, textFromResponse) {
    if (textFromResponse !== '[DONE]') {
        try {
            const dataObj = JSON.parse(textFromResponse);
            // https://github.com/openai/openai-node/blob/master/src/resources/chat/completions.ts#L190
            const { choices } = dataObj;
            const delta = choices[0]?.delta?.content;
            if (delta) {
                targetText += delta;
                query.onStream({
                    result: {
                        from: query.detectFrom,
                        to: query.detectTo,
                        toParagraphs: [targetText],
                    },
                });
            }
        } catch (err) {
            handleGeneralError(query, {
                type: err.type || "param",
                message: err.message || "Failed to parse JSON",
                addition: err.addition,
            });
        }
    }
    return targetText;
}

/**
 * @param {Bob.TranslateQuery} query
 * @param {Bob.HttpResponse} result
 * @returns {void}
*/
function handleGeneralResponse(query, result) {
    const { choices } = result.data;

    if (!choices || choices.length === 0) {
        handleGeneralError(query, {
            type: "api",
            message: "接口未返回结果",
            addition: JSON.stringify(result),
        });
        return;
    }

    let targetText = choices[0].message.content.trim();

    // 使用正则表达式删除字符串开头和结尾的特殊字符
    targetText = targetText.replace(/^(『|「|"|“)|(』|」|"|”)$/g, "");

    // 判断并删除字符串末尾的 `" =>`
    if (targetText.endsWith('" =>')) {
        targetText = targetText.slice(0, -4);
    }

    query.onCompletion({
        result: {
            from: query.detectFrom,
            to: query.detectTo,
            toParagraphs: targetText.split("\n"),
        },
    });
}

/**
 * @type {Bob.Translate}
 */
function translate(query) {
    if (!lang.langMap.get(query.detectTo)) {
        handleGeneralError(query, {
            type: "unsupportLanguage",
            message: "不支持该语种",
            addition: "不支持该语种",
        });
    }

    const {
        // apiKeys, 
        apiUrl,
        // apiVersion, 
        // customModel, 
        // deploymentName,
        // model,
        // stream,
    } = $option;
    // $http.request({
    //     method: "POST",
    //     url: "https://apple.com",
    //     header: {
    //       k1: "v1",
    //       k2: "v2"
    //     },
    //     body: {
    //       k1: "v1",
    //       k2: "v2"
    //     },
    //     handler: function(resp) {
    //       var data = resp.data
    //     }
    //   });
    // const isCustomModelRequired = model === "custom";
    // if (isCustomModelRequired && !customModel) {
    //     handleGeneralError(query, {
    //         type: "param",
    //         message: "配置错误 - 请确保您在插件配置中填入了正确的自定义模型名称",
    //         addition: "请在插件配置中填写自定义模型名称",
    //     });
    // }

    // if (!apiKeys) {
    //     handleGeneralError(query, {
    //         type: "secretKey",
    //         message: "配置错误 - 请确保您在插件配置中填入了正确的 API Keys",
    //         addition: "请在插件配置中填写 API Keys",
    //     });
    // }

    // const modelValue = isCustomModelRequired ? customModel : model;

    // const apiKey = getApiKey($option.apiKeys);

    // const baseUrl = ensureHttpsAndNoTrailingSlash(apiUrl || "https://api.openai.com");
    // let apiUrlPath = baseUrl.includes("gateway.ai.cloudflare.com") ? "/chat/completions" : "/v1/chat/completions";
    // const apiVersionQuery = apiVersion ? `?api-version=${apiVersion}` : "?api-version=2023-03-15-preview";

    // const isAzureServiceProvider = baseUrl.includes("openai.azure.com");
    // if (isAzureServiceProvider) {
    //     if (deploymentName) {
    //         apiUrlPath = `/openai/deployments/${deploymentName}/chat/completions${apiVersionQuery}`;
    //     } else {
    //         handleGeneralError(query,{
    //             type: "secretKey",
    //             message: "配置错误 - 未填写 Deployment Name",
    //             addition: "请在插件配置中填写 Deployment Name",
    //             troubleshootingLink: "https://bobtranslate.com/service/translate/azureopenai.html"
    //         });
    //     } 
    // }

    // const header = buildHeader(isAzureServiceProvider, apiKey);
    // const body = buildRequestBody(modelValue, query);

    // let targetText = ""; // 初始化拼接结果变量
    // let buffer = ""; // 新增 buffer 变量
    log.info("264 query" + query.detectTo + query.detectFrom + query.text);
    (async () => {
        // if (stream) {
        log.info("apiUrl", apiUrl);
        log.info("268 query" + query.detectTo + query.detectFrom + query.text);
        log.info("query", JSON.stringify(query));
        let result = await $http.request({
            method: "POST",
            url: apiUrl,
            header: {
                "Content-Type": "application/json",
            },
            body: {
                text: query.text,
                hiragana_extra: true,
                // ...body,
                // stream: true,
            },
        })
        if (result.error) {
            handleGeneralError(query, result);
        } else {
            // handleGeneralResponse(query, result);
            query.onCompletion({
                result: {
                    from: query.detectFrom,
                    to: query.detectTo,
                    // toParagraphs:[result.data.okurigana],
                    toDict: {
                        "parts": [
                            {
                                "part": "送り仮名",
                                "means": [result.data.okurigana]
                            },
                            {
                                "part": "平仮名",
                                "means": [result.data.hiragana]
                            }
                        ]
                    }
                }
            });

        }
    })().catch((err) => {
        handleGeneralError(query, err);
    });
}

function supportLanguages() {
    return lang.supportLanguages.map(([standardLang]) => standardLang);
}



function pluginTimeoutInterval() {
    return 60;
}

exports.pluginTimeoutInterval = pluginTimeoutInterval;
// exports.pluginValidate = pluginValidate;
exports.supportLanguages = supportLanguages;
exports.translate = translate;
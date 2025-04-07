chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "translate") {
        const subtitle = message.text;
        handleTranslate(subtitle, sendResponse);
        return true; // 讓 sendResponse 可以非同步使用
    }
});

function handleTranslate(text, sendResponse) {
    chrome.storage.local.get(["access", "refresh"], (result) => {
        const token = result.access;
        const refresh = result.refresh;

        if (!token) {
            sendResponse({ error: "尚未登入" });
            return;
        }

        callTranslateAPI(token, text)
            .then(res => sendResponse(res))
            .catch(err => {
                if (err.status === 401 && refresh) {
                    console.log("⏰ Token 過期，嘗試刷新...");
                    refreshAccessToken(refresh)
                        .then(newToken => {
                            if (!newToken) {
                                sendResponse({ error: "無法刷新 token" });
                                return;
                            }

                            chrome.storage.local.set({ access: newToken }, () => {
                                callTranslateAPI(newToken, text)
                                    .then(res => sendResponse(res))
                                    .catch(err2 => sendResponse({ error: "刷新後翻譯失敗", detail: err2 }));
                            });
                        });
                } else {
                    sendResponse({ error: "翻譯失敗", detail: err });
                }
            });
    });
}

function callTranslateAPI(accessToken, text) {
    return fetch("http://127.0.0.1:8000/api/translation/translate/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({ text }),
        mode: "cors"
    }).then(async res => {
        const raw = await res.text();
        try {
            const data = JSON.parse(raw);
            if (res.status === 200 && data.translation) {
                return { translation: data.translation };
            } else {
                throw { status: res.status, message: data };
            }
        } catch (e) {
            throw { status: res.status, message: raw };
        }
    });
}

function refreshAccessToken(refreshToken) {
    return fetch("http://127.0.0.1:8000/api/auth/token/refresh/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ refresh: refreshToken }),
        mode: "cors"
    }).then(async res => {
        if (!res.ok) return null;
        const data = await res.json();
        console.log("✅ 已刷新 access token");
        return data.access;
    }).catch(() => null);
}
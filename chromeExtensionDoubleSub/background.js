let ws = null;
let isReady = false;
let reconnecting = false;
let portGlobal = null;
let activeTabId = null; 

// ✅ 接收 content.js 使用 connect 建立持久通道
chrome.runtime.onConnect.addListener((port) => {
    console.log("🔌 接收到 content.js 長連線:", port.name);
    portGlobal = port;

    if (port.sender?.tab?.id) {
        activeTabId = port.sender.tab.id;
        console.log("🌐 啟用 WebSocket 的 tabId：", activeTabId);
    }

    port.onDisconnect.addListener(() => {
        console.warn("❌ Content script disconnected，關閉 WebSocket");

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close(1000, "Tab closed or reloaded");
        }

        ws = null;
        isReady = false;
    });

    port.onMessage.addListener((msg) => {
        if (msg.action === "translate") {
            ensureWebSocketInitialized(() => {
                try {
                    ws.send(JSON.stringify({ text: msg.text }));
                } catch (e) {
                    console.error("❌ 傳送字幕失敗 (connect):", e);
                }
            });
        }
    });
});

// ✅ 監聽 tab 關閉事件，關閉 WebSocket
chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === activeTabId) {
        console.log("🧹 被關閉的是 activeTab，自動關閉 WebSocket");
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close(1000, "Tab closed");
        }
        ws = null;
        isReady = false;
        activeTabId = null;
    }
});

// ✅ 接收 popup.js 登入成功後觸發初始化
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "ping") {
        sendResponse({ ready: true });
        return;
    }

    if (message.action === "translate") {
        ensureWebSocketInitialized(() => {
            try {
                ws.send(JSON.stringify({ text: message.text }));
                sendResponse({ status: "sent" });
            } catch (e) {
                console.error("❌ 傳送字幕失敗：", e);
                sendResponse({ error: "WebSocket 發送失敗" });
            }
        });
        return true;
    }

    // 🔥 登入後主動要求建立 WebSocket
    if (message.action === "init_websocket") {
        ensureWebSocketInitialized(() => {
            console.log("✅ WebSocket 已透過登入初始化");
        });
    }

    // 🔥 登出後關閉 WebSocket
    if (message.action === "logout") {
        if (ws && ws.readyState === WebSocket.OPEN) {
            console.log("🚪 登出中，關閉 WebSocket...");
            ws.close();
        }
        ws = null;
        isReady = false;
        return;
    }
});

// ✅ 建立 WebSocket 並轉送訊息
function ensureWebSocketInitialized(callback) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        callback();
        return;
    }

    if (ws && ws.readyState === WebSocket.CONNECTING) {
        console.log("🕐 WebSocket 正在建立中，請稍候...");
        return;
    }

    chrome.storage.local.get(["access", "refresh"], ({ access, refresh }) => {
        if (!access) {
            console.warn("⚠️ 沒有 access token，無法建立 WebSocket");
            return;
        }

        chrome.storage.sync.get("serverUrl", ({ serverUrl }) => {
            if (!serverUrl) {
                console.error("❌ 未設定 serverUrl，無法建立 WebSocket");
                return;
            }

            console.log("🌐 建立 WebSocket 連線中...");
            ws = new WebSocket(`wss://${serverUrl}/ws/translate/?token=${access}`);

            ws.onopen = () => {
                console.log("🔌 WebSocket 已建立");
                isReady = true;
                callback();
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.translation) {
                    if (portGlobal) {
                        portGlobal.postMessage({
                            action: "displayTranslation",
                            translation: data.translation
                        });
                    } else {
                        chrome.runtime.sendMessage({
                            action: "displayTranslation",
                            translation: data.translation
                        });
                    }
                }
            };

            ws.onerror = (err) => {
                console.error("❌ WebSocket 錯誤：", err);
            };

            ws.onclose = () => {
                console.warn("🔌 WebSocket 關閉");
                ws = null;
                isReady = false;

                if (!reconnecting && refresh) {
                    reconnecting = true;
                    refreshAccessToken(refresh).then((newToken) => {
                        if (newToken) {
                            chrome.storage.local.set({ access: newToken }, () => {
                                console.log("🔁 使用新 access token 重連 WebSocket");
                                reconnecting = false;
                                ensureWebSocketInitialized(() => {});
                            });
                        } else {
                            console.error("⛔ 無法刷新 token，請重新登入");
                            reconnecting = false;
                        }
                    });
                }
            };
        });
    });
}

// 🔄 刷新 access token
function refreshAccessToken(refreshToken) {
    return new Promise((resolve) => {
        chrome.storage.sync.get("serverUrl", ({ serverUrl }) => {
            if (!serverUrl) {
                console.error("❌ 未設定 serverUrl，無法刷新 token");
                resolve(null);
                return;
            }

            fetch(`https://${serverUrl}/api/auth/token/refresh/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ refresh: refreshToken }),
                mode: "cors"
            })
            .then(async (res) => {
                if (!res.ok) {
                    console.warn("⚠️ token refresh 失敗");
                    resolve(null);
                    return;
                }
                const data = await res.json();
                console.log("✅ 已刷新 access token");
                resolve(data.access);
            })
            .catch((err) => {
                console.error("❌ 無法刷新 token：", err);
                resolve(null);
            });
        });
    });
}
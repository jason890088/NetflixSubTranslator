document.addEventListener("DOMContentLoaded", function () {
    const toggleButton = document.getElementById("toggleTranslation");
    const loginButton = document.getElementById("loginButton");
    const logoutButton = document.getElementById("logoutButton");
    const statusDiv = document.getElementById("status");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const serverInput = document.getElementById("serverInput");
    const serverButton = document.getElementById("serverButton");
    const resetButton = document.getElementById("resetSubtitle");

    resetButton.addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: "resetSubtitleStyle" });
        });
    });
    
    chrome.storage.sync.get("serverUrl", (data) => {
        const url = data.serverUrl;

        if (url) {
            serverInput.value = url;
            serverInput.disabled = true;
            serverButton.textContent = "✏️ 修改伺服器位址";
        } else {
            serverButton.textContent = "儲存伺服器位址";
        }
    });

    serverButton.addEventListener("click", () => {
        if (serverInput.disabled) {
            // 目前是唯讀，改為可編輯
            serverInput.disabled = false;
            serverButton.textContent = "💾 儲存伺服器位址";
        } else {
            const newUrl = serverInput.value.trim();
            chrome.storage.sync.set({ serverUrl: newUrl }, () => {
                serverInput.disabled = true;
                serverButton.textContent = "✏️ 修改伺服器位址";
            });
        }
    });

    // 登出按鈕
    logoutButton.addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "logout" }); 
        chrome.storage.local.remove(["access", "refresh"], () => {
            statusDiv.textContent = "🚪 已登出";
            showLoginForm();
            logoutButton.style.display = "none";
        });
    });

    // 檢查登入狀態
    chrome.storage.local.get("access", (result) => {
        const token = result.access;
        if (token) {
            statusDiv.textContent = "✅ 已登入";
            hideLoginForm();

            chrome.runtime.sendMessage({ action: "init_websocket" });
        } else {
            statusDiv.textContent = "請先登入以使用翻譯功能";
            showLoginForm();
        }
    });

    // 登入流程
    loginButton.addEventListener("click", async () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            statusDiv.textContent = "❗ 請輸入帳號與密碼";
            return;
        }

        chrome.storage.sync.get("serverUrl", async ({ serverUrl }) => {
            if (!serverUrl) {
                statusDiv.textContent = "❗ 尚未設定伺服器位址";
                return;
            }

            try {
                const response = await fetch(`https://${serverUrl}/api/auth/token/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password })
                });

                if (!response.ok) {
                    statusDiv.textContent = "❌ 登入失敗，請檢查帳號密碼";
                    return;
                }

                const data = await response.json();
                chrome.storage.local.set({ access: data.access, refresh: data.refresh }, () => {
                    statusDiv.textContent = "✅ 登入成功！";
                    hideLoginForm();
                });
            } catch (error) {
                console.error("登入失敗：", error);
                statusDiv.textContent = "❌ 登入錯誤";
            }
        });
    });

    // 載入翻譯狀態
    chrome.storage.sync.get("translationEnabled", (data) => {
        const isEnabled = data.translationEnabled !== false;
        toggleButton.innerText = isEnabled ? "🔄 關閉翻譯" : "🔄 開啟翻譯";
    });

    // 切換翻譯開關
    toggleButton.addEventListener("click", () => {
        chrome.storage.sync.get("translationEnabled", (data) => {
            const newStatus = !data.translationEnabled;
            chrome.storage.sync.set({ translationEnabled: newStatus }, () => {
                toggleButton.innerText = newStatus ? "🔄 關閉翻譯" : "🔄 開啟翻譯";
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "toggleTranslation",
                        enabled: newStatus
                    });
                });
            });
        });
    });

    function hideLoginForm() {
        usernameInput.style.display = "none";
        passwordInput.style.display = "none";
        loginButton.style.display = "none";
        logoutButton.style.display = "block";
    }

    function showLoginForm() {
        usernameInput.style.display = "block";
        passwordInput.style.display = "block";
        loginButton.style.display = "block";
        logoutButton.style.display = "none";
    }
});
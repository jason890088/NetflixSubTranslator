document.addEventListener("DOMContentLoaded", function () {
    const toggleButton = document.getElementById("toggleTranslation");
    const loginButton = document.getElementById("loginButton");
    const statusDiv = document.getElementById("status");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const logoutButton = document.getElementById("logoutButton");

    // 登出按鈕邏輯
    logoutButton.addEventListener("click", () => {
        chrome.storage.local.remove(["access", "refresh"], () => {
            statusDiv.textContent = "🚪 已登出";
            showLoginForm();
            logoutButton.style.display = "none";
        });
    });
    
    // 先判斷是否已登入
    chrome.storage.local.get("access", (result) => {
        const token = result.access;
        if (token) {
            statusDiv.textContent = "✅ 已登入";
            hideLoginForm();
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

        try {
            const response = await fetch("http://127.0.0.1:8000/api/auth/token/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                statusDiv.textContent = "❌ 登入失敗，請檢查帳號密碼";
                return;
            }

            const data = await response.json();
            chrome.storage.local.set({
                access: data.access,
                refresh: data.refresh
            }, () => {
                statusDiv.textContent = "✅ 登入成功！";
                hideLoginForm();
                chrome.runtime.sendMessage({ action: "init_websocket" });
            });
        } catch (error) {
            console.error("登入失敗：", error);
            statusDiv.textContent = "❌ 登入錯誤";
        }
    });

    // 讀取翻譯狀態
    chrome.storage.sync.get("translationEnabled", function (data) {
        const isEnabled = data.translationEnabled !== false;
        toggleButton.innerText = isEnabled ? "🔄 關閉翻譯" : "🔄 開啟翻譯";
    });

    // 切換翻譯開關
    toggleButton.addEventListener("click", function () {
        chrome.storage.sync.get("translationEnabled", function (data) {
            const newStatus = !data.translationEnabled;
            chrome.storage.sync.set({ translationEnabled: newStatus }, function () {
                toggleButton.innerText = newStatus ? "🔄 關閉翻譯" : "🔄 開啟翻譯";
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "toggleTranslation",
                        enabled: newStatus
                    });
                });
            });
        });
    });

    // 顯示 / 隱藏表單的小工具
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

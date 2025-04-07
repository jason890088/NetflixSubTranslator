document.addEventListener("DOMContentLoaded", function () {
    let toggleButton = document.getElementById("toggleTranslation");

    // 讀取目前的翻譯狀態
    chrome.storage.sync.get("translationEnabled", function (data) {
        const isEnabled = data.translationEnabled !== false;
        toggleButton.innerText = isEnabled ? "🔄 關閉翻譯" : "🔄 開啟翻譯";
    });

    // 點擊按鈕，切換翻譯開關
    toggleButton.addEventListener("click", function () {
        chrome.storage.sync.get("translationEnabled", function (data) {
            const newStatus = !data.translationEnabled;

            chrome.storage.sync.set({ translationEnabled: newStatus }, function () {
                toggleButton.innerText = newStatus ? "🔄 關閉翻譯" : "🔄 開啟翻譯";

                // ✅ 正確方式：發送訊息給 content.js
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "toggleTranslation",
                        enabled: newStatus
                    });
                });
            });
        });
    });
});
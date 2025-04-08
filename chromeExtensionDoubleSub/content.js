console.log("Netflix Subtitle Translator 擴充功能已載入！");

let lastSubtitle = "";
let subtitleVisible = false;
let translationEnabled = true;

// 建立與 background 的長連線
const port = chrome.runtime.connect({ name: "subtitle-connection" });

// 接收來自 background 的翻譯結果
port.onMessage.addListener((message) => {
    if (message.action === "displayTranslation" && message.translation) {
        displayTranslatedSubtitle(message.translation);
    }
});

// 接收來自 popup 的翻譯開關狀態
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "toggleTranslation") {
        console.log("📩 收到 toggleTranslation 訊息，翻譯啟用狀態：", message.enabled);
        translationEnabled = message.enabled;
        if (!translationEnabled) {
            removeTranslatedSubtitle();
        }
    }
});

// 讀取初始開關狀態
chrome.storage.sync.get("translationEnabled", function (data) {
    translationEnabled = data.translationEnabled !== false; // 預設為開啟
});

// 不斷偵測 Netflix 字幕
setInterval(() => {
    let subtitleElement = document.querySelector(".player-timedtext-text-container");

    if (subtitleElement) {
        let originalText = subtitleElement.innerText.trim();

        if (originalText) {
            subtitleVisible = true;

            if (originalText !== lastSubtitle) {
                lastSubtitle = originalText;

                if (translationEnabled) {
                    port.postMessage({ action: "translate", text: originalText });
                }
            }
        } else {
            subtitleVisible = false;
        }
    } else {
        subtitleVisible = false;
    }

    if (!subtitleVisible) {
        removeTranslatedSubtitle();
    }
}, 50);

// 顯示翻譯後的字幕
function displayTranslatedSubtitle(translation) {
    let existingDiv = document.getElementById("translated-subtitle");

    if (!existingDiv) {
        existingDiv = document.createElement("div");
        existingDiv.id = "translated-subtitle";

        // 從快取載入位置與大小
        chrome.storage.sync.get(["subtitlePosition", "subtitleSize"], (data) => {
            if (data.subtitlePosition) {
                existingDiv.style.top = data.subtitlePosition.top;
                existingDiv.style.left = data.subtitlePosition.left;
                existingDiv.style.transform = "";
            }
            if (data.subtitleSize) {
                existingDiv.style.width = data.subtitleSize.width;
                existingDiv.style.height = data.subtitleSize.height;
            }
        });

        makeElementDraggable(existingDiv);
        observeResize(existingDiv);
        document.body.appendChild(existingDiv);
    }

    existingDiv.innerText = translation;
}

// 移除翻譯字幕
function removeTranslatedSubtitle() {
    let existingDiv = document.getElementById("translated-subtitle");
    if (existingDiv) {
        existingDiv.remove();
    }
}

// 拖曳功能
function makeElementDraggable(elmnt) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    elmnt.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        elmnt.style.transform = "";

        chrome.storage.sync.set({
            subtitlePosition: {
                top: elmnt.style.top,
                left: elmnt.style.left
            }
        });
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// 縮放監聽
function observeResize(elmnt) {
    const resizeObserver = new ResizeObserver(() => {
        chrome.storage.sync.set({
            subtitleSize: {
                width: elmnt.style.width,
                height: elmnt.style.height
            }
        });
    });
    resizeObserver.observe(elmnt);
}
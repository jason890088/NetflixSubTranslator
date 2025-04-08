
# from transformers import MBartForConditionalGeneration, MBart50TokenizerFast
# import torch

# # 檢查 GPU 是否可用
# device = "cpu"

# # 使用 Facebook 模型
# MODEL_NAME = "facebook/mbart-large-50-many-to-many-mmt"
# tokenizer = MBart50TokenizerFast.from_pretrained(MODEL_NAME)
# model = MBartForConditionalGeneration.from_pretrained(MODEL_NAME).to(device)

# # 設定語言代碼為繁體中文
# target_lang = "zh_CN"

# text = "i kid you not"
# inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True).to(device)
# # 進行翻譯
# with torch.no_grad():
#     translated = model.generate(**inputs, forced_bos_token_id=tokenizer.lang_code_to_id[target_lang])

# translation = tokenizer.decode(translated[0], skip_special_tokens=True)

# print("翻譯結果:", translation)

import websocket
import json

# 👉 這裡換成你自己的 JWT Access Token
JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzQ0MDg1NDU5LCJpYXQiOjE3NDQwODUxNTksImp0aSI6IjQwNDRhMDAxYzA2NTRjMmFiZjJlM2ZhZDVlM2Y2YTk2IiwidXNlcl9pZCI6MX0.Z8xQoO2NysQLPC40GCPcZOr-Z_9Vr7tQwuOEyPk3GxY"

# 👉 WebSocket 連線 URL（帶上 token）
WS_URL = f"ws://localhost:8000/ws/translate/?token={JWT_TOKEN}"

def on_open(ws):
    print("🔗 已連線成功，送出字幕...")
    test_text = "Hello, how are you today?"
    payload = json.dumps({"text": test_text})
    ws.send(payload)

def on_message(ws, message):
    print("🌍 收到翻譯回應：")
    print(json.loads(message))
    ws.close()

def on_error(ws, error):
    print(f"❌ 發生錯誤: {error}")

def on_close(ws, close_status_code, close_msg):
    print("🔌 連線已關閉")

if __name__ == "__main__":
    websocket.enableTrace(True)  # 👉 debug log（可移除）
    ws = websocket.WebSocketApp(
        WS_URL,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close
    )
    ws.run_forever()
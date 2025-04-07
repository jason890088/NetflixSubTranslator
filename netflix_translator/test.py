
from transformers import MBartForConditionalGeneration, MBart50TokenizerFast
import torch

# 檢查 GPU 是否可用
device = "cpu"

# 使用 Facebook 模型
MODEL_NAME = "facebook/mbart-large-50-many-to-many-mmt"
tokenizer = MBart50TokenizerFast.from_pretrained(MODEL_NAME)
model = MBartForConditionalGeneration.from_pretrained(MODEL_NAME).to(device)

# 設定語言代碼為繁體中文
target_lang = "zh_CN"

text = "i kid you not"
inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True).to(device)
# 進行翻譯
with torch.no_grad():
    translated = model.generate(**inputs, forced_bos_token_id=tokenizer.lang_code_to_id[target_lang])

translation = tokenizer.decode(translated[0], skip_special_tokens=True)

print("翻譯結果:", translation)
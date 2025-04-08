import torch
from transformers import MBartForConditionalGeneration, MBart50TokenizerFast
from opencc import OpenCC 


class TranslationModelManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(TranslationModelManager, cls).__new__(cls)
            cls._instance._initialize_model()
        return cls._instance

    def _initialize_model(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.target_lang = "zh_CN"
        self.model_name = "facebook/mbart-large-50-many-to-many-mmt"

        self.tokenizer = MBart50TokenizerFast.from_pretrained(self.model_name)
        self.model = MBartForConditionalGeneration.from_pretrained(self.model_name).to(self.device)
        self.model.eval()
        
        self.opencc = OpenCC('s2twp')  # s2twp = 簡體轉台灣繁體

    def translate(self, text):
        if not text:
            return None

        inputs = self.tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=128).to(self.device)
        with torch.no_grad():
            translated = self.model.generate(
                **inputs,
                forced_bos_token_id=self.tokenizer.lang_code_to_id[self.target_lang]
            )
            
        simplified_output = self.tokenizer.decode(translated[0], skip_special_tokens=True)
        traditional_output = self.opencc.convert(simplified_output)
        
        return traditional_output
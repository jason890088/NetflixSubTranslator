from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from .model_manager import TranslationModelManager

@csrf_exempt
def translate_text(request):
    if request.method == "POST":
        data = json.loads(request.body)
        text = data.get("text", "")
        print(text)

        if not text:
            return JsonResponse({"error": "No text provided"}, status=400)

        translation = TranslationModelManager().translate(text)

        if translation is None:
            return JsonResponse({"error": "Translation failed"}, status=500)

        return JsonResponse({"translation": translation})
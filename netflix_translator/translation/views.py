from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from translation.model_manager import TranslationModelManager
from rest_framework import status
from translation.logger import logger



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def translate_text(request):
    text = request.data.get("text", "")

    if not text:
        return Response({"error": "No text provided"}, status=status.HTTP_400_BAD_REQUEST)

    translation = TranslationModelManager().translate(text)

    if translation is None:
        return Response({"error": "Translation failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    logger.info(f"User {request.user.username} translated text: {text} to {translation}")
    return Response({"translation": translation})
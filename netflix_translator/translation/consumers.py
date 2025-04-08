from channels.generic.websocket import AsyncWebsocketConsumer
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth.models import AnonymousUser, User
from django.db import close_old_connections
from urllib.parse import parse_qs
import json
from translation.model_manager import TranslationModelManager
from asgiref.sync import sync_to_async

class SubtitleConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = await self.get_user_from_token()

        if not self.user or self.user.is_anonymous:
            await self.close()
            return

        await self.accept()
        await self.send(text_data=json.dumps({"status": "connected", "user": self.user.username}))

    async def disconnect(self, close_code):
        print("WebSocket disconnected")

    async def receive(self, text_data):
        if not self.user or self.user.is_anonymous:
            await self.send(text_data=json.dumps({"error": "Unauthorized"}))
            return

        data = json.loads(text_data)
        subtitle = data.get("text", "")

        if not subtitle:
            await self.send(text_data=json.dumps({"error": "No subtitle text"}))
            return

        translation = TranslationModelManager().translate(subtitle)
        await self.send(text_data=json.dumps({
            "original": subtitle,
            "translation": translation
        }))

    async def get_user_from_token(self):
        try:
            query_string = self.scope["query_string"].decode()
            token = parse_qs(query_string).get("token", [None])[0]

            if not token:
                print("❌ 沒有提供 token")
                return AnonymousUser()

            from django.conf import settings
            from rest_framework_simplejwt.backends import TokenBackend

            UntypedToken(token)  

            valid_data = TokenBackend(
                algorithm="HS256",
                signing_key=settings.SECRET_KEY  
            ).decode(token, verify=True)

            print(f"✅ Token 解碼成功: {valid_data}")

            user_id = valid_data["user_id"]
            close_old_connections()

            from django.contrib.auth.models import User
            return await sync_to_async(User.objects.get)(id=user_id)

        except Exception as e:
            print(f"❌ Token 驗證失敗: {e}")
            return AnonymousUser()
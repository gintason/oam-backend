"""
One WebSocket per signed-in client:  wss://<api-host>/ws/jobs/?token=<access JWT>

Server → client  (all as {"type": ..., "data": {...}})
    chat.message         a new message in any of my threads
    chat.typing          the other side is typing  {thread, side}
    chat.read            the other side read up to  {thread, side, at}
    application.created  (employers) someone applied
    application.updated  pipeline status changed
    notification         bell-feed item (job alerts, expiries, payments)
    pong / error

Client → server
    {"type": "chat.send",   "thread": "<id>", "body": "...", "attachment": {...}, "client_id": "..."}
    {"type": "chat.typing", "thread": "<id>"}
    {"type": "chat.read",   "thread": "<id>"}
    {"type": "ping"}

Close codes: 4401 not authenticated.
"""
from __future__ import annotations

import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .events import user_group

logger = logging.getLogger(__name__)


def _client_gone(exc) -> bool:
    """True when sending failed only because the client already disconnected."""
    name = type(exc).__name__
    return name in ("ConnectionClosedOK", "ConnectionClosedError", "ConnectionClosed",
                    "ClientDisconnected") or "Unexpected ASGI message" in str(exc)


class JobsConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if user is None or not user.is_authenticated:
            await self.close(code=4401)
            return
        self.user = user
        self.group = user_group(user.id)
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if getattr(self, "group", None):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    # ---- inbound ---------------------------------------------------------- #

    async def receive_json(self, content, **kwargs):
        kind = content.get("type")
        try:
            if kind == "ping":
                await self.send_json({"type": "pong"})
            elif kind == "chat.send":
                msg = await self._send_message(content)
                await self.send_json({"type": "chat.ack",
                                      "data": {"client_id": content.get("client_id", ""),
                                               "id": msg}})
            elif kind == "chat.typing":
                await self._typing(content.get("thread"))
            elif kind == "chat.read":
                await self._read(content.get("thread"))
            else:
                await self.send_json({"type": "error", "data": {"detail": "Unknown type."}})
        except Exception as exc:  # report, never drop the socket
            from ..services import JobsError
            if _client_gone(exc):
                return          # client closed mid-request (app backgrounded etc.)
            detail = str(exc) if isinstance(exc, JobsError) else "Something went wrong."
            if not isinstance(exc, JobsError):
                logger.exception("jobs socket error")
            try:
                await self.send_json({"type": "error", "data": {
                    "detail": detail, "client_id": content.get("client_id", "")}})
            except Exception as send_exc:
                if not _client_gone(send_exc):
                    raise

    # ---- outbound (group events) -------------------------------------------- #

    async def jobs_event(self, event):
        await self.send_json(event["payload"])

    # ---- helpers ------------------------------------------------------------- #

    @database_sync_to_async
    def _thread(self, thread_id):
        from ..models import ChatThread
        from ..services import JobsError
        thread = ChatThread.objects.select_related("employer", "candidate__user") \
            .filter(pk=thread_id).first()
        if thread is None or not thread.is_participant(self.user):
            raise JobsError("Conversation not found.")
        return thread

    async def _send_message(self, content):
        thread = await self._thread(content.get("thread"))
        return await self._do_send(thread, content)

    @database_sync_to_async
    def _do_send(self, thread, content):
        from ..services import ChatService
        msg = ChatService.send(thread, self.user, body=content.get("body", ""),
                               attachment=content.get("attachment"),
                               client_id=content.get("client_id", ""))
        return str(msg.id)

    async def _typing(self, thread_id):
        thread = await self._thread(thread_id)
        side = await database_sync_to_async(thread.side_of)(self.user)
        other_ids = await database_sync_to_async(thread.participant_ids)()
        for uid in other_ids:
            if str(uid) != str(self.user.id):
                await self.channel_layer.group_send(user_group(uid), {
                    "type": "jobs.event",
                    "payload": {"type": "chat.typing",
                                "data": {"thread": str(thread.id), "side": side}}})

    async def _read(self, thread_id):
        thread = await self._thread(thread_id)
        from ..services import ChatService
        await database_sync_to_async(ChatService.mark_read)(thread, self.user)

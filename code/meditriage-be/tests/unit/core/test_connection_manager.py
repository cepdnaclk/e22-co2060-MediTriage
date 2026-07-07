import asyncio
from app.core.connection_manager import ConnectionManager


class DummyWebSocket:
    def __init__(self):
        self.accepted = False
        self.closed = False
        self.sent_messages = []

    async def accept(self):
        self.accepted = True

    async def send_json(self, message):
        self.sent_messages.append(message)

    async def close(self, code=1000, reason=""):
        self.closed = True


def test_connection_manager_broadcast_isolated():
    async def run_test():
        manager = ConnectionManager()
        ws1 = DummyWebSocket()
        ws2 = DummyWebSocket()
        ws3 = DummyWebSocket()

        await manager.connect("room-1", ws1)
        await manager.connect("room-1", ws2)
        await manager.connect("room-2", ws3)

        await manager.broadcast("room-1", {"type": "message", "text": "hello"})

        assert ws1.sent_messages[-1]["text"] == "hello"
        assert ws2.sent_messages[-1]["text"] == "hello"
        assert ws3.sent_messages == []

    asyncio.run(run_test())

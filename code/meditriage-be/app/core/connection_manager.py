"""
WebSocket Connection Manager for real-time consultation rooms.
Maintains in-memory registry of active WebSocket connections.
"""
from typing import Dict, List
from fastapi import WebSocket
from uuid import UUID
import json
from app.core.logging import get_logger

logger = get_logger(__name__)

class ConnectionManager:
    def __init__(self):
        # Dictionary mapping room_id (UUID) to a list of active WebSockets
        self.active_connections: Dict[UUID, List[WebSocket]] = {}

    async def connect(self, room_id: UUID, websocket: WebSocket):
        """Accepts the connection and adds it to the room's list."""
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)
        logger.debug(f"Client connected to room {room_id}. Total connections: {len(self.active_connections[room_id])}")

    def disconnect(self, room_id: UUID, websocket: WebSocket):
        """Removes a websocket connection from the room."""
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                self.active_connections[room_id].remove(websocket)
                logger.debug(f"Client disconnected from room {room_id}.")
            if not self.active_connections[room_id]:
                # Clean up empty room lists to prevent memory leaks
                del self.active_connections[room_id]

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Sends a JSON message to a specific client."""
        await websocket.send_json(message)

    async def broadcast(self, room_id: UUID, message: dict):
        """Broadcasts a JSON message to all clients in a specific room."""
        if room_id in self.active_connections:
            # We iterate over a copy of the list to avoid issues if a socket drops during broadcast
            connections = list(self.active_connections[room_id])
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to client in room {room_id}: {e}")
                    self.disconnect(room_id, connection)

    async def disconnect_all(self, room_id: UUID, code: int = 4003, reason: str = "Room closed"):
        """Disconnects all clients in a room with a specific close code."""
        if room_id in self.active_connections:
            connections = list(self.active_connections[room_id])
            for connection in connections:
                try:
                    await connection.close(code=code, reason=reason)
                except Exception:
                    pass
            del self.active_connections[room_id]

    def get_connection_count(self, room_id: UUID) -> int:
        """Returns the number of active connections for a room."""
        if room_id in self.active_connections:
            return len(self.active_connections[room_id])
        return 0

# Singleton instance to be used across the application
manager = ConnectionManager()

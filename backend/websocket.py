from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Set
import json

class ConnectionManager:
    def __init__(self):
        # user_id -> set of websockets
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # role -> set of websockets
        self.role_connections: Dict[str, Set[WebSocket]] = {
            "admin": set(),
            "agent": set(),
            "user": set()
        }

    async def connect(self, websocket: WebSocket, user_id: int, role: str):
        await websocket.accept()
        
        # Add to user map
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        
        # Add to role map
        self.role_connections[role].add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int, role: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
        if role in self.role_connections:
            self.role_connections[role].remove(websocket)

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            payload = json.dumps(message)
            for connection in self.active_connections[user_id]:
                await connection.send_text(payload)

    async def broadcast_to_role(self, message: dict, role: str):
        if role in self.role_connections:
            payload = json.dumps(message)
            for connection in self.role_connections[role]:
                await connection.send_text(payload)

    async def broadcast_all(self, message: dict):
        payload = json.dumps(message)
        for user_conns in self.active_connections.values():
            for connection in user_conns:
                await connection.send_text(payload)

manager = ConnectionManager()

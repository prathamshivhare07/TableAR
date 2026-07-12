"""In-memory WebSocket manager keyed by tenant_id for the Kitchen Display System."""
from collections import defaultdict
from typing import Dict, List
from fastapi import WebSocket


class KDSConnectionManager:
    def __init__(self) -> None:
        self.active: Dict[str, List[WebSocket]] = defaultdict(list)

    async def connect(self, tenant_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self.active[tenant_id].append(ws)

    def disconnect(self, tenant_id: str, ws: WebSocket) -> None:
        if ws in self.active.get(tenant_id, []):
            self.active[tenant_id].remove(ws)

    async def broadcast(self, tenant_id: str, message: dict) -> None:
        dead: List[WebSocket] = []
        for ws in self.active.get(tenant_id, []):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(tenant_id, ws)


manager = KDSConnectionManager()

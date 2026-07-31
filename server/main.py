import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from server.agent import Agent

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(lifespan=lifespan)


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    api_key = os.getenv("OPENAI_API_KEY")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    model = os.getenv("OPENAI_MODEL", "deepseek-v4-flash")
    agent = Agent(ws, api_key=api_key, base_url=base_url, model=model)
    try:
        while True:
            data = await ws.receive_json()
            await agent.handle_client_message(data)
    except WebSocketDisconnect:
        await agent.close()


app.mount("/", StaticFiles(directory="demo", html=True), name="static")

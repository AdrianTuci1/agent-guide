import asyncio
import json
import uuid
from openai import AsyncOpenAI

INTERACTIVE_TOOLS = {"show_variants", "show_confirmation", "show_secret", "show_form"}

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "render_mode",
            "description": "Show or hide the running/render indicator above the composer. Call with a mode before starting work and with null when done.",
            "parameters": {
                "type": "object",
                "properties": {
                    "mode": {
                        "type": "string",
                        "enum": ["thinking", "searching", "generating", "running", "syncing", "connecting", "analyzing-image", "planning"],
                        "nullable": True
                    }
                },
                "required": ["mode"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_tool_call",
            "description": "Display a tool call row in the chat, e.g. after running a shell command or reading a file.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tool": {"type": "string", "description": "Tool name"},
                    "args": {"type": "object", "description": "Tool arguments"},
                    "result": {"type": "string", "description": "Short result summary"}
                },
                "required": ["tool", "args", "result"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_variants",
            "description": "Show a card with clickable variant options to the user. Use when the user needs to choose between options.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "options": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["title", "options"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_confirmation",
            "description": "Show a confirmation card with action buttons to the user. Use when the user must confirm or deny an action.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "message": {"type": "string"},
                    "actions": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["title", "message", "actions"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_secret",
            "description": "Ask the user for a secret, password, or API key.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "scope": {"type": "string", "description": "What the secret will be used for"}
                },
                "required": ["title", "scope"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_form",
            "description": "Show a form with input fields to the user.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "fields": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "label": {"type": "string"},
                                "type": {"type": "string", "enum": ["text", "password", "select"]},
                                "options": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["name", "label", "type"]
                        }
                    }
                },
                "required": ["title", "fields"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_code_change_card",
            "description": "Display edited/created files as a collapsible card with tabs.",
            "parameters": {
                "type": "object",
                "properties": {
                    "description": {"type": "string"},
                    "files": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "path": {"type": "string"},
                                "mode": {"type": "string", "enum": ["created", "modified", "deleted"]},
                                "content": {"type": "string"}
                            },
                            "required": ["path", "mode", "content"]
                        }
                    }
                },
                "required": ["description", "files"]
            }
        }
    }
]

SYSTEM_PROMPT = """You are an AI coding assistant inside a custom chat UI. The UI can render special components. You must use the available functions to drive the UI.

Available render functions and when to use them:
- `render_mode(mode)`: show a "Running..." indicator. Call before starting work (e.g. thinking, searching, running) and call `render_mode` with mode `null` when done.
- `add_tool_call(tool, args, result)`: display a row showing that you ran a tool such as `read_file` or `run_shell`.
- `show_variants(title, options)`: show a card with clickable options when the user must choose.
- `show_confirmation(title, message, actions)`: show a confirmation card with buttons.
- `show_secret(title, scope)`: ask the user for a password/secret.
- `show_form(title, fields)`: ask the user to fill a form.
- `add_code_change_card(description, files)`: show edited files as a collapsible tabbed card. Always use this when you create or modify code.

Rules:
1. Start work by calling `render_mode` with an appropriate mode and finish by calling `render_mode` with mode `null`.
2. For normal explanations, stream plain text. The text appears as a normal agent message.
3. When you run commands or read files, call `add_tool_call`.
4. When you edit code, call `add_code_change_card` with one entry per file.
5. When you need user input, use the appropriate interactive function and wait. The UI will send the reply back to you.
6. Be concise and action-oriented.
"""


class Agent:
    def __init__(self, websocket, api_key, base_url, model):
        self.ws = websocket
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = model
        self.messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        self.pending_inputs = {}
        self.closed = False

    async def close(self):
        self.closed = True
        for future in list(self.pending_inputs.values()):
            if not future.done():
                future.cancel()
        self.pending_inputs.clear()

    async def send(self, payload):
        if not self.closed:
            await self.ws.send_json(payload)

    async def handle_client_message(self, data):
        event = data.get("event")
        if event == "user_message":
            await self.run(data.get("text", ""))
        elif event in ("variant_choice", "confirmation_choice", "secret_value", "form_submit"):
            self.resolve_input(data.get("id"), data)

    async def run(self, user_message):
        self.messages.append({"role": "user", "content": user_message})
        max_turns = 10

        for _ in range(max_turns):
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=self.messages,
                tools=TOOLS,
                stream=True,
            )

            content_parts = []
            tool_calls = {}
            finish_reason = None

            async for chunk in response:
                choice = chunk.choices[0]
                delta = choice.delta
                finish_reason = choice.finish_reason

                if delta.content:
                    content_parts.append(delta.content)
                    await self.send({"event": "add_message_chunk", "text": delta.content, "done": False})

                if delta.tool_calls:
                    for tc in delta.tool_calls:
                        idx = tc.index
                        tool_calls.setdefault(idx, {"id": "", "name": "", "arguments": ""})
                        if tc.id:
                            tool_calls[idx]["id"] += tc.id
                        if tc.function:
                            if tc.function.name:
                                tool_calls[idx]["name"] += tc.function.name
                            if tc.function.arguments:
                                tool_calls[idx]["arguments"] += tc.function.arguments

            content = "".join(content_parts)
            if content:
                await self.send({"event": "add_message_chunk", "text": "", "done": True})
                self.messages.append({"role": "assistant", "content": content})

            if not tool_calls:
                break

            assistant_message = {"role": "assistant", "content": content or None, "tool_calls": []}
            tool_results = []

            for idx in sorted(tool_calls.keys()):
                tc = tool_calls[idx]
                try:
                    args = json.loads(tc["arguments"])
                except json.JSONDecodeError:
                    args = {}

                event_payload = self.tool_to_event(tc["name"], args)
                await self.send(event_payload)

                if tc["name"] in INTERACTIVE_TOOLS:
                    result = await self.await_input(event_payload["id"])
                else:
                    result = {"ack": True}

                assistant_message["tool_calls"].append({
                    "id": tc["id"],
                    "type": "function",
                    "function": {"name": tc["name"], "arguments": tc["arguments"]}
                })
                tool_results.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": json.dumps(result)
                })

            if assistant_message["tool_calls"]:
                self.messages.append(assistant_message)
            self.messages.extend(tool_results)

        await self.send({"event": "done"})

    def tool_to_event(self, name, args):
        event_id = str(uuid.uuid4())
        if name == "render_mode":
            return {"event": "render_mode", "mode": args.get("mode")}
        if name == "add_tool_call":
            return {
                "event": "add_tool_call",
                "tool": args.get("tool"),
                "args": args.get("args", {}),
                "result": args.get("result", "")
            }
        if name == "show_variants":
            return {"event": "show_variants", "id": event_id, "title": args.get("title"), "options": args.get("options", [])}
        if name == "show_confirmation":
            return {
                "event": "show_confirmation",
                "id": event_id,
                "title": args.get("title"),
                "message": args.get("message"),
                "actions": args.get("actions", [])
            }
        if name == "show_secret":
            return {"event": "show_secret", "id": event_id, "title": args.get("title"), "scope": args.get("scope")}
        if name == "show_form":
            return {"event": "show_form", "id": event_id, "title": args.get("title"), "fields": args.get("fields", [])}
        if name == "add_code_change_card":
            return {"event": "add_code_change_card", "description": args.get("description"), "files": args.get("files", [])}
        return {"event": "add_message_chunk", "text": f"[unknown tool {name}]", "done": True}

    async def await_input(self, event_id):
        loop = asyncio.get_event_loop()
        future = loop.create_future()
        self.pending_inputs[event_id] = future
        try:
            return await future
        finally:
            self.pending_inputs.pop(event_id, None)

    def resolve_input(self, event_id, data):
        future = self.pending_inputs.pop(event_id, None)
        if future and not future.done():
            future.set_result(data)

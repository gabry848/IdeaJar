import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { IdeaStore, ideaText } from "./store.js";

const file = process.env.IDEAJAR_FILE
  ? resolve(process.env.IDEAJAR_FILE)
  : fileURLToPath(new URL("../data/ideas.json", import.meta.url));
const store = new IdeaStore(file);
const server = new McpServer({ name: "ideajar", version: "0.1.0" });

function result(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

server.registerTool("idea_add", {
  description: "Save an idea in IdeaJar exactly as provided, with its creation date.",
  inputSchema: { text: ideaText },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
}, ({ text }) => result(store.add(text)));

server.registerTool("idea_list", {
  description: "List all saved ideas, including their IDs and creation dates.",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
}, () => result(store.list()));

server.registerTool("idea_update", {
  description: "Replace the text of an idea by its ID. Keep its original creation date.",
  inputSchema: { id: z.uuid(), text: ideaText },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
}, ({ id, text }) => result(store.update(id, text)));

await server.connect(new StdioServerTransport());

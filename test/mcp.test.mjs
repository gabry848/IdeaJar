import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const serverPath = fileURLToPath(new URL("../dist/index.js", import.meta.url));

async function connect(file, cwd) {
  const client = new Client({ name: "ideajar-test", version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    env: { IDEAJAR_FILE: file },
    cwd,
    stderr: "pipe",
  });
  await client.connect(transport);
  return client;
}

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "ideajar-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, "notes", "ideas.json");
  const client = await connect(file, directory);
  t.after(() => client.close());
  return { client, file, directory };
}

function value(result) {
  assert.notEqual(result.isError, true, JSON.stringify(result));
  return JSON.parse(result.content[0].text);
}

test("stdio tools save, list, update, and persist across restarts", async (t) => {
  const { client, file, directory } = await fixture(t);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((tool) => tool.name).sort(), ["idea_add", "idea_list", "idea_update"]);
  assert.deepEqual(value(await client.callTool({ name: "idea_list", arguments: {} })), []);

  const text = "  Provare ciò che mi ha mandato Marco\nhttps://example.com  ";
  const idea = value(await client.callTool({ name: "idea_add", arguments: { text } }));
  assert.equal(idea.text, text);
  assert.match(idea.id, /^[0-9a-f-]{36}$/);
  assert.ok(Number.isFinite(Date.parse(idea.createdAt)));
  assert.deepEqual(Object.keys(idea).sort(), ["createdAt", "id", "text"]);

  const updated = value(await client.callTool({
    name: "idea_update",
    arguments: { id: idea.id, text: "Provarlo domani" },
  }));
  assert.deepEqual(updated, { ...idea, text: "Provarlo domani" });
  assert.deepEqual(JSON.parse(await readFile(file, "utf8")), [updated]);

  await client.close();
  const restarted = await connect(file, directory);
  t.after(() => restarted.close());
  assert.deepEqual(value(await restarted.callTool({ name: "idea_list", arguments: {} })), [updated]);
});

test("invalid input and unknown IDs leave saved ideas untouched", async (t) => {
  const { client, file } = await fixture(t);
  value(await client.callTool({ name: "idea_add", arguments: { text: "Keep this" } }));
  const original = await readFile(file, "utf8");
  for (const request of [
    { name: "idea_add", arguments: { text: " \n " } },
    { name: "idea_update", arguments: { id: randomUUID(), text: "Missing idea" } },
    { name: "idea_update", arguments: { id: "invalid", text: "Invalid ID" } },
  ]) {
    assert.equal((await client.callTool(request)).isError, true);
    assert.equal(await readFile(file, "utf8"), original);
  }
});

test("simultaneous requests within one process do not lose ideas", async (t) => {
  const { client, file } = await fixture(t);
  const ideas = await Promise.all(Array.from({ length: 10 }, (_, i) =>
    client.callTool({ name: "idea_add", arguments: { text: `Idea ${i}` } }).then(value)
  ));
  const saved = value(await client.callTool({ name: "idea_list", arguments: {} }));
  assert.equal(saved.length, ideas.length);
  assert.deepEqual(new Set(saved.map((idea) => idea.id)), new Set(ideas.map((idea) => idea.id)));
  assert.deepEqual(JSON.parse(await readFile(file, "utf8")), saved);
});

test("corrupt or invalid existing files are reported and never overwritten", async (t) => {
  const { client, file } = await fixture(t);
  value(await client.callTool({ name: "idea_add", arguments: { text: "Create file" } }));
  for (const contents of ["{broken", '[{"text":"Missing fields"}]']) {
    await writeFile(file, contents);
    for (const request of [
      { name: "idea_list", arguments: {} },
      { name: "idea_add", arguments: { text: "Do not overwrite" } },
    ]) {
      const result = await client.callTool(request);
      assert.equal(result.isError, true);
      assert.match(result.content[0].text, /Invalid ideas file/);
      assert.equal(await readFile(file, "utf8"), contents);
    }
  }
});

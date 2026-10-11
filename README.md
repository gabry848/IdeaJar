# IdeaJar

A tiny TypeScript MCP server for jotting down ideas. Each idea is just text and the date it was saved, with an ID so you can edit or delete it later.

Runs over **stdio**, without authentication. All records live in one JSON file. It exposes four tools:

| Tool | Input | Action |
| --- | --- | --- |
| `idea_add` | `text` | Save an idea and its creation date. |
| `idea_list` | None | Read all ideas, including their IDs. |
| `idea_update` | `id`, `text` | Replace the text, keeping the original date. |
| `idea_delete` | `id` | Delete an idea and return the removed record. |

Use `idea_list` to find an idea's ID before editing or deleting it. An unknown ID returns an error without changing the file.

## Setup

Requires Node.js 22 or newer.

```sh
git clone https://github.com/gabry848/IdeaJar.git
cd IdeaJar
npm ci
npm run build
```

Add this to your MCP client's configuration:

```json
{
  "mcpServers": {
    "ideajar": {
      "command": "node",
      "args": ["/absolute/path/to/IdeaJar/dist/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/IdeaJar` with your local checkout path.

The client starts the server automatically. You can also start it with `npm start`; it waits for MCP messages on stdin.

## Storage

The default file is `data/ideas.json` inside this project, regardless of the client's working directory. It is created on the first save:

```json
[
  {
    "id": "64408754-9562-4fef-b317-7b9fc129f24d",
    "text": "Try the tool Marco sent me",
    "createdAt": "2026-10-10T17:30:00.000Z"
  }
]
```

To choose another file, set `IDEAJAR_FILE` in the client's `env` configuration, preferably to an absolute path. Relative paths resolve from the server's working directory. Dates are UTC. Text is preserved exactly; blank ideas are rejected.

Use one server process per file. Writes replace the file atomically, and an invalid existing file is reported instead of overwritten. Back up the JSON file to back up your ideas.

```sh
npm test
```

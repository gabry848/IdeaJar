import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";

export const ideaText = z.string().refine((text) => text.trim().length > 0, {
  message: "Idea text must not be blank.",
});

const ideasSchema = z.array(z.strictObject({
  id: z.uuid(),
  text: ideaText,
  createdAt: z.iso.datetime(),
}));

type Idea = z.infer<typeof ideasSchema>[number];

export class IdeaStore {
  constructor(private readonly file: string) {}

  list(): Idea[] {
    let contents: string;
    try {
      contents = readFileSync(this.file, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }

    try {
      return ideasSchema.parse(JSON.parse(contents));
    } catch {
      throw new Error(`Invalid ideas file: ${this.file}. Fix it before saving ideas.`);
    }
  }

  add(text: string): Idea {
    const ideas = this.list();
    const idea = {
      id: randomUUID(),
      text: ideaText.parse(text),
      createdAt: new Date().toISOString(),
    };
    ideas.push(idea);
    this.save(ideas);
    return idea;
  }

  update(id: string, text: string): Idea {
    const ideas = this.list();
    const idea = ideas.find((item) => item.id === id);
    if (!idea) throw new Error(`Idea not found: ${id}`);
    idea.text = ideaText.parse(text);
    this.save(ideas);
    return idea;
  }

  delete(id: string): Idea {
    const ideas = this.list();
    const index = ideas.findIndex((item) => item.id === id);
    if (index === -1) throw new Error(`Idea not found: ${id}`);
    const [idea] = ideas.splice(index, 1);
    this.save(ideas);
    return idea;
  }

  private save(ideas: Idea[]): void {
    mkdirSync(dirname(this.file), { recursive: true });
    const temporaryFile = `${this.file}.${randomUUID()}.tmp`;
    try {
      writeFileSync(temporaryFile, `${JSON.stringify(ideas, null, 2)}\n`, {
        flag: "wx",
        mode: 0o600,
      });
      renameSync(temporaryFile, this.file);
    } finally {
      rmSync(temporaryFile, { force: true });
    }
  }
}

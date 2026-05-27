import { createHighlighter } from "shiki";
import { transformers, vorillazTheme } from "../../config/plugins";

type Highlighter = Awaited<ReturnType<typeof createHighlighter>>;

let highlighter: Highlighter | undefined;

export async function create(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: [vorillazTheme],
      langs: [
        "javascript",
        "bash",
        "shell",
        "docker",
        "go",
        "json",
        "markdown",
        "typescript",
        "ts",
        "tsx",
      ],
    });
  }

  return highlighter;
}

export async function codeToHtml(code: string, lang: string) {
  const highlighter = await create();

  return highlighter.codeToHtml(code, {
    lang: lang ? lang : "javascript",
    theme: "vorillaz",
    transformers: transformers,
  });
}

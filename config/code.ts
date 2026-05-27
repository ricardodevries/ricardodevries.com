import type { PhrasingContent, Paragraph, Code, Root as MdastRoot } from "mdast";
import type { Properties, Result } from "hastscript";
import type { Transformer, Plugin } from "unified";
import type { Parent } from "unist";
import type { Element, Root as HastRoot } from "hast";

import { visit } from "unist-util-visit";
import { h as _h } from "hastscript";

const h = (
  el: string,
  attrs: Properties = {},
  children: unknown[] = []
): Paragraph => {
  const { properties, tagName } = _h(el, attrs);

  return {
    data: { hProperties: properties, hName: tagName },
    children: children as PhrasingContent[],
    type: "paragraph",
  };
};

const getLanguageName = (lang: string): string => {
  const languages: {
    [key: string]: undefined | string;
  } = {
    tsx: "React / TypeScript",
    jsx: "React / JavaScript",
    js: "JavaScript",
    javascript: "JavaScript",
    ts: "TypeScript",
    typescript: "TypeScript",
    svelte: "Svelte",
    md: "Markdown",
    html: "HTML",
    bash: "Bash",
    json: "JSON",
    css: "CSS",
    sh: "Bash",
    vue: "Vue",
    python: "Python",
    ruby: "Ruby",
    go: "Go",
    php: "PHP",
    react: "React",
  };

  return languages[lang] ?? lang;
};

const parseMetaBlock = (meta: string) => {
  if (!meta) {
    return { title: null, meta: "", icon: null };
  }

  const titleMatch = meta.match(/title="([^"]*)"/);
  const title = titleMatch?.[1] ?? null;
  meta = meta.replace(titleMatch?.[0] ?? "", "");

  return { title, meta };
};

export const singleLineCodeBlock: Plugin<[], HastRoot> = () => (tree) => {
  visit(tree, "element", (node: Element) => {
    if (node.tagName === "code") {
      // if no properties then it's a single backtick code block
      if (!node.properties || Object.keys(node?.properties).length === 0) {
        node.properties = {};
        // change the tag to inline-code
        node.tagName = "inline-code";
      }
    }
  });
};

export const codeBlock: Plugin<[], MdastRoot> = (): Transformer<MdastRoot> => (tree) => {
  visit(tree, "code", (node: Code, index: number | undefined, parent: Parent | undefined) => {
    if (typeof index !== "number" || !parent) {
      return;
    }

    const { lang, meta = "" } = node as Code;
    const { title } = parseMetaBlock(meta as string);
    const html = h(
      "div",
      {
        class:
          "copy-code-wrapper" +
          (title ? " has-title" : "") +
          (lang ? ` code-language-${lang}` : ""),
      },
      [
        h("custom-code-renderer", {
          lang: lang,
          langName: getLanguageName(lang ?? ""),
          code: node?.value,
          title,
        }),
        node as unknown as Result,
      ]
    );

    parent.children[index] = html;
  });
};

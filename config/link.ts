import type { Element, Root } from "hast";
import type { Plugin } from "unified";

import { visit } from "unist-util-visit";

export const wrapLinkContent: Plugin<[], Root> = () => (tree) => {
  // wrap content with <span> tag
  visit(tree, "element", (node: Element) => {
    if (node.tagName === "a") {
      node.children = [
        {
          type: "element",
          tagName: "span",
          properties: { className: ["link-content"] },
          children: node.children,
        },
      ];
    }
  });
};

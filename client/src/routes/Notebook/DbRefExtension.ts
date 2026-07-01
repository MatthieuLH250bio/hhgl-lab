import { Node, mergeAttributes } from "@tiptap/core";

export interface DbRefOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dbRef: {
      insertDbRef: (attrs: { refType: string; refId: string; refLabel: string }) => ReturnType;
    };
  }
}

export const DbRef = Node.create<DbRefOptions>({
  name: "dbRef",
  group: "inline",
  inline: true,
  atom: true, // treated as a single, non-editable unit

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      refType:  { default: null, parseHTML: (el) => el.getAttribute("data-ref-type") },
      refId:    { default: null, parseHTML: (el) => el.getAttribute("data-ref-id") },
      refLabel: { default: null, parseHTML: (el) => el.textContent },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-db-ref]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-db-ref":   "true",
        "data-ref-type": node.attrs.refType,
        "data-ref-id":   node.attrs.refId,
        class: `db-ref db-ref--${node.attrs.refType}`,
        contenteditable: "false",
        title: "Voir dans la base de données",
      }),
      node.attrs.refLabel,
    ];
  },

  addCommands() {
    return {
      insertDbRef:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    };
  },
});

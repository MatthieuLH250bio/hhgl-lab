import { Node, mergeAttributes, type CommandProps } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    noteBlock: {
      setNoteBlock: () => ReturnType;
      unsetNoteBlock: () => ReturnType;
    };
  }
}

export const NoteBlock = Node.create({
  name: "noteBlock",
  group: "block",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: "div.protocol-note" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "protocol-note" }), 0];
  },

  addCommands() {
    return {
      setNoteBlock:
        () =>
        ({ commands }: CommandProps) =>
          commands.wrapIn(this.name),
      unsetNoteBlock:
        () =>
        ({ commands }: CommandProps) =>
          commands.lift(this.name),
    };
  },
});

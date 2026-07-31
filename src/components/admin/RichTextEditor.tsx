"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  ImageIcon,
  Heading1,
  Heading2,
  Heading3,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const { t } = useTranslation();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        code: false,
        horizontalRule: false,
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({ inline: false }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor: instance }) => {
      onChange(instance.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-slate max-w-none min-h-[220px] px-4 py-3 focus:outline-none",
      },
    },
  });

  // Syncs external content (e.g. an article loaded asynchronously in edit
  // mode, after the editor already mounted with empty initial content).
  // `useEditor`'s `content` option only applies once on mount — this effect
  // is what picks up later changes. `emitUpdate: false` is required in v3
  // (setContent emits update events by default, unlike v2), and the
  // equality check stops it from resetting cursor position on every
  // keystroke, since onChange already mirrors the editor's own HTML back
  // into `value`.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  const buttonClass = (active: boolean) =>
    cn(
      "flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-muted",
      active && "bg-brand-soft text-brand"
    );

  return (
    <div className="overflow-hidden rounded-2xl border border-outline bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-outline bg-[#f7fbfc] p-2">
        <button
          type="button"
          title={t("richText.heading1")}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={buttonClass(editor.isActive("heading", { level: 1 }))}
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          type="button"
          title={t("richText.heading2")}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={buttonClass(editor.isActive("heading", { level: 2 }))}
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          title={t("richText.heading3")}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={buttonClass(editor.isActive("heading", { level: 3 }))}
        >
          <Heading3 className="h-4 w-4" />
        </button>
        <div className="mx-1 h-5 w-px bg-outline" />
        <button
          type="button"
          title={t("richText.bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={buttonClass(editor.isActive("bold"))}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          title={t("richText.italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={buttonClass(editor.isActive("italic"))}
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          title={t("richText.underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={buttonClass(editor.isActive("underline"))}
        >
          <UnderlineIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          title={t("richText.strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={buttonClass(editor.isActive("strike"))}
        >
          <Strikethrough className="h-4 w-4" />
        </button>
        <div className="mx-1 h-5 w-px bg-outline" />
        <button
          type="button"
          title={t("richText.bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={buttonClass(editor.isActive("bulletList"))}
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          title={t("richText.orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={buttonClass(editor.isActive("orderedList"))}
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          type="button"
          title={t("richText.blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={buttonClass(editor.isActive("blockquote"))}
        >
          <Quote className="h-4 w-4" />
        </button>
        <div className="mx-1 h-5 w-px bg-outline" />
        <button
          type="button"
          title={t("richText.link")}
          onClick={() => {
            const url = window.prompt(t("richText.linkPrompt"));
            if (url) {
              editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
            }
          }}
          className={buttonClass(editor.isActive("link"))}
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          title={t("richText.image")}
          onClick={() => {
            const url = window.prompt(t("richText.imagePrompt"));
            if (url) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }}
          className={buttonClass(false)}
        >
          <ImageIcon className="h-4 w-4" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

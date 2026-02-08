"use client";

import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
    ClassicEditor,
    Bold,
    Essentials,
    Italic,
    Paragraph,
    List,
    Link,
    Heading,
    BlockQuote,
    Undo
} from 'ckeditor5';

import 'ckeditor5/ckeditor5.css';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, minHeight = "200px" }: RichTextEditorProps) {
    return (
        <div className="prose-editor">
            <CKEditor
                editor={ClassicEditor}
                config={{
                    toolbar: {
                        items: [
                            'undo', 'redo', '|',
                            'heading', '|',
                            'bold', 'italic', '|',
                            'link', 'blockQuote', '|',
                            'bulletedList', 'numberedList'
                        ],
                    },
                    plugins: [
                        Bold,
                        Essentials,
                        Italic,
                        Paragraph,
                        List,
                        Link,
                        Heading,
                        BlockQuote,
                        Undo
                    ],
                    placeholder: placeholder,
                }}
                data={value}
                onChange={(event, editor) => {
                    const data = editor.getData();
                    onChange(data);
                }}
            />
            <style jsx global>{`
                .ck-editor__editable_inline {
                    min-height: ${minHeight};
                }
                .ck.ck-list__item .ck-button {
                    display: none; /* Hide drag handles if they appear incorrectly */
                }
            `}</style>
        </div>
    );
}

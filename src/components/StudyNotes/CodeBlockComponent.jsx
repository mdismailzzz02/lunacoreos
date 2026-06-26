import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { useState } from 'react';

export default function CodeBlockComponent({ node: { attrs: { language } }, updateAttributes, extension }) {
    const [copied, setCopied] = useState(false);

    const languages = extension.options.lowlight.listLanguages();

    const handleCopy = () => {
        const text = document.querySelector(`[data-id="${extension.editor.state.selection.from}"]`)?.innerText || '';
        // Better way: get the text from the node
        // But in NodeView, we can use a simpler approach:
        const codeElement = document.getElementById(`code-node-${language}`); // This is just a fallback
        navigator.clipboard.writeText(extension.editor.getText({ from: extension.editor.state.selection.from, to: extension.editor.state.selection.to }));
        // Actually, Tiptap gives us the content via NodeViewContent.
        // Let's use a simpler approach for copy:
        const content = extension.editor.state.doc.textBetween(extension.getPos(), extension.getPos() + extension.node.nodeSize);
        navigator.clipboard.writeText(content);
        
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <NodeViewWrapper className="code-block-wrapper">
            <div className="code-block-header">
                <select
                    className="sn-code-lang-select"
                    contentEditable={false}
                    value={language || 'plaintext'}
                    onChange={event => updateAttributes({ language: event.target.value })}
                >
                    <option value="plaintext">plaintext</option>
                    <option value="null">auto</option>
                    <option disabled>—</option>
                    {languages.map((lang, index) => (
                        <option key={index} value={lang}>
                            {lang}
                        </option>
                    ))}
                </select>
                <button className="sn-code-copy-btn" onClick={handleCopy}>
                    {copied ? '✓ Copied' : 'Copy'}
                </button>
            </div>
            <pre>
                <NodeViewContent as="code" />
            </pre>
        </NodeViewWrapper>
    );
}

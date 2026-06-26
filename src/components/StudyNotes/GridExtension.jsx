import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import GridNodeView from './GridNodeView';

export const GridExtension = Node.create({
    name: 'grid',
    group: 'block',
    draggable: true,
    addAttributes() {
        return {
            rows: {
                default: 1,
                parseHTML: el => parseInt(el.getAttribute('data-rows') || '1'),
                renderHTML: attrs => ({ 'data-rows': attrs.rows }),
            },
            columns: {
                default: 3,
                parseHTML: el => parseInt(el.getAttribute('data-columns') || '3'),
                renderHTML: attrs => ({ 'data-columns': attrs.columns }),
            },
            cells: {
                default: [],
                parseHTML: el => {
                    try {
                        return JSON.parse(el.getAttribute('data-cells') || '[]');
                    } catch {
                        return [];
                    }
                },
                renderHTML: attrs => ({ 'data-cells': JSON.stringify(attrs.cells || []) }),
            },
        };
    },
    parseHTML() {
        return [
            { tag: 'div.sn-grid-embed' },
        ];
    },
    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { class: 'sn-grid-embed' })];
    },
    addNodeView() {
        return ReactNodeViewRenderer(GridNodeView);
    },
});

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import GridNodeView from './GridNodeView';

export const GridExtension = Node.create({
    name: 'grid',
    group: 'block',
    draggable: true,
    addAttributes() {
        return {
            columns: {
                default: 3,
                parseHTML: el => parseInt(el.getAttribute('data-columns') || '3'),
                renderHTML: attrs => ({ 'data-columns': attrs.columns }),
            },
            rows: {
                default: 1,
                parseHTML: el => parseInt(el.getAttribute('data-rows') || '1'),
                renderHTML: attrs => ({ 'data-rows': attrs.rows }),
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
            gridWidth: {
                default: null,
                parseHTML: el => el.getAttribute('data-grid-width') || null,
                renderHTML: attrs => attrs.gridWidth ? { 'data-grid-width': attrs.gridWidth } : {},
            },
            cellHeight: {
                default: null,
                parseHTML: el => el.getAttribute('data-cell-height') ? parseInt(el.getAttribute('data-cell-height')) : null,
                renderHTML: attrs => attrs.cellHeight ? { 'data-cell-height': String(attrs.cellHeight) } : {},
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

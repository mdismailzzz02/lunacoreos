import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Heading } from '@tiptap/extension-heading';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Mention } from '@tiptap/extension-mention';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';
import Blockquote from '@tiptap/extension-blockquote';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';

import { 
    Bold, 
    Italic, 
    Underline as UnderlineIcon, 
    Strikethrough, 
    Code, 
    Quote, 
    List, 
    ListOrdered, 
    Minus, 
    AtSign, 
    Trash2, 
    Folder as FolderIcon,
    Hash,
    Image as ImageIcon,
    Mic,
    FileCode,
    Maximize,
    Minimize,
    Grid3x3,
    BookOpen
} from 'lucide-react';

import CodeBlockComponent from './CodeBlockComponent';
import CustomDropdown from './CustomDropdown';
import MediaAttachmentsPanel from '../Shared/MediaAttachmentsPanel';
import TagsInput from './TagsInput';
import * as api from '../../services/api';
import AudioNodeView from './AudioNodeView';
import ImageNodeView from './ImageNodeView';
import FileNodeView from './FileNodeView';
import { GridExtension } from './GridExtension.jsx';

const lowlight = createLowlight(common);

// Custom Audio Extension — renders blob URLs as <audio> and Drive URLs as <iframe>
import { Node, mergeAttributes } from '@tiptap/core';
const AudioExtension = Node.create({
    name: 'audio',
    group: 'block',
    draggable: true,
    addAttributes() {
        return {
            src: { default: null },
            media_id: { default: null },
            filename: { default: null },
        };
    },
    parseHTML() {
        return [
            { tag: 'audio[src]', getAttrs: el => ({ 
                src: el.getAttribute('src'), 
                media_id: el.getAttribute('data-media-id'),
                filename: el.getAttribute('data-filename')
            }) },
            { tag: 'iframe.sn-audio-iframe', getAttrs: el => ({ 
                src: el.getAttribute('src'), 
                media_id: el.getAttribute('data-media-id'),
                filename: el.getAttribute('data-filename')
            }) },
        ];
    },
    renderHTML({ HTMLAttributes }) {
        const src = HTMLAttributes.src || '';
        const isDrive = src.includes('drive.google.com') || src.includes('docs.google.com');
        const isSupabase = src.includes('supabase.co');

        const dataAttrs = { 
            'data-media-id': HTMLAttributes.media_id,
            'data-filename': HTMLAttributes.filename 
        };
        
        if (isDrive) {
            return ['iframe', mergeAttributes(dataAttrs, {
                src, class: 'sn-audio-iframe', allow: 'autoplay', frameborder: '0',
            })];
        }
        
        // Supabase or direct blobs use <audio> tag
        return ['audio', mergeAttributes(dataAttrs, { src, controls: 'controls', class: 'sn-embedded-audio' })];
    },
    addNodeView() {
        return ReactNodeViewRenderer(AudioNodeView);
    },
});

// Custom File Extension — renders generic files as mini square links
const FileExtension = Node.create({
    name: 'file',
    group: 'block',
    atom: true,
    draggable: true,
    addAttributes() {
        return {
            href: { default: null },
            filename: { default: null },
            media_id: { default: null },
        };
    },
    parseHTML() {
        return [
            { tag: 'div.sn-media-pill-embed', getAttrs: el => ({ 
                href: el.getAttribute('data-href'), 
                filename: el.getAttribute('data-filename'),
                media_id: el.getAttribute('data-media-id')
            }) },
        ];
    },
    renderHTML({ HTMLAttributes }) {
        const { href, filename, media_id } = HTMLAttributes;
        return ['div', { class: 'sn-media-pill-embed', 'data-href': href, 'data-filename': filename, 'data-media-id': media_id },
            ['div', { class: 'sn-media-pill-icon' }, '📄'],
            ['span', { class: 'sn-media-pill-name' }, filename || 'Attached File']
        ];
    },
    addNodeView() {
        return ReactNodeViewRenderer(FileNodeView);
    },
});

export default function StudyNotesEditor({
    note,
    folders,
    allNotes,
    autoSaveStatus,
    onSave,
    onTriggerAutoSave,
    onDelete,
}) {
    const fileInputRef = useRef(null);
    const codeInputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const noteRef = useRef(note); // Always points to latest note without stale closures
    useEffect(() => { noteRef.current = note; }, [note]);

    const [isRecording, setIsRecording] = useState(false);
    const [refreshMedia, setRefreshMedia] = useState(0);
    const [title, setTitle] = useState(note.title || '');
    const [folderId, setFolderId] = useState(note.folder_id || '');
    const [tags, setTags] = useState(note.tags ? note.tags.split('|').filter(Boolean) : []);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isReadOnlyFullscreen, setIsReadOnlyFullscreen] = useState(false);
    const editorSurfaceRef = useRef(null);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFS = !!document.fullscreenElement;
            setIsFullscreen(isFS);
            if (!isFS) {
                setIsReadOnlyFullscreen(false);
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            editorSurfaceRef.current?.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    const toggleReadOnlyFullscreen = () => {
        if (!document.fullscreenElement) {
            setIsReadOnlyFullscreen(true);
            editorSurfaceRef.current?.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
                setIsReadOnlyFullscreen(false);
            });
        } else {
            document.exitFullscreen();
        }
    };

    // Sync state ONLY if note_id changes (switching notes)
    // This prevents background auto-saves from wiping out what you're currently typing
    useEffect(() => {
        setTitle(note.title || '');
        setFolderId(note.folder_id || '');
        setTags(note.tags ? note.tags.split('|').filter(Boolean) : []);
    }, [note.note_id]);

    const mentionItems = allNotes
        .filter(n => n.note_id !== note.note_id)
        .map(n => ({
            id: n.note_id,
            label: n.title || 'Untitled',
            folder: folders.find(f => f.folder_id === n.folder_id),
        }));

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false,
                heading: false,
                blockquote: false,
                history: true,
            }),
            Heading.configure({ levels: [1, 2, 3] }),
            Underline,
            Blockquote,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Link.configure({ openOnClick: false, autolink: true }),
            Placeholder.configure({ placeholder: 'Start writing your note...' }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Image.extend({
                addAttributes() {
                    return {
                        ...this.parent?.(),
                        media_id: {
                            default: null,
                            parseHTML: el => el.getAttribute('data-media-id'),
                            renderHTML: attrs => ({ 'data-media-id': attrs.media_id }),
                        },
                    };
                },
                addNodeView() {
                    return ReactNodeViewRenderer(ImageNodeView);
                },
            }).configure({
                allowBase64: true,
                HTMLAttributes: {
                    class: 'sn-embedded-image',
                    referrerpolicy: 'no-referrer',
                },
            }),
            CodeBlockLowlight.extend({
                addNodeView() {
                    return ReactNodeViewRenderer(CodeBlockComponent);
                },
            }).configure({ lowlight }),
            Mention.configure({
                HTMLAttributes: { class: 'mention' },
                suggestion: {
                    items: ({ query }) => {
                        return mentionItems
                            .filter(item => item.label.toLowerCase().includes(query.toLowerCase()))
                            .slice(0, 10);
                    },
                    render: () => {
                        let popup;
                        return {
                            onStart: props => {
                                popup = document.createElement('div');
                                popup.className = 'sn-mention-popup-refined';
                                document.body.appendChild(popup);
                                updatePopup(props, popup);
                            },
                            onUpdate: props => updatePopup(props, popup),
                            onKeyDown: props => {
                                if (props.event.key === 'Escape') {
                                    popup?.remove();
                                    return true;
                                }
                                return false;
                            },
                            onExit: () => popup?.remove(),
                        };
                    },
                },
            }),
            AudioExtension,
            FileExtension,
            GridExtension,
        ],
        content: note.content || '',
        editorProps: {
            attributes: {
                class: 'sn-prose-editor',
            },
            handlePaste: (view, event) => {
                const items = Array.from(event.clipboardData?.items || []);
                const imageItem = items.find(item => item.type.startsWith('image'));
                
                if (imageItem) {
                    const file = imageItem.getAsFile();
                    if (file) {
                        // Create a temporary base64 to show immediate feedback
                        const reader = new FileReader();
                        reader.onload = async (e) => {
                            const base64data = e.target.result;
                            
                            // Insert a placeholder/temp image
                            view.dispatch(view.state.tr.replaceSelectionWith(
                                view.state.schema.nodes.image.create({ src: base64data })
                            ));

                            // Trigger the real upload logic
                            try {
                                const res = await api.uploadMedia({
                                    file: file,
                                    filename: `pasted_image_${Date.now()}.png`,
                                    mime_type: file.type,
                                    media_type: 'image',
                                    uploaded_from: 'studynotes_paste',
                                    source_id: note.note_id,
                                });

                                if (res.drive_link) {
                                    const driveUrl = await api.getStreamableUrl(res.drive_link, 'large');
                                    
                                    // Update the editor: replace the base64 with the Drive URL
                                    const { tr } = view.state;
                                    view.state.doc.descendants((node, pos) => {
                                        if (node.type.name === 'image' && node.attrs.src === base64data) {
                                            tr.setNodeMarkup(pos, null, { ...node.attrs, src: driveUrl, media_id: res.media_id });
                                        }
                                    });
                                    view.dispatch(tr);

                                    // Refresh the media panel
                                    setTimeout(() => setRefreshMedia(Date.now()), 500);
                                }
                            } catch (err) {
                                console.error('Paste upload failed:', err);
                            }
                        };
                        reader.readAsDataURL(file);
                        return true; // Handled
                    }
                }
                return false;
            }
        },
        onUpdate: ({ editor }) => {
            if (window.snSaveTimeout) clearTimeout(window.snSaveTimeout);
            const currentHTML = editor.getHTML();
            window.snSaveTimeout = setTimeout(() => {
                // Read media urls from ref so we never overwrite them with stale closure values
                const latestNote = noteRef.current;
                onTriggerAutoSave({
                    content: currentHTML,
                    audio_urls: latestNote.audio_urls,
                    image_urls: latestNote.image_urls,
                    file_urls:  latestNote.file_urls,
                });
            }, 1500);
        },
    });

    useEffect(() => {
        if (editor) {
            editor.setEditable(!isReadOnlyFullscreen);
        }
    }, [editor, isReadOnlyFullscreen]);

    function updatePopup(props, popup) {
        if (!props.items || props.items.length === 0) {
            popup.style.display = 'none';
            return;
        }
        popup.style.display = 'block';
        const rect = props.clientRect?.();
        if (rect) {
            popup.style.position = 'fixed';
            popup.style.top = `${rect.bottom + 4}px`;
            popup.style.left = `${rect.left}px`;
        }
        popup.innerHTML = `
            <div class="sn-mention-list">
                ${props.items.map((item, i) => `
                    <div class="sn-mention-opt-refined ${i === props.selectedIndex ? 'selected' : ''}" data-idx="${i}">
                        <div class="sn-mention-opt-info">
                            <span class="sn-mention-opt-title">${item.label}</span>
                            <span class="sn-mention-opt-folder">${item.folder ? item.folder.folder_name : 'No folder'}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        popup.querySelectorAll('.sn-mention-opt-refined').forEach(el => {
            el.addEventListener('mousedown', (e) => {
                e.preventDefault();
                props.command(props.items[parseInt(el.dataset.idx)]);
            });
        });
    }

    // When media is deleted (from shelf or inline delete button), clean up ghost embeds
    useEffect(() => {
        const handler = (e) => {
            const { media_id } = e.detail;
            if (!editor || !media_id) return;
            const json = editor.getJSON();
            const clean = (nodes) => {
                if (!nodes) return nodes;
                return nodes.filter(node => {
                    if ((node.type === 'image' || node.type === 'audio' || node.type === 'file') && node.attrs?.media_id === media_id) return false;
                    if (node.content) node.content = clean(node.content);
                    return true;
                });
            };
            json.content = clean(json.content);
            editor.commands.setContent(json, false);
            setRefreshMedia(Date.now());
        };
        document.addEventListener('sn-media-deleted', handler);
        return () => document.removeEventListener('sn-media-deleted', handler);
    }, [editor]);

    const currentHeading = editor?.isActive('heading', { level: 1 }) ? 'H1' :
                          editor?.isActive('heading', { level: 2 }) ? 'H2' :
                          editor?.isActive('heading', { level: 3 }) ? 'H3' : 'Body';

    const handleHeadingChange = (val) => {
        if (val === 'Body') editor.chain().focus().setParagraph().run();
        else {
            const level = parseInt(val.replace('H', ''));
            editor.chain().focus().toggleHeading({ level }).run();
        }
    };

    const flushMeta = useCallback(() => {
        if (!editor) return;
        onSave({ content: editor.getHTML(), title, folder_id: folderId, tags: tags.join('|') });
    }, [editor, title, folderId, tags, onSave]);

    const wordCount = editor?.storage.characterCount?.words?.() || editor?.state.doc.textContent.trim().split(/\s+/).filter(Boolean).length || 0;

    const triggerImageInput = () => {
        fileInputRef.current.click();
    };

    const startStopRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Pick supported MIME type
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                ? 'audio/webm'
                : 'audio/ogg';

            const recorder = new MediaRecorder(stream, { mimeType });
            audioChunksRef.current = [];
            console.log('[Recorder] Using mimeType:', mimeType);

            recorder.ondataavailable = (e) => {
                console.log('[Recorder] Data chunk:', e.data.size, 'bytes');
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                setIsRecording(false);
                console.log('[Recorder] Stopped. Chunks:', audioChunksRef.current.length);

                if (audioChunksRef.current.length === 0) {
                    alert('No audio was captured. Please try again.');
                    return;
                }

                const blob = new Blob(audioChunksRef.current, { type: mimeType });
                const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
                
                // Prompt user for filename
                const customName = window.prompt('Recording finished! Enter a name for this audio file:', 'My Recording');
                let filename;
                if (customName && customName.trim() !== '') {
                    filename = `${customName.trim()}.${ext}`;
                } else {
                    filename = `recording_${Date.now()}.${ext}`;
                }
                
                console.log('[Recorder] Blob size:', blob.size, 'bytes, Name:', filename);

                // Insert playable placeholder immediately
                const placeholderUrl = URL.createObjectURL(blob);
                editor?.chain().focus().insertContent({
                    type: 'audio',
                    attrs: { 
                        src: placeholderUrl,
                        filename: filename // Set it immediately so it doesn't flicker
                    }
                }).run();

                try {
                    const audioFile = new File([blob], filename, { type: mimeType });
                    const res = await api.uploadMedia({
                        file: audioFile,
                        filename,
                        mime_type: mimeType,
                        media_type: 'audio',
                        uploaded_from: 'studynotes_inline',
                        source_id: note.note_id
                    });

                    if (res.drive_link) {
                        const isSupabase = res.drive_link.includes('supabase.co');
                        let audioSrc = res.drive_link;

                        if (!isSupabase) {
                            // Legacy Drive logic
                            const driveFileId = res.drive_link.match(/\/d\/([^/]+)/)?.[1];
                            audioSrc = `https://drive.google.com/file/d/${driveFileId}/preview`;
                        }

                        // Find and update the placeholder node using a transaction
                        const { state, view } = editor;
                        const { tr } = state;
                        let found = false;
                        
                        state.doc.descendants((node, pos) => {
                            if (found) return false;
                            if (node.type.name === 'audio' && node.attrs.src === placeholderUrl) {
                                tr.setNodeMarkup(pos, null, {
                                    ...node.attrs,
                                    src: audioSrc,
                                    media_id: res.media_id,
                                    filename: filename
                                });
                                found = true;
                                return false;
                            }
                        });

                        if (found) {
                            view.dispatch(tr);
                        }

                        const currentMedia = note.audio_urls ? note.audio_urls.split(',').filter(Boolean) : [];
                        const newMediaUrls = currentMedia.includes(res.media_id)
                            ? currentMedia.join(',')
                            : [...currentMedia, res.media_id].join(',');

                        if (window.snSaveTimeout) clearTimeout(window.snSaveTimeout);
                        onSave({
                            ...note,
                            audio_urls: newMediaUrls,
                            content: editor.getHTML()
                        });
                        setRefreshMedia(Date.now());
                    }
                } catch (err) {
                    console.error('Audio upload failed:', err);
                    alert(`Failed to upload recording: ${err.message}`);
                }
            };

            // timeslice=250ms ensures ondataavailable fires every 250ms
            recorder.start(250);
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
            console.log('[Recorder] Started');
        } catch (err) {
            console.error('[Recorder] Error:', err);
            alert('Could not access microphone: ' + err.message);
        }
    };

    const triggerCodeInput = () => {
        codeInputRef.current.click();
    };




    const handleCodeFileInsert = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            // Upload to get the media record
            const res = await api.uploadMedia({
                file: file,
                filename: file.name,
                mime_type: file.type,
                media_type: 'file', // Changed from 'document' to 'file' to match MediaAttachmentsPanel
                uploaded_from: 'studynotes_inline',
                source_id: note.note_id
            });

            if (res.drive_link) {
                // Insert file embed
                console.log('[File Embed] Inserting file node with href:', res.drive_link, 'filename:', file.name, 'media_id:', res.media_id);
                try {
                    editor?.chain().focus().insertContent({
                        type: 'file',
                        attrs: { href: res.drive_link, filename: file.name, media_id: res.media_id }
                    }).run();
                    console.log('[File Embed] Successfully executed insertContent');
                } catch (insertErr) {
                    console.error('[File Embed] Error during insertContent:', insertErr);
                }
                
                const currentMedia = note.file_urls ? note.file_urls.split(',').filter(Boolean) : [];
                const newMediaUrls = currentMedia.includes(res.media_id)
                    ? currentMedia.join(',')
                    : [...currentMedia, res.media_id].join(',');

                if (window.snSaveTimeout) clearTimeout(window.snSaveTimeout);
                onSave({
                    ...note,
                    file_urls: newMediaUrls,
                    content: editor.getHTML()
                });
                // Small delay to ensure DB consistency before refresh
                setTimeout(() => setRefreshMedia(Date.now()), 500);
            }
        } catch (err) {
            console.error('Code file upload failed:', err);
            alert(`Failed to embed code file: ${err.message}`);
        }
        e.target.value = '';
    };;

    const handleFileInsert = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const base64data = await api.fileToBase64(file);
            // Step 1: Insert base64 immediately so user sees it right away
            const dataUri = `data:${file.type};base64,${base64data}`;
            editor?.chain().focus().setImage({ 
                src: dataUri,
                alt: file.name,
                title: file.name
            }).run();

            // Step 2: Upload to Drive in background
            const res = await api.uploadMedia({
                file: file,
                filename: file.name,
                mime_type: file.type,
                media_type: 'image',
                uploaded_from: 'studynotes_inline',
                source_id: note.note_id,
            });

            if (res.drive_link) {
                // Step 3: Replace base64 in editor with persistent Drive URL
                // This is critical — base64 is too large for Google Sheets cells
                const driveUrl = await api.getStreamableUrl(res.drive_link, 'large');
                const json = editor.getJSON();
                
                const replaceBase64 = (nodes) => {
                    if (!nodes) return;
                    for (const node of nodes) {
                        if (node.type === 'image' && node.attrs?.src === dataUri) {
                            node.attrs.src = driveUrl;
                            node.attrs.media_id = res.media_id; // store for delete sync
                        }
                        replaceBase64(node.content);
                    }
                };
                replaceBase64(json.content);
                editor.commands.setContent(json, false);

                // Step 4: Save with the Drive URL content (not base64)
                const currentImages = note.image_urls ? note.image_urls.split(',').filter(Boolean) : [];
                const newImageUrls = currentImages.includes(res.media_id) 
                    ? currentImages.join(',') 
                    : [...currentImages, res.media_id].join(',');

                if (window.snSaveTimeout) clearTimeout(window.snSaveTimeout);
                onSave({ 
                    ...note,
                    image_urls: newImageUrls,
                    content: editor.getHTML()  // Now contains Drive URL, not base64
                });

                // Small delay to ensure DB consistency before refresh
                setTimeout(() => setRefreshMedia(Date.now()), 500);
            }
        } catch (err) {
            console.error('Inline upload failed:', err);
            alert(`Failed to upload image to Drive: ${err.message}`);
        }
        
        e.target.value = '';
    };

    return (
        <div className={`sn-editor-surface ${isReadOnlyFullscreen ? 'sn-readonly-mode' : ''}`} ref={editorSurfaceRef}>
            <div className="sn-editor-title-row">
                <input
                    className="sn-title-h1"
                    value={title}
                    onChange={e => {
                        setTitle(e.target.value);
                        onTriggerAutoSave({ content: editor?.getHTML(), title: e.target.value, folder_id: folderId, tags: tags.join('|') });
                    }}
                    onBlur={flushMeta}
                    placeholder="Untitled"
                    readOnly={isReadOnlyFullscreen}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div className="sn-save-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: autoSaveStatus === 'saving' ? '#10b981' : (autoSaveStatus === 'saved' ? '#ef4444' : '#f59e0b'),
                            boxShadow: autoSaveStatus === 'saving' ? '0 0 12px #10b981' : 'none',
                            animation: autoSaveStatus === 'saving' ? 'sn-pulse-save 1.5s infinite' : 'none',
                            transition: 'all 0.3s ease'
                        }} />
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {autoSaveStatus === 'saving' ? 'Syncing' : (autoSaveStatus === 'saved' ? 'Saved' : 'Waiting')}
                        </span>
                    </div>
                    <span className="sn-header-date">
                        {note.updated_at && !isNaN(new Date(note.updated_at))
                            ? new Date(note.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                            : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <button 
                        onClick={toggleReadOnlyFullscreen} 
                        className="sn-toolbar-btn" 
                        style={{ padding: '4px', opacity: 0.7 }}
                        title={isReadOnlyFullscreen ? 'Exit Read Mode' : 'Read Mode'}
                    >
                        {isReadOnlyFullscreen ? <Minimize size={16} /> : <BookOpen size={16} />}
                    </button>
                    <button 
                        onClick={toggleFullscreen} 
                        className="sn-toolbar-btn" 
                        style={{ padding: '4px', marginLeft: '-0.5rem', opacity: 0.7 }}
                        title={isFullscreen && !isReadOnlyFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                        {isFullscreen && !isReadOnlyFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                    </button>
                </div>
                <style>{`
                    @keyframes sn-pulse-save {
                        0% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.4; transform: scale(1.3); }
                        100% { opacity: 1; transform: scale(1); }
                    }
                `}</style>
            </div>

            <div className="sn-editor-meta-row">
                <div className="sn-meta-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FolderIcon size={14} color="#6b6882" />
                    <select 
                        className="sn-custom-select-dark"
                        value={folderId}
                        onChange={e => {
                            setFolderId(e.target.value);
                            onTriggerAutoSave({ content: editor?.getHTML(), title, folder_id: e.target.value, tags: tags.join('|') });
                        }}
                    >
                        <option value="">Unfoldered</option>
                        {folders.map(f => <option key={f.folder_id} value={f.folder_id}>{f.folder_name}</option>)}
                    </select>
                </div>
                <div className="sn-meta-divider" />
                <div className="sn-meta-item" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Hash size={14} color="#6b6882" />
                    <TagsInput tags={tags} onChange={t => {
                        setTags(t);
                        onTriggerAutoSave({ content: editor?.getHTML(), title, folder_id: folderId, tags: t.join('|') });
                    }} />
                </div>
            </div>

            <div className="sn-editor-toolbar-row">
                <select 
                    className="sn-custom-select-dark" 
                    style={{ width: '80px' }}
                    value={currentHeading}
                    onChange={e => handleHeadingChange(e.target.value)}
                >
                    <option value="Body">Body</option>
                    <option value="H1">H1</option>
                    <option value="H2">H2</option>
                    <option value="H3">H3</option>
                </select>
                <div className="sn-toolbar-sep" />
                <button className={`sn-toolbar-btn ${editor?.isActive('bold') ? 'active' : ''}`} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold size={16} /></button>
                <button className={`sn-toolbar-btn ${editor?.isActive('italic') ? 'active' : ''}`} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic size={16} /></button>
                <button className={`sn-toolbar-btn ${editor?.isActive('underline') ? 'active' : ''}`} onClick={() => editor?.chain().focus().toggleUnderline().run()}><UnderlineIcon size={16} /></button>
                <button className={`sn-toolbar-btn ${editor?.isActive('strike') ? 'active' : ''}`} onClick={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough size={16} /></button>
                <button 
                    className={`sn-toolbar-btn ${editor?.isActive('taskList') ? 'active' : ''}`}
                    onClick={() => editor?.chain().focus().toggleTaskList().run()}
                    title="Task List"
                >
                    <List size={18} />
                </button>
                <button className="sn-toolbar-btn" onClick={triggerImageInput} title="Embed Image">
                    <ImageIcon size={18} />
                </button>
                <button className="sn-toolbar-btn" onClick={() => editor?.chain().focus().insertContent({ type: 'grid', attrs: { rows: 1, columns: 3, cells: [] } }).run()} title="Insert Grid">
                    <Grid3x3 size={18} />
                </button>
                <button 
                    className={`sn-toolbar-btn ${isRecording ? 'active sn-recording-btn' : ''}`} 
                    onClick={startStopRecording} 
                    title={isRecording ? 'Stop Recording' : 'Record Audio'}
                >
                    <Mic size={18} />
                    {isRecording && <span className="sn-rec-dot" />}
                </button>
                <button className="sn-toolbar-btn" onClick={triggerCodeInput} title="Embed Code File">
                    <FileCode size={18} />
                </button>
                <input 
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleFileInsert}
                />
                <input 
                    type="file"
                    ref={codeInputRef}
                    style={{ display: 'none' }}
                    accept=".js,.ts,.tsx,.jsx,.py,.css,.html,.json,.txt,.md,.sh,.env"
                    onChange={handleCodeFileInsert}
                />
                <div className="sn-toolbar-divider" />
                <button 
                    className={`sn-toolbar-btn ${editor?.isActive('codeBlock') ? 'active' : ''}`} onClick={() => editor?.chain().focus().toggleCodeBlock().run()}><Code size={16} /></button>
                <button className={`sn-toolbar-btn ${editor?.isActive('blockquote') ? 'active' : ''}`} onClick={() => editor?.chain().focus().toggleBlockquote().run()}><Quote size={16} /></button>
                <button className={`sn-toolbar-btn ${editor?.isActive('bulletList') ? 'active' : ''}`} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List size={16} /></button>
                <button className={`sn-toolbar-btn ${editor?.isActive('orderedList') ? 'active' : ''}`} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></button>
                <button className="sn-toolbar-btn" onClick={() => editor?.chain().focus().setHorizontalRule().run()}><Minus size={16} /></button>
                <div className="sn-toolbar-sep" />
                <button className="sn-toolbar-btn" onClick={() => editor?.chain().focus().insertContent('@').run()}><AtSign size={16} /></button>
                <span className="sn-toolbar-word-count">{wordCount} words</span>
                <button className="sn-toolbar-btn" onClick={onDelete} style={{ color: '#ef4444' }}><Trash2 size={16} /></button>
            </div>

            {/* 4. WRITING AREA */}
            <div className="sn-editor-writing-area">
                <div className="sn-editor-content-wrapper">
                    <EditorContent editor={editor} />
                </div>
                
                {/* 5. MEDIA PANEL (now scrolls at bottom of document) */}
                <div className="sn-document-media-panel">
                    <MediaShelfWrapper 
                        key={note.note_id}
                        refreshKey={refreshMedia}
                        sourceId={note.note_id} 
                        onMediaChange={(refs) => {
                            onSave({ 
                                audio_urls: refs.audio_refs,
                                image_urls: refs.image_refs,
                                file_urls: refs.file_refs
                            });
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

function MediaShelfWrapper({ sourceId, onMediaChange, refreshKey }) {
    return (
        <div className="media-attachments-panel-wrapper" style={{ width: '100%', border: 'none', margin: 0, padding: 0 }}>
            <MediaAttachmentsPanel sourceId={sourceId} onMediaChange={onMediaChange} refreshKey={refreshKey} />
        </div>
    );
}

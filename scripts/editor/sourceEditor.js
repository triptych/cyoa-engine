import { Events } from '../core/events.js';
import { debounce } from '../utils/helpers.js';

export class SourceEditor {
    constructor(editor) {
        this.editor = editor;
        this.app = editor.app;
        this.isActive = false;
        this.hasUnsavedChanges = false;
    }

    init() {
        // Initialize UI elements
        this.container = document.getElementById('source-editor');
        this.jsonEditor = document.getElementById('json-editor');

        // Create CodeMirror instance for syntax highlighting
        this.setupCodeMirror();

        // Set up event listeners
        this.setupEventListeners();
    }

    setupCodeMirror() {
        // Create a textarea for CodeMirror
        const textarea = document.createElement('textarea');
        textarea.id = 'json-editor-textarea';
        this.jsonEditor.appendChild(textarea);

        // Initialize CodeMirror
        this.cm = CodeMirror.fromTextArea(textarea, {
            mode: { name: 'javascript', json: true },
            theme: 'monokai',
            lineNumbers: true,
            foldGutter: true,
            gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
            matchBrackets: true,
            autoCloseBrackets: true,
            tabSize: 2,
            indentWithTabs: false,
            extraKeys: {
                'Ctrl-S': () => this.save(),
                'Cmd-S': () => this.save(),
                'Tab': 'indentMore',
                'Shift-Tab': 'indentLess'
            }
        });

        // Add error markers
        this.errorMarkers = [];
    }

    setupEventListeners() {
        // Handle editor changes
        this.cm.on('change', debounce(() => {
            this.validateContent();
            this.hasUnsavedChanges = true;
        }, 500));

        // Listen for theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            this.cm.setOption('theme', e.matches ? 'monokai' : 'default');
        });
    }

    activate() {
        this.isActive = true;
        this.refresh();
        // Ensure CodeMirror updates its display
        setTimeout(() => this.cm.refresh(), 0);
    }

    deactivate() {
        this.isActive = false;
    }

    refresh() {
        if (!this.isActive) return;

        const gameData = this.app.state.serialize();
        const formatted = JSON.stringify(gameData, null, 2);

        // Only update if content has changed
        if (formatted !== this.cm.getValue()) {
            this.cm.setValue(formatted);
            this.cm.clearHistory(); // Clear undo/redo history
            this.hasUnsavedChanges = false;
        }
    }

    reset() {
        this.cm.setValue('');
        this.clearErrors();
        this.hasUnsavedChanges = false;
    }

    validateContent() {
        this.clearErrors();

        try {
            const content = this.cm.getValue();
            const data = JSON.parse(content);

            // Validate against game data schema
            this.validateGameData(data);

            // Update status
            this.app.setStatus('JSON is valid');
            return true;
        } catch (error) {
            this.handleError(error);
            return false;
        }
    }

    validateGameData(data) {
        // Basic structure validation
        if (!data.version) throw new Error('Missing version');
        if (!data.metadata) throw new Error('Missing metadata');
        if (!data.gameState) throw new Error('Missing gameState');
        if (!data.nodes) throw new Error('Missing nodes');

        // Validate nodes
        Object.entries(data.nodes).forEach(([nodeId, node]) => {
            if (!node.type) throw new Error(`Node ${nodeId} missing type`);
            if (!node.content) throw new Error(`Node ${nodeId} missing content`);
            if (!Array.isArray(node.choices)) {
                throw new Error(`Node ${nodeId} choices must be an array`);
            }

            // Validate choices
            node.choices.forEach((choice, index) => {
                if (!choice.text) {
                    throw new Error(`Choice ${index} in node ${nodeId} missing text`);
                }
                if (!choice.nextNode) {
                    throw new Error(`Choice ${index} in node ${nodeId} missing nextNode`);
                }
                if (!data.nodes[choice.nextNode]) {
                    throw new Error(`Choice ${index} in node ${nodeId} references non-existent node`);
                }
            });
        });
    }

    handleError(error) {
        // Parse line number from error message if available
        const lineMatch = error.message.match(/line (\d+)/);
        const line = lineMatch ? parseInt(lineMatch[1]) - 1 : 0;

        // Add error marker
        const marker = document.createElement('div');
        marker.className = 'error-marker';
        marker.title = error.message;

        this.errorMarkers.push(
            this.cm.addLineWidget(line, marker, { above: true })
        );

        // Update status
        this.app.setStatus(error.message, 'error');
    }

    clearErrors() {
        // Clear error markers
        this.errorMarkers.forEach(marker => marker.clear());
        this.errorMarkers = [];
    }

    save() {
        if (this.validateContent()) {
            try {
                const content = this.cm.getValue();
                const data = JSON.parse(content);

                // Update game state
                this.app.state.load(data);
                this.hasUnsavedChanges = false;

                // Update status
                this.app.setStatus('Changes saved');
            } catch (error) {
                this.app.setStatus('Error saving changes: ' + error.message, 'error');
            }
        }
    }

    handleNodeUpdate(nodeId) {
        if (this.isActive) {
            this.refresh();
        }
    }

    handleNodeDelete(nodeId) {
        if (this.isActive) {
            this.refresh();
        }
    }

    handleNodeConnection(fromNodeId, toNodeId) {
        if (this.isActive) {
            this.refresh();
        }
    }

    handleNodeDisconnection(fromNodeId, toNodeId) {
        if (this.isActive) {
            this.refresh();
        }
    }
}

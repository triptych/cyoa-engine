import { Events } from '../core/events.js';
import { SourceEditor } from './sourceEditor.js';
import { GridEditor } from './gridEditor.js';
import { ModulePanel } from './modulePanel.js';

export class Editor {
    constructor(app) {
        this.app = app;
        this.currentMode = 'source'; // 'source' or 'grid'
        this.sourceEditor = new SourceEditor(this);
        this.gridEditor = new GridEditor(this);
        this.modulePanel = new ModulePanel(this);
    }

    init() {
        // Initialize UI elements
        this.container = document.getElementById('editor-view');
        this.sourcePanel = document.getElementById('source-editor');
        this.gridPanel = document.getElementById('grid-editor');

        // Initialize mode toggle buttons
        this.sourceModeBtn = document.getElementById('sourceMode');
        this.gridModeBtn = document.getElementById('gridMode');

        // Set up event listeners
        this.setupEventListeners();

        // Initialize sub-components
        this.sourceEditor.init();
        this.gridEditor.init();
        this.modulePanel.init();

        // Set initial mode
        this.setMode(this.currentMode);
    }

    setupEventListeners() {
        // Mode switching
        this.sourceModeBtn?.addEventListener('click', () => this.setMode('source'));
        this.gridModeBtn?.addEventListener('click', () => this.setMode('grid'));

        // Listen for game state changes
        this.app.state.on(Events.STATE_CHANGE, () => this.refresh());
        this.app.state.on(Events.STATE_LOADED, () => this.refresh());
        this.app.state.on(Events.STATE_RESET, () => this.reset());

        // Listen for node events
        this.app.state.on(Events.NODE_UPDATED, ({ nodeId }) => this.handleNodeUpdate(nodeId));
        this.app.state.on(Events.NODE_DELETED, ({ nodeId }) => this.handleNodeDelete(nodeId));
        this.app.state.on(Events.NODE_CONNECTED, ({ fromNodeId, toNodeId }) =>
            this.handleNodeConnection(fromNodeId, toNodeId));
        this.app.state.on(Events.NODE_DISCONNECTED, ({ fromNodeId, toNodeId }) =>
            this.handleNodeDisconnection(fromNodeId, toNodeId));
    }

    setMode(mode) {
        this.currentMode = mode;

        // Update UI
        if (mode === 'source') {
            this.sourcePanel?.classList.remove('hidden');
            this.gridPanel?.classList.add('hidden');
            this.sourceModeBtn?.classList.add('active');
            this.gridModeBtn?.classList.remove('active');
            this.sourceEditor.activate();
            this.gridEditor.deactivate();
        } else {
            this.gridPanel?.classList.remove('hidden');
            this.sourcePanel?.classList.add('hidden');
            this.gridModeBtn?.classList.add('active');
            this.sourceModeBtn?.classList.remove('active');
            this.gridEditor.activate();
            this.sourceEditor.deactivate();
        }

        // Emit mode change event
        this.app.emit(Events.EDITOR_CHANGE, { mode });
    }

    refresh() {
        // Refresh both editors
        this.sourceEditor.refresh();
        this.gridEditor.refresh();
        this.modulePanel.refresh();
    }

    reset() {
        // Reset both editors
        this.sourceEditor.reset();
        this.gridEditor.reset();
        this.modulePanel.reset();
    }

    handleNodeUpdate(nodeId) {
        // Update node in both editors
        this.sourceEditor.handleNodeUpdate(nodeId);
        this.gridEditor.handleNodeUpdate(nodeId);
    }

    handleNodeDelete(nodeId) {
        // Remove node from both editors
        this.sourceEditor.handleNodeDelete(nodeId);
        this.gridEditor.handleNodeDelete(nodeId);
    }

    handleNodeConnection(fromNodeId, toNodeId) {
        // Update connection in both editors
        this.sourceEditor.handleNodeConnection(fromNodeId, toNodeId);
        this.gridEditor.handleNodeConnection(fromNodeId, toNodeId);
    }

    handleNodeDisconnection(fromNodeId, toNodeId) {
        // Remove connection in both editors
        this.sourceEditor.handleNodeDisconnection(fromNodeId, toNodeId);
        this.gridEditor.handleNodeDisconnection(fromNodeId, toNodeId);
    }

    createNode(position = { x: 0, y: 0 }) {
        const nodeId = this.app.state.createNode({
            position,
            type: 'story',
            content: 'New story node',
            choices: []
        });
        return nodeId;
    }

    updateNode(nodeId, updates) {
        this.app.state.updateNode(nodeId, updates);
    }

    deleteNode(nodeId) {
        this.app.state.deleteNode(nodeId);
    }

    connectNodes(fromNodeId, toNodeId, choiceData) {
        this.app.state.connectNodes(fromNodeId, toNodeId, choiceData);
    }

    disconnectNodes(fromNodeId, toNodeId) {
        this.app.state.disconnectNodes(fromNodeId, toNodeId);
    }

    getNode(nodeId) {
        return this.app.state.getNode(nodeId);
    }

    getAllNodes() {
        return this.app.state.getAllNodes();
    }
}

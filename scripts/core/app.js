// Core application initialization and management
import { Editor } from '../editor/editor.js';
import { Player } from '../player/player.js';
import { GameState } from './gameState.js';
import { EventEmitter } from './events.js';

class App extends EventEmitter {
    constructor() {
        super();
        this.state = new GameState();
        this.editor = new Editor(this);
        this.player = new Player(this);
        this.currentMode = 'edit'; // 'edit' or 'play'
        this.setupEventListeners();
    }

    init() {
        // Initialize UI elements
        this.editorView = document.getElementById('editor-view');
        this.playerView = document.getElementById('player-view');
        this.statusBar = document.getElementById('status-bar');

        // Initialize mode buttons
        this.playModeBtn = document.getElementById('playMode');
        this.editModeBtn = document.getElementById('editMode');

        // Initialize action buttons
        this.newGameBtn = document.getElementById('newGame');
        this.loadGameBtn = document.getElementById('loadGame');
        this.saveGameBtn = document.getElementById('saveGame');

        // Set initial mode
        this.setMode(this.currentMode);

        // Initialize modules
        this.editor.init();
        this.player.init();
    }

    setupEventListeners() {
        // Mode switching
        this.playModeBtn?.addEventListener('click', () => this.setMode('play'));
        this.editModeBtn?.addEventListener('click', () => this.setMode('edit'));

        // File operations
        this.newGameBtn?.addEventListener('click', () => this.newGame());
        this.loadGameBtn?.addEventListener('click', () => this.loadGame());
        this.saveGameBtn?.addEventListener('click', () => this.saveGame());

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key.toLowerCase()) {
                    case 's':
                        e.preventDefault();
                        this.saveGame();
                        break;
                    case 'o':
                        e.preventDefault();
                        this.loadGame();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.newGame();
                        break;
                }
            }
        });
    }

    setMode(mode) {
        this.currentMode = mode;

        // Update UI
        if (mode === 'play') {
            this.editorView?.classList.add('hidden');
            this.playerView?.classList.remove('hidden');
            this.playModeBtn?.classList.add('active');
            this.editModeBtn?.classList.remove('active');
        } else {
            this.playerView?.classList.add('hidden');
            this.editorView?.classList.remove('hidden');
            this.editModeBtn?.classList.add('active');
            this.playModeBtn?.classList.remove('active');
        }

        // Emit mode change event
        this.emit('modeChange', { mode });
    }

    async newGame() {
        if (await this.confirmUnsavedChanges()) {
            this.state.reset();
            this.editor.reset();
            this.player.reset();
            this.setStatus('New game created');
        }
    }

    async loadGame() {
        if (await this.confirmUnsavedChanges()) {
            try {
                const fileHandle = await window.showOpenFilePicker({
                    types: [{
                        description: 'CYOA Game Files',
                        accept: { 'application/json': ['.json'] }
                    }]
                });

                const file = await fileHandle[0].getFile();
                const content = await file.text();
                const gameData = JSON.parse(content);

                this.state.load(gameData);
                this.editor.refresh();
                this.player.refresh();
                this.setStatus('Game loaded successfully');
            } catch (error) {
                if (error.name !== 'AbortError') {
                    this.setStatus('Error loading game: ' + error.message, 'error');
                }
            }
        }
    }

    async saveGame() {
        try {
            const gameData = this.state.serialize();
            const blob = new Blob([JSON.stringify(gameData, null, 2)], {
                type: 'application/json'
            });

            const fileHandle = await window.showSaveFilePicker({
                types: [{
                    description: 'CYOA Game Files',
                    accept: { 'application/json': ['.json'] }
                }]
            });

            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();

            this.state.markSaved();
            this.setStatus('Game saved successfully');
        } catch (error) {
            if (error.name !== 'AbortError') {
                this.setStatus('Error saving game: ' + error.message, 'error');
            }
        }
    }

    async confirmUnsavedChanges() {
        if (this.state.hasUnsavedChanges) {
            const result = await window.confirm('You have unsaved changes. Do you want to continue?');
            return result;
        }
        return true;
    }

    setStatus(message, type = 'info') {
        this.statusBar.textContent = message;
        this.statusBar.className = `status-${type}`;

        // Clear error messages after 5 seconds
        if (type === 'error') {
            setTimeout(() => {
                if (this.statusBar.classList.contains('status-error')) {
                    this.statusBar.textContent = '';
                    this.statusBar.className = '';
                }
            }, 5000);
        }
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
});

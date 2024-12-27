import { Events } from '../core/events.js';
import { generateBezierPath, getRelativePosition, isPointInElement, throttle } from '../utils/helpers.js';

export class GridEditor {
    constructor(editor) {
        this.editor = editor;
        this.app = editor.app;
        this.isActive = false;
        this.nodes = new Map();
        this.connections = new Map();
        this.selectedNode = null;
        this.dragState = null;
        this.connectionState = null;
        this.scale = 1;
        this.offset = { x: 0, y: 0 };
    }

    init() {
        // Initialize UI elements
        this.container = document.getElementById('grid-editor');
        this.canvas = document.getElementById('node-canvas');
        this.minimap = document.getElementById('minimap');

        // Create SVG layer for connections
        this.setupConnectionLayer();

        // Set up event listeners
        this.setupEventListeners();

        // Initialize minimap
        this.setupMinimap();

        // Initialize tabs
        this.setupTabs();
    }

    setupTabs() {
        const tabButtons = this.container.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons and panes
                tabButtons.forEach(btn => btn.classList.remove('active'));
                this.container.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

                // Add active class to clicked button and corresponding pane
                button.classList.add('active');
                const tabName = button.dataset.tab;
                this.container.querySelector(`.tab-pane[data-tab="${tabName}"]`).classList.add('active');

                // Refresh the grid if switching to grid tab
                if (tabName === 'grid') {
                    this.refresh();
                }
            });
        });
    }

    setupConnectionLayer() {
        // Create SVG element for drawing connections
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.style.position = 'absolute';
        this.svg.style.top = '0';
        this.svg.style.left = '0';
        this.svg.style.width = '100%';
        this.svg.style.height = '100%';
        this.svg.style.pointerEvents = 'none';
        this.canvas.appendChild(this.svg);
    }

    setupEventListeners() {
        // Canvas pan and zoom
        this.canvas.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                this.handleZoom(e);
            } else {
                this.handlePan(e);
            }
        });

        // Canvas drag
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.target === this.canvas) {
                this.startCanvasDrag(e);
            }
        });

        // Double click to create node
        this.canvas.addEventListener('dblclick', (e) => {
            if (e.target === this.canvas) {
                this.createNodeAtPosition(e);
            }
        });

        // Context menu for node operations
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (e.target.closest('.story-node')) {
                this.showNodeContextMenu(e);
            }
        });

        // Window events for drag operations
        window.addEventListener('mousemove', throttle((e) => this.handleMouseMove(e), 16));
        window.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if (this.isActive) {
                this.handleKeyPress(e);
            }
        });
    }

    setupMinimap() {
        // Create viewport indicator
        this.minimapViewport = document.createElement('div');
        this.minimapViewport.className = 'viewport';
        this.minimap.appendChild(this.minimapViewport);

        // Minimap drag
        this.minimap.addEventListener('mousedown', (e) => {
            if (e.target === this.minimap) {
                this.startMinimapDrag(e);
            }
        });
    }

    activate() {
        this.isActive = true;
        this.refresh();
    }

    deactivate() {
        this.isActive = false;
        this.selectedNode = null;
        this.dragState = null;
        this.connectionState = null;
    }

    refresh() {
        if (!this.isActive) return;

        // Clear existing nodes
        this.nodes.clear();
        this.connections.clear();
        this.canvas.innerHTML = '';
        this.canvas.appendChild(this.svg);

        // Create nodes from game state
        const nodes = this.editor.getAllNodes();

        // Calculate grid layout
        const nodeSpacing = 400; // Horizontal spacing between nodes
        const rowSpacing = 300;  // Vertical spacing between rows
        const nodesPerRow = 3;   // Maximum nodes per row

        Object.entries(nodes).forEach(([nodeId, nodeData], index) => {
            // If no position is set, calculate grid position
            if (!nodeData.position || (nodeData.position.x === 0 && nodeData.position.y === 0)) {
                const row = Math.floor(index / nodesPerRow);
                const col = index % nodesPerRow;
                nodeData.position = {
                    x: col * nodeSpacing + 50, // 50px initial offset
                    y: row * rowSpacing + 50
                };
                // Update node position in editor state
                this.editor.updateNode(nodeId, { position: nodeData.position });
            }
            this.createNodeElement(nodeId, nodeData);
        });

        // Create connections
        this.updateConnections();

        // Update minimap
        this.updateMinimap();
    }

    reset() {
        this.nodes.clear();
        this.connections.clear();
        this.selectedNode = null;
        this.dragState = null;
        this.connectionState = null;
        this.scale = 1;
        this.offset = { x: 0, y: 0 };
        this.refresh();
    }

    createNodeElement(nodeId, nodeData) {
        // Clone node template
        const template = document.getElementById('node-template');
        const node = template.content.cloneNode(true).children[0];

        // Set node data
        node.id = nodeId;
        node.dataset.nodeId = nodeId;

        // Set position
        const position = nodeData.position || { x: 0, y: 0 };
        node.style.transform = `translate(${position.x}px, ${position.y}px)`;

        // Set content
        const header = node.querySelector('.node-header');
        header.textContent = nodeData.type;

        const content = node.querySelector('.node-content');
        content.textContent = nodeData.content;

        // Add connection points
        this.addConnectionPoints(node);

        // Add to canvas
        this.canvas.appendChild(node);
        this.nodes.set(nodeId, node);

        // Set up node-specific events
        this.setupNodeEvents(node);
    }

    addConnectionPoints(node) {
        const input = document.createElement('div');
        input.className = 'connection-point input';
        node.appendChild(input);

        const output = document.createElement('div');
        output.className = 'connection-point output';
        node.appendChild(output);

        // Connection point events
        input.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startConnection(node, 'input', e);
        });

        output.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startConnection(node, 'output', e);
        });
    }

    setupNodeEvents(node) {
        // Node drag
        node.addEventListener('mousedown', (e) => {
            if (!e.target.classList.contains('connection-point')) {
                this.startNodeDrag(node, e);
            }
        });

        // Node selection
        node.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectNode(node);
        });
    }

    updateConnections() {
        // Clear existing connections
        while (this.svg.firstChild) {
            this.svg.removeChild(this.svg.firstChild);
        }

        // Create connections for each node
        this.nodes.forEach((node, nodeId) => {
            const nodeData = this.editor.getNode(nodeId);
            nodeData.choices.forEach(choice => {
                const targetNode = this.nodes.get(choice.nextNode);
                if (targetNode) {
                    this.createConnection(node, targetNode);
                }
            });
        });
    }

    createConnection(fromNode, toNode) {
        const fromPoint = fromNode.querySelector('.output');
        const toPoint = toNode.querySelector('.input');

        const fromRect = fromPoint.getBoundingClientRect();
        const toRect = toPoint.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.classList.add('connection-line');

        const start = {
            x: (fromRect.left + fromRect.width / 2) - canvasRect.left,
            y: (fromRect.top + fromRect.height / 2) - canvasRect.top
        };

        const end = {
            x: (toRect.left + toRect.width / 2) - canvasRect.left,
            y: (toRect.top + toRect.height / 2) - canvasRect.top
        };

        path.setAttribute('d', generateBezierPath(start.x, start.y, end.x, end.y));
        this.svg.appendChild(path);

        // Store connection
        const key = `${fromNode.id}-${toNode.id}`;
        this.connections.set(key, path);
    }

    updateMinimap() {
        // Calculate content bounds
        const bounds = this.calculateContentBounds();

        // Update viewport indicator
        const canvasRect = this.canvas.getBoundingClientRect();
        const minimapRect = this.minimap.getBoundingClientRect();

        const scaleX = minimapRect.width / bounds.width;
        const scaleY = minimapRect.height / bounds.height;
        const scale = Math.min(scaleX, scaleY);

        this.minimapViewport.style.width = `${canvasRect.width * scale}px`;
        this.minimapViewport.style.height = `${canvasRect.height * scale}px`;

        const x = (-this.offset.x * scale);
        const y = (-this.offset.y * scale);
        this.minimapViewport.style.transform = `translate(${x}px, ${y}px)`;
    }

    calculateContentBounds() {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        this.nodes.forEach(node => {
            const rect = node.getBoundingClientRect();
            minX = Math.min(minX, rect.left);
            minY = Math.min(minY, rect.top);
            maxX = Math.max(maxX, rect.right);
            maxY = Math.max(maxY, rect.bottom);
        });

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    // Event Handlers

    handleMouseMove(e) {
        if (this.dragState) {
            this.handleDrag(e);
        } else if (this.connectionState) {
            this.handleConnection(e);
        }
    }

    handleMouseUp(e) {
        if (this.dragState) {
            this.endDrag(e);
        } else if (this.connectionState) {
            this.endConnection(e);
        }
    }

    handleKeyPress(e) {
        if (e.key === 'Delete' && this.selectedNode) {
            this.deleteSelectedNode();
        }
    }

    // Node Operations

    selectNode(node) {
        if (this.selectedNode) {
            this.selectedNode.classList.remove('selected');
        }
        this.selectedNode = node;
        node.classList.add('selected');
        this.app.emit(Events.NODE_SELECTED, { nodeId: node.dataset.nodeId });
    }

    createNodeAtPosition(e) {
        const rect = this.canvas.getBoundingClientRect();

        // Find the least crowded area
        const existingPositions = Array.from(this.nodes.values()).map(node => {
            const transform = node.style.transform;
            const x = parseInt(transform.match(/translateX\((\d+)px\)/)[1]);
            const y = parseInt(transform.match(/translateY\((\d+)px\)/)[1]);
            return { x, y };
        });

        // Calculate position with minimum overlap
        let bestPosition = { x: 0, y: 0 };
        let maxDistance = 0;

        const clickX = (e.clientX - rect.left) / this.scale - this.offset.x;
        const clickY = (e.clientY - rect.top) / this.scale - this.offset.y;

        // If no existing nodes, place at click position
        if (existingPositions.length === 0) {
            bestPosition = { x: clickX, y: clickY };
        } else {
            // Grid search around click position
            for (let x = clickX - 400; x <= clickX + 400; x += 200) {
                for (let y = clickY - 300; y <= clickY + 300; y += 150) {
                    let minDist = Infinity;
                    existingPositions.forEach(pos => {
                        const dist = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
                        minDist = Math.min(minDist, dist);
                    });
                    if (minDist > maxDistance) {
                        maxDistance = minDist;
                        bestPosition = { x, y };
                    }
                }
            }
        }

        const nodeId = this.editor.createNode({ position: bestPosition });
        this.refresh();

        const node = this.nodes.get(nodeId);
        if (node) {
            this.selectNode(node);
        }
    }

    deleteSelectedNode() {
        if (this.selectedNode) {
            const nodeId = this.selectedNode.dataset.nodeId;
            this.editor.deleteNode(nodeId);
            this.selectedNode = null;
            this.refresh();
        }
    }

    // Drag Operations

    startNodeDrag(node, e) {
        const rect = node.getBoundingClientRect();
        this.dragState = {
            type: 'node',
            node,
            startX: e.clientX,
            startY: e.clientY,
            originalX: rect.left,
            originalY: rect.top
        };
        node.classList.add('dragging');
    }

    startCanvasDrag(e) {
        this.dragState = {
            type: 'canvas',
            startX: e.clientX,
            startY: e.clientY,
            originalX: this.offset.x,
            originalY: this.offset.y
        };
        this.canvas.classList.add('dragging');
    }

    startMinimapDrag(e) {
        const rect = this.minimap.getBoundingClientRect();
        this.dragState = {
            type: 'minimap',
            startX: e.clientX - rect.left,
            startY: e.clientY - rect.top
        };
    }

    handleDrag(e) {
        if (!this.dragState) return;

        switch (this.dragState.type) {
            case 'node':
                this.handleNodeDrag(e);
                break;
            case 'canvas':
                this.handleCanvasDrag(e);
                break;
            case 'minimap':
                this.handleMinimapDrag(e);
                break;
        }
    }

    handleNodeDrag(e) {
        const dx = (e.clientX - this.dragState.startX) / this.scale;
        const dy = (e.clientY - this.dragState.startY) / this.scale;

        const x = this.dragState.originalX + dx;
        const y = this.dragState.originalY + dy;

        this.dragState.node.style.transform = `translate(${x}px, ${y}px)`;
        this.updateConnections();
    }

    handleCanvasDrag(e) {
        const dx = e.clientX - this.dragState.startX;
        const dy = e.clientY - this.dragState.startY;

        this.offset.x = this.dragState.originalX + dx;
        this.offset.y = this.dragState.originalY + dy;

        this.canvas.style.transform = `translate(${this.offset.x}px, ${this.offset.y}px)`;
        this.updateMinimap();
    }

    handleMinimapDrag(e) {
        const rect = this.minimap.getBoundingClientRect();
        const x = e.clientX - rect.left - this.dragState.startX;
        const y = e.clientY - rect.top - this.dragState.startY;

        // Update canvas position based on minimap drag
        this.offset.x = -x * (this.canvas.offsetWidth / rect.width);
        this.offset.y = -y * (this.canvas.offsetHeight / rect.height);

        this.canvas.style.transform = `translate(${this.offset.x}px, ${this.offset.y}px)`;
    }

    endDrag(e) {
        if (!this.dragState) return;

        switch (this.dragState.type) {
            case 'node':
                const node = this.dragState.node;
                node.classList.remove('dragging');

                // Update node position in state
                const nodeId = node.dataset.nodeId;
                const position = {
                    x: parseInt(node.style.transform.match(/translateX\((\d+)px\)/)[1]),
                    y: parseInt(node.style.transform.match(/translateY\((\d+)px\)/)[1])
                };
                this.editor.updateNode(nodeId, { position });
                break;

            case 'canvas':
                this.canvas.classList.remove('dragging');
                break;
        }

        this.dragState = null;
    }

    // Connection Operations

    startConnection(node, type, e) {
        this.connectionState = {
            type,
            node,
            startX: e.clientX,
            startY: e.clientY
        };

        // Create temporary connection line
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.classList.add('connection-line', 'temporary');
        this.svg.appendChild(path);
        this.connectionState.path = path;
    }

    handleConnection(e) {
        if (!this.connectionState) return;

        const rect = this.canvas.getBoundingClientRect();
        const end = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        const start = {
            x: this.connectionState.startX - rect.left,
            y: this.connectionState.startY - rect.top
        };

        this.connectionState.path.setAttribute('d',
            generateBezierPath(start.x, start.y, end.x, end.y));
    }

    endConnection(e) {
        if (!this.connectionState) return;

        const target = e.target;
        if (target.classList.contains('connection-point')) {
            const sourceNode = this.connectionState.node;
            const targetNode = target.closest('.story-node');

            if (sourceNode && targetNode && sourceNode !== targetNode) {
                // Create connection in game state
                const fromId = sourceNode.dataset.nodeId;
                const toId = targetNode.dataset.nodeId;

                if (this.connectionState.type === 'output') {
                    this.editor.connectNodes(fromId, toId);
                } else {
                    this.editor.connectNodes(toId, fromId);
                }
            }
        }

        // Remove temporary connection line
        this.connectionState.path.remove();
        this.connectionState = null;
        this.refresh();
    }

    // Zoom Operations

    handleZoom(e) {
        e.preventDefault();

        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(2, this.scale * delta));

        // Calculate zoom center
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Update scale and offset
        this.scale = newScale;
        this.offset.x = x - (x - this.offset.x) * delta;
        this.offset.y = y - (y - this.offset.y) * delta;

        // Apply transform
        this.canvas.style.transform =
            `translate(${this.offset.x}px, ${this.offset.y}px) scale(${this.scale})`;

        this.updateConnections();
        this.updateMinimap();
    }

    handlePan(e) {
        if (!e.shiftKey) return;

        e.preventDefault();
        const dx = e.deltaX;
        const dy = e.deltaY;

        this.offset.x -= dx;
        this.offset.y -= dy;

        this.canvas.style.transform =
            `translate(${this.offset.x}px, ${this.offset.y}px) scale(${this.scale})`;

        this.updateMinimap();
    }
}

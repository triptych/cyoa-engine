import { Events, EventEmitter } from './events.js';
import { generateId } from '../utils/helpers.js';

/**
 * Manages the game's state and data structure
 */
export class GameState extends EventEmitter {
    constructor() {
        super();
        this.reset();
    }

    /**
     * Reset the game state to default values
     */
    reset() {
        this.data = {
            version: '1.0',
            metadata: {
                title: 'Untitled Adventure',
                author: '',
                created: new Date().toISOString(),
                lastModified: new Date().toISOString()
            },
            gameState: {
                currentNode: null,
                inventory: [],
                variables: {},
                stats: {},
                history: []
            },
            nodes: {}
        };

        this.hasUnsavedChanges = false;
        this.emit(Events.STATE_RESET);
    }

    /**
     * Load game data from a JSON object
     * @param {Object} data - Game data to load
     */
    load(data) {
        try {
            // Validate data structure
            this.validateGameData(data);

            // Update metadata
            this.data = {
                ...data,
                metadata: {
                    ...data.metadata,
                    lastModified: new Date().toISOString()
                }
            };

            this.hasUnsavedChanges = false;
            this.emit(Events.STATE_LOADED, this.data);
        } catch (error) {
            throw new Error(`Invalid game data: ${error.message}`);
        }
    }

    /**
     * Serialize the current game state
     * @returns {Object} Serialized game data
     */
    serialize() {
        return {
            ...this.data,
            metadata: {
                ...this.data.metadata,
                lastModified: new Date().toISOString()
            }
        };
    }

    /**
     * Mark the current state as saved
     */
    markSaved() {
        this.hasUnsavedChanges = false;
        this.emit(Events.STATE_SAVED);
    }

    /**
     * Create a new story node
     * @param {Object} nodeData - Initial node data
     * @returns {string} New node ID
     */
    createNode(nodeData = {}) {
        const nodeId = generateId();
        this.data.nodes[nodeId] = {
            type: 'story',
            content: '',
            choices: [],
            modules: {
                graphics: null,
                battle: null,
                inventory: null
            },
            ...nodeData
        };

        this.hasUnsavedChanges = true;
        this.emit(Events.NODE_UPDATED, { nodeId, node: this.data.nodes[nodeId] });
        return nodeId;
    }

    /**
     * Update an existing node
     * @param {string} nodeId - ID of node to update
     * @param {Object} updates - Properties to update
     */
    updateNode(nodeId, updates) {
        if (!this.data.nodes[nodeId]) {
            throw new Error(`Node ${nodeId} not found`);
        }

        this.data.nodes[nodeId] = {
            ...this.data.nodes[nodeId],
            ...updates
        };

        this.hasUnsavedChanges = true;
        this.emit(Events.NODE_UPDATED, { nodeId, node: this.data.nodes[nodeId] });
    }

    /**
     * Delete a node
     * @param {string} nodeId - ID of node to delete
     */
    deleteNode(nodeId) {
        if (!this.data.nodes[nodeId]) {
            throw new Error(`Node ${nodeId} not found`);
        }

        // Remove any connections to this node
        Object.values(this.data.nodes).forEach(node => {
            node.choices = node.choices.filter(choice => choice.nextNode !== nodeId);
        });

        delete this.data.nodes[nodeId];
        this.hasUnsavedChanges = true;
        this.emit(Events.NODE_DELETED, { nodeId });
    }

    /**
     * Connect two nodes with a choice
     * @param {string} fromNodeId - Source node ID
     * @param {string} toNodeId - Target node ID
     * @param {Object} choiceData - Choice properties
     */
    connectNodes(fromNodeId, toNodeId, choiceData = {}) {
        const fromNode = this.data.nodes[fromNodeId];
        const toNode = this.data.nodes[toNodeId];

        if (!fromNode || !toNode) {
            throw new Error('Invalid node IDs');
        }

        const choice = {
            text: choiceData.text || 'Continue',
            nextNode: toNodeId,
            conditions: choiceData.conditions || [],
            effects: choiceData.effects || []
        };

        fromNode.choices.push(choice);
        this.hasUnsavedChanges = true;
        this.emit(Events.NODE_CONNECTED, { fromNodeId, toNodeId, choice });
    }

    /**
     * Remove a connection between nodes
     * @param {string} fromNodeId - Source node ID
     * @param {string} toNodeId - Target node ID
     */
    disconnectNodes(fromNodeId, toNodeId) {
        const fromNode = this.data.nodes[fromNodeId];
        if (!fromNode) {
            throw new Error(`Node ${fromNodeId} not found`);
        }

        const choiceIndex = fromNode.choices.findIndex(choice => choice.nextNode === toNodeId);
        if (choiceIndex === -1) {
            throw new Error('Nodes are not connected');
        }

        fromNode.choices.splice(choiceIndex, 1);
        this.hasUnsavedChanges = true;
        this.emit(Events.NODE_DISCONNECTED, { fromNodeId, toNodeId });
    }

    /**
     * Validate game data structure
     * @param {Object} data - Game data to validate
     * @throws {Error} If data is invalid
     */
    validateGameData(data) {
        // Check required top-level properties
        const requiredProps = ['version', 'metadata', 'gameState', 'nodes'];
        requiredProps.forEach(prop => {
            if (!(prop in data)) {
                throw new Error(`Missing required property: ${prop}`);
            }
        });

        // Validate metadata
        const requiredMetadata = ['title', 'author', 'created', 'lastModified'];
        requiredMetadata.forEach(prop => {
            if (!(prop in data.metadata)) {
                throw new Error(`Missing required metadata: ${prop}`);
            }
        });

        // Validate game state
        const requiredGameState = ['currentNode', 'inventory', 'variables', 'stats', 'history'];
        requiredGameState.forEach(prop => {
            if (!(prop in data.gameState)) {
                throw new Error(`Missing required game state: ${prop}`);
            }
        });

        // Validate nodes
        if (typeof data.nodes !== 'object') {
            throw new Error('Nodes must be an object');
        }

        // Validate each node
        Object.entries(data.nodes).forEach(([nodeId, node]) => {
            if (!node.type || !node.content || !Array.isArray(node.choices)) {
                throw new Error(`Invalid node structure: ${nodeId}`);
            }
        });
    }

    /**
     * Get a node by ID
     * @param {string} nodeId - Node ID
     * @returns {Object|null} Node data or null if not found
     */
    getNode(nodeId) {
        return this.data.nodes[nodeId] || null;
    }

    /**
     * Get all nodes
     * @returns {Object} Map of all nodes
     */
    getAllNodes() {
        return { ...this.data.nodes };
    }

    /**
     * Update game metadata
     * @param {Object} updates - Metadata updates
     */
    updateMetadata(updates) {
        this.data.metadata = {
            ...this.data.metadata,
            ...updates,
            lastModified: new Date().toISOString()
        };
        this.hasUnsavedChanges = true;
        this.emit(Events.STATE_CHANGE);
    }
}

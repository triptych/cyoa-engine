/**
 * Simple event emitter implementation for handling application events
 */
export class EventEmitter {
    constructor() {
        this.events = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }

        const handlers = this.events.get(event);
        handlers.add(callback);

        // Return unsubscribe function
        return () => {
            handlers.delete(callback);
            if (handlers.size === 0) {
                this.events.delete(event);
            }
        };
    }

    /**
     * Subscribe to an event for one-time execution
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     * @returns {Function} Unsubscribe function
     */
    once(event, callback) {
        const unsubscribe = this.on(event, (...args) => {
            unsubscribe();
            callback(...args);
        });
        return unsubscribe;
    }

    /**
     * Emit an event with data
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        const handlers = this.events.get(event);
        if (handlers) {
            handlers.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Remove all handlers for an event
     * @param {string} event - Event name
     */
    off(event) {
        this.events.delete(event);
    }

    /**
     * Remove all event handlers
     */
    clear() {
        this.events.clear();
    }

    /**
     * Get the number of handlers for an event
     * @param {string} event - Event name
     * @returns {number} Number of handlers
     */
    listenerCount(event) {
        const handlers = this.events.get(event);
        return handlers ? handlers.size : 0;
    }

    /**
     * Check if an event has any handlers
     * @param {string} event - Event name
     * @returns {boolean} True if the event has handlers
     */
    hasListeners(event) {
        return this.listenerCount(event) > 0;
    }
}

/**
 * Event names used throughout the application
 */
export const Events = {
    // Mode changes
    MODE_CHANGE: 'modeChange',

    // Game state
    STATE_CHANGE: 'stateChange',
    STATE_RESET: 'stateReset',
    STATE_LOADED: 'stateLoaded',
    STATE_SAVED: 'stateSaved',

    // Editor events
    EDITOR_CHANGE: 'editorChange',
    NODE_SELECTED: 'nodeSelected',
    NODE_UPDATED: 'nodeUpdated',
    NODE_DELETED: 'nodeDeleted',
    NODE_CONNECTED: 'nodeConnected',
    NODE_DISCONNECTED: 'nodeDisconnected',

    // Player events
    STORY_ADVANCE: 'storyAdvance',
    CHOICE_MADE: 'choiceMade',
    GAME_OVER: 'gameOver',

    // Module events
    MODULE_LOADED: 'moduleLoaded',
    MODULE_ERROR: 'moduleError',

    // UI events
    VIEW_READY: 'viewReady',
    RENDER_COMPLETE: 'renderComplete',

    // System events
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

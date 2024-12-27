import { Events } from '../core/events.js';

export class Player {
    constructor(app) {
        this.app = app;
        this.currentNode = null;
        this.history = [];
        this.moduleHandlers = new Map();

        // Register core module handlers
        this.registerCoreModuleHandlers();
    }

    init() {
        try {
            // Initialize UI elements
            this.container = document.getElementById('player-view');
            this.storyContent = document.getElementById('story-content');
            this.choicesContainer = document.getElementById('choices');
            this.moduleContainer = document.getElementById('game-modules');
            this.resetButton = document.getElementById('reset-game');

            if (!this.container || !this.storyContent || !this.choicesContainer || !this.moduleContainer || !this.resetButton) {
                throw new Error('Required player UI elements not found');
            }

            // Set up event listeners
            this.setupEventListeners();
        } catch (error) {
            console.error('Player initialization error:', error);
            this.app.setStatus('Error initializing player view', 'error');
        }
    }

    registerCoreModuleHandlers() {
        // Story module handler
        this.registerModuleHandler('story', {
            render: (data, node) => {
                // Use either the module content or the node's content
                const content = data?.content || node.content || '';
                return `<div class="story-content">${content}</div>`;
            }
        });

        // Inventory module handler
        this.registerModuleHandler('inventory', {
            render: (data, node) => {
                const items = data.items || [];
                return `
                    <div class="inventory-module">
                        <h3>Inventory</h3>
                        <div class="inventory-items">
                            ${items.map(item => `
                                <div class="inventory-item">
                                    <span class="item-name">${item.name}</span>
                                    <span class="item-quantity">x${item.quantity}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            },
            checkRequirements: (data, gameState) => {
                if (!data.requirements?.length) return true;

                return data.requirements.every(req => {
                    const item = gameState.inventory.find(i => i.id === req.itemId);
                    return item && item.quantity >= req.quantity;
                });
            }
        });

        // Battle module handler
        this.registerModuleHandler('battle', {
            render: (data, node) => {
                const { enemy } = data;
                return `
                    <div class="battle-module">
                        <div class="enemy-info">
                            <h3>${enemy.name}</h3>
                            <div class="stats">
                                <div class="health-bar">
                                    <div class="health-fill" style="width: ${enemy.health}%"></div>
                                </div>
                                <div class="stat">Attack: ${enemy.attack}</div>
                                <div class="stat">Defense: ${enemy.defense}</div>
                            </div>
                        </div>
                        <div class="battle-actions">
                            <button class="action-btn" data-action="attack">Attack</button>
                            <button class="action-btn" data-action="defend">Defend</button>
                            <button class="action-btn" data-action="flee">Flee</button>
                        </div>
                    </div>
                `;
            },
            handleAction: async (action, data, gameState) => {
                switch (action) {
                    case 'attack':
                        // Calculate damage
                        const damage = Math.max(gameState.stats.attack - data.enemy.defense, 1);
                        data.enemy.health -= damage;

                        // Enemy counter-attack
                        if (data.enemy.health > 0) {
                            const enemyDamage = Math.max(data.enemy.attack - gameState.stats.defense, 1);
                            gameState.stats.health -= enemyDamage;
                        }

                        // Check battle end conditions
                        if (data.enemy.health <= 0) {
                            // Victory
                            gameState.stats.experience += data.rewards.experience;
                            gameState.stats.gold += data.rewards.gold;
                            return { victory: true };
                        } else if (gameState.stats.health <= 0) {
                            // Defeat
                            return { defeat: true };
                        }
                        break;

                    case 'defend':
                        // Increase defense temporarily
                        gameState.stats.defense += 5;
                        setTimeout(() => {
                            gameState.stats.defense -= 5;
                        }, 1000);
                        break;

                    case 'flee':
                        // Random chance to flee
                        if (Math.random() > 0.5) {
                            return { fled: true };
                        }
                        break;
                }

                return { ongoing: true };
            }
        });

        // Graphics module handler
        this.registerModuleHandler('graphics', {
            render: (data, node) => {
                const characters = data.characters || [];
                return `
                    <div class="graphics-module">
                        ${data.background ? `
                            <div class="background"
                                 style="background-image: url('${data.background}')">
                            </div>
                        ` : ''}
                        <div class="characters">
                            ${characters.map(char => `
                                <div class="character ${char.animation}"
                                     style="background-image: url('${char.image}');
                                            grid-area: ${char.position};">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        });
    }

    registerModuleHandler(moduleId, handler) {
        this.moduleHandlers.set(moduleId, handler);
    }

    setupEventListeners() {
        // Listen for mode changes
        this.app.on(Events.MODE_CHANGE, ({ mode }) => {
            if (mode === 'play') {
                this.startGame();
            }
        });

        // Handle choice selection
        this.choicesContainer.addEventListener('click', (e) => {
            const choice = e.target.closest('.choice-btn');
            if (choice) {
                this.handleChoice(choice.dataset.index);
            }
        });

        // Handle module actions
        this.moduleContainer.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('.action-btn');
            if (actionBtn) {
                this.handleModuleAction(actionBtn.dataset.action);
            }
        });

        // Handle reset button click
        this.resetButton.addEventListener('click', () => {
            // Preserve the current nodes and metadata
            const { nodes, metadata } = this.app.state.data;

            // Reset game state
            this.app.state.data.gameState = {
                currentNode: 'start',
                inventory: [],
                variables: {},
                stats: {
                    health: 100,
                    attack: 10,
                    defense: 5,
                    experience: 0,
                    gold: 0
                },
                history: []
            };

            // Restore nodes and metadata
            this.app.state.data.nodes = nodes;
            this.app.state.data.metadata = metadata;

            this.refresh();
            this.app.setStatus('Game reset', 'success');
        });
    }

    startGame() {
        // Get the current game state from the data structure
        const gameState = this.app.state.data.gameState;

        // If no current node is set, initialize with start node
        if (!gameState.currentNode) {
            gameState.currentNode = 'start';
        }

        // Initialize other state properties if not present
        if (!gameState.inventory) gameState.inventory = [];
        if (!gameState.variables) gameState.variables = {};
        if (!gameState.history) gameState.history = [];
        if (!gameState.stats) {
            gameState.stats = {
                health: 100,
                attack: 10,
                defense: 5,
                experience: 0,
                gold: 0
            };
        }

        const startingNodeId = gameState.currentNode;
        if (this.app.state.getNode(startingNodeId)) {
            this.navigateToNode(startingNodeId);
        } else {
            this.app.setStatus('No starting node found', 'error');
        }
    }

    async navigateToNode(nodeId) {
        const node = this.app.state.getNode(nodeId);
        if (!node) return;

        // Update current node
        this.currentNode = node;
        this.app.state.data.gameState.currentNode = nodeId;
        this.app.state.data.gameState.history.push(nodeId);

        // Render node content
        await this.renderNode(node);

        // Emit event
        this.app.emit(Events.STORY_ADVANCE, { nodeId, node });
    }

    async renderNode(node) {
        // Clear previous content
        this.storyContent.innerHTML = '';
        this.choicesContainer.innerHTML = '';
        this.moduleContainer.innerHTML = '';

        // Render modules
        for (const [moduleId, moduleData] of Object.entries(node.modules)) {
            if (!moduleData) continue;

            const handler = this.moduleHandlers.get(moduleId);
            if (handler?.render) {
                const moduleHtml = handler.render(moduleData, node);

                if (moduleId === 'story') {
                    this.storyContent.innerHTML = moduleHtml;
                } else {
                    const moduleElement = document.createElement('div');
                    moduleElement.className = `module ${moduleId}-module`;
                    moduleElement.innerHTML = moduleHtml;
                    this.moduleContainer.appendChild(moduleElement);
                }
            }
        }

        // Render choices
        await this.renderChoices(node);
    }

    async renderChoices(node) {
        const template = document.getElementById('choice-template');
        if (!template) {
            console.error('Choice template not found');
            this.app.setStatus('Error: Choice template not found', 'error');
            return;
        }

        // Filter available choices based on conditions
        const availableChoices = await this.filterAvailableChoices(node.choices);

        try {
            availableChoices.forEach((choice, index) => {
                const choiceElement = template.content.cloneNode(true).children[0];
                choiceElement.textContent = choice.text;
                choiceElement.dataset.index = index;
                this.choicesContainer.appendChild(choiceElement);
            });
        } catch (error) {
            console.error('Error rendering choices:', error);
            this.app.setStatus('Error rendering choices', 'error');
        }
    }

    async filterAvailableChoices(choices) {
        const available = [];

        for (const choice of choices) {
            let isAvailable = true;

            // Check module requirements
            if (this.currentNode.modules) {
                for (const [moduleId, moduleData] of Object.entries(this.currentNode.modules)) {
                    const handler = this.moduleHandlers.get(moduleId);
                    if (handler?.checkRequirements) {
                        isAvailable = await handler.checkRequirements(
                            moduleData,
                            this.app.state.data.gameState
                        );
                        if (!isAvailable) break;
                    }
                }
            }

            // Check choice conditions
            if (isAvailable && choice.conditions?.length) {
                isAvailable = choice.conditions.every(condition => {
                    switch (condition.type) {
                        case 'variable':
                            return this.app.state.data.gameState.variables[condition.variable] === condition.value;
                        case 'item':
                            const item = this.app.state.data.gameState.inventory.find(i => i.id === condition.itemId);
                            return item && item.quantity >= condition.quantity;
                        case 'stat':
                            return this.app.state.data.gameState.stats[condition.stat] >= condition.value;
                        default:
                            return true;
                    }
                });
            }

            if (isAvailable) {
                available.push(choice);
            }
        }

        return available;
    }

    async handleChoice(index) {
        const choice = this.currentNode.choices[index];
        if (!choice) return;

        // Apply choice effects
        if (choice.effects?.length) {
            choice.effects.forEach(effect => {
                switch (effect.type) {
                    case 'variable':
                        this.app.state.data.gameState.variables[effect.variable] = effect.value;
                        break;
                    case 'item':
                        const item = this.app.state.data.gameState.inventory.find(i => i.id === effect.itemId);
                        if (item) {
                            item.quantity += effect.quantity;
                            if (item.quantity <= 0) {
                                const index = this.app.state.data.gameState.inventory.indexOf(item);
                                this.app.state.data.gameState.inventory.splice(index, 1);
                            }
                        } else if (effect.quantity > 0) {
                            this.app.state.data.gameState.inventory.push({
                                id: effect.itemId,
                                quantity: effect.quantity
                            });
                        }
                        break;
                    case 'stat':
                        this.app.state.data.gameState.stats[effect.stat] += effect.value;
                        break;
                }
            });
        }

        // Navigate to next node
        await this.navigateToNode(choice.nextNode);
    }

    async handleModuleAction(action) {
        // Find active module with action handler
        for (const [moduleId, moduleData] of Object.entries(this.currentNode.modules)) {
            const handler = this.moduleHandlers.get(moduleId);
            if (handler?.handleAction) {
                const result = await handler.handleAction(
                    action,
                    moduleData,
                    this.app.state.data.gameState
                );

                if (result) {
                    // Handle action result
                    if (result.victory || result.defeat || result.fled) {
                        // Find appropriate choice based on result
                        const choice = this.currentNode.choices.find(c => {
                            if (result.victory && c.condition === 'victory') return true;
                            if (result.defeat && c.condition === 'defeat') return true;
                            if (result.fled && c.condition === 'fled') return true;
                            return false;
                        });

                        if (choice) {
                            await this.navigateToNode(choice.nextNode);
                        }
                    } else {
                        // Refresh current node display
                        await this.renderNode(this.currentNode);
                    }
                }
            }
        }
    }

    reset() {
        this.currentNode = null;
        this.history = [];
        this.storyContent.innerHTML = '';
        this.choicesContainer.innerHTML = '';
        this.moduleContainer.innerHTML = '';
    }

    refresh() {
        // Reset UI
        this.reset();

        // If we're in play mode, start the game with the loaded state
        if (this.app.currentMode === 'play') {
            this.startGame();
        }
    }
}

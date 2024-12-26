import { Events } from '../core/events.js';

export class ModulePanel {
    constructor(editor) {
        this.editor = editor;
        this.app = editor.app;
        this.activeNode = null;
        this.modules = new Map();

        // Register core modules
        this.registerCoreModules();
    }

    init() {
        // Initialize UI elements
        this.container = document.getElementById('module-panel');
        this.moduleList = document.getElementById('module-list');

        // Set up event listeners
        this.setupEventListeners();
    }

    registerCoreModules() {
        // Story module (always present)
        this.registerModule('story', {
            name: 'Story',
            icon: '📝',
            fields: [
                {
                    name: 'content',
                    type: 'textarea',
                    label: 'Content',
                    default: ''
                },
                {
                    name: 'type',
                    type: 'select',
                    label: 'Type',
                    options: ['story', 'decision', 'ending'],
                    default: 'story'
                }
            ]
        });

        // Inventory module
        this.registerModule('inventory', {
            name: 'Inventory',
            icon: '🎒',
            fields: [
                {
                    name: 'items',
                    type: 'array',
                    label: 'Items',
                    itemTemplate: {
                        name: 'item',
                        type: 'object',
                        fields: [
                            { name: 'id', type: 'text', label: 'ID' },
                            { name: 'name', type: 'text', label: 'Name' },
                            { name: 'quantity', type: 'number', label: 'Quantity', default: 1 }
                        ]
                    }
                },
                {
                    name: 'requirements',
                    type: 'array',
                    label: 'Requirements',
                    itemTemplate: {
                        name: 'requirement',
                        type: 'object',
                        fields: [
                            { name: 'itemId', type: 'text', label: 'Item ID' },
                            { name: 'quantity', type: 'number', label: 'Required Quantity', default: 1 }
                        ]
                    }
                }
            ]
        });

        // Battle module
        this.registerModule('battle', {
            name: 'Battle',
            icon: '⚔️',
            fields: [
                {
                    name: 'enemy',
                    type: 'object',
                    label: 'Enemy',
                    fields: [
                        { name: 'name', type: 'text', label: 'Name' },
                        { name: 'health', type: 'number', label: 'Health', default: 100 },
                        { name: 'attack', type: 'number', label: 'Attack', default: 10 },
                        { name: 'defense', type: 'number', label: 'Defense', default: 5 }
                    ]
                },
                {
                    name: 'rewards',
                    type: 'object',
                    label: 'Rewards',
                    fields: [
                        { name: 'experience', type: 'number', label: 'Experience', default: 0 },
                        { name: 'gold', type: 'number', label: 'Gold', default: 0 }
                    ]
                }
            ]
        });

        // Graphics module
        this.registerModule('graphics', {
            name: 'Graphics',
            icon: '🎨',
            fields: [
                {
                    name: 'background',
                    type: 'image',
                    label: 'Background Image'
                },
                {
                    name: 'characters',
                    type: 'array',
                    label: 'Characters',
                    itemTemplate: {
                        name: 'character',
                        type: 'object',
                        fields: [
                            { name: 'image', type: 'image', label: 'Character Image' },
                            { name: 'position', type: 'select', label: 'Position',
                              options: ['left', 'center', 'right'] },
                            { name: 'animation', type: 'select', label: 'Animation',
                              options: ['none', 'fadeIn', 'slideIn'] }
                        ]
                    }
                }
            ]
        });
    }

    registerModule(id, config) {
        this.modules.set(id, {
            id,
            ...config
        });
    }

    setupEventListeners() {
        // Listen for node selection
        this.app.on(Events.NODE_SELECTED, ({ nodeId }) => {
            this.setActiveNode(nodeId);
        });

        // Listen for node updates
        this.app.on(Events.NODE_UPDATED, ({ nodeId }) => {
            if (this.activeNode && this.activeNode === nodeId) {
                this.refresh();
            }
        });
    }

    setActiveNode(nodeId) {
        this.activeNode = nodeId;
        this.refresh();
    }

    refresh() {
        if (!this.activeNode) {
            this.moduleList.innerHTML = '<p>Select a node to configure modules</p>';
            return;
        }

        const node = this.editor.getNode(this.activeNode);
        if (!node) return;

        this.moduleList.innerHTML = '';
        this.modules.forEach(module => {
            const moduleElement = this.createModuleElement(module, node);
            this.moduleList.appendChild(moduleElement);
        });
    }

    createModuleElement(module, node) {
        const container = document.createElement('div');
        container.className = 'module-item';

        // Module header
        const header = document.createElement('div');
        header.className = 'module-header';
        header.innerHTML = `
            <span class="module-icon">${module.icon}</span>
            <span class="module-name">${module.name}</span>
            <label class="module-toggle">
                <input type="checkbox"
                       ${node.modules[module.id] ? 'checked' : ''}>
                <span class="toggle-slider"></span>
            </label>
        `;

        // Module content
        const content = document.createElement('div');
        content.className = 'module-content';
        if (node.modules[module.id]) {
            content.appendChild(this.createModuleFields(module, node.modules[module.id]));
        }

        container.appendChild(header);
        container.appendChild(content);

        // Toggle module
        const toggle = header.querySelector('input[type="checkbox"]');
        toggle.addEventListener('change', () => {
            if (toggle.checked) {
                const defaultData = this.createDefaultModuleData(module);
                this.editor.updateNode(this.activeNode, {
                    modules: {
                        ...node.modules,
                        [module.id]: defaultData
                    }
                });
            } else {
                const { [module.id]: removed, ...remainingModules } = node.modules;
                this.editor.updateNode(this.activeNode, {
                    modules: remainingModules
                });
            }
        });

        return container;
    }

    createModuleFields(module, data) {
        const container = document.createElement('div');
        container.className = 'module-fields';

        module.fields.forEach(field => {
            const fieldElement = this.createField(field, data[field.name], (value) => {
                this.updateModuleData(module.id, field.name, value);
            });
            container.appendChild(fieldElement);
        });

        return container;
    }

    createField(field, value, onChange) {
        const container = document.createElement('div');
        container.className = 'field-container';

        const label = document.createElement('label');
        label.textContent = field.label;
        container.appendChild(label);

        let input;
        switch (field.type) {
            case 'text':
            case 'number':
                input = document.createElement('input');
                input.type = field.type;
                input.value = value || field.default || '';
                input.addEventListener('change', () => onChange(input.value));
                break;

            case 'textarea':
                input = document.createElement('textarea');
                input.value = value || field.default || '';
                input.addEventListener('change', () => onChange(input.value));
                break;

            case 'select':
                input = document.createElement('select');
                field.options.forEach(option => {
                    const opt = document.createElement('option');
                    opt.value = option;
                    opt.textContent = option;
                    opt.selected = option === (value || field.default);
                    input.appendChild(opt);
                });
                input.addEventListener('change', () => onChange(input.value));
                break;

            case 'array':
                input = document.createElement('div');
                input.className = 'array-field';

                const items = value || [];
                items.forEach((item, index) => {
                    const itemContainer = this.createArrayItem(field.itemTemplate, item, (newValue) => {
                        items[index] = newValue;
                        onChange(items);
                    });
                    input.appendChild(itemContainer);
                });

                const addButton = document.createElement('button');
                addButton.textContent = `Add ${field.itemTemplate.name}`;
                addButton.addEventListener('click', () => {
                    const newItem = this.createDefaultFieldValue(field.itemTemplate);
                    items.push(newItem);
                    onChange(items);
                    this.refresh();
                });
                input.appendChild(addButton);
                break;

            case 'object':
                input = document.createElement('div');
                input.className = 'object-field';

                field.fields.forEach(subField => {
                    const subContainer = this.createField(
                        subField,
                        value?.[subField.name],
                        (newValue) => {
                            onChange({
                                ...value,
                                [subField.name]: newValue
                            });
                        }
                    );
                    input.appendChild(subContainer);
                });
                break;

            case 'image':
                input = document.createElement('div');
                input.className = 'image-field';

                const preview = document.createElement('img');
                preview.src = value || '';
                preview.alt = field.label;

                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*';
                fileInput.addEventListener('change', async () => {
                    const file = fileInput.files[0];
                    if (file) {
                        // Convert to data URL
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            preview.src = e.target.result;
                            onChange(e.target.result);
                        };
                        reader.readAsDataURL(file);
                    }
                });

                input.appendChild(preview);
                input.appendChild(fileInput);
                break;
        }

        container.appendChild(input);
        return container;
    }

    createArrayItem(template, data, onChange) {
        const container = document.createElement('div');
        container.className = 'array-item';

        const fields = this.createModuleFields({ fields: template.fields }, data);
        container.appendChild(fields);

        const removeButton = document.createElement('button');
        removeButton.textContent = '×';
        removeButton.className = 'remove-item';
        removeButton.addEventListener('click', () => {
            container.remove();
            onChange(null);
        });
        container.appendChild(removeButton);

        return container;
    }

    createDefaultModuleData(module) {
        const data = {};
        module.fields.forEach(field => {
            data[field.name] = this.createDefaultFieldValue(field);
        });
        return data;
    }

    createDefaultFieldValue(field) {
        switch (field.type) {
            case 'array':
                return [];
            case 'object':
                const obj = {};
                field.fields.forEach(subField => {
                    obj[subField.name] = this.createDefaultFieldValue(subField);
                });
                return obj;
            default:
                return field.default !== undefined ? field.default : null;
        }
    }

    updateModuleData(moduleId, fieldName, value) {
        const node = this.editor.getNode(this.activeNode);
        if (!node || !node.modules[moduleId]) return;

        this.editor.updateNode(this.activeNode, {
            modules: {
                ...node.modules,
                [moduleId]: {
                    ...node.modules[moduleId],
                    [fieldName]: value
                }
            }
        });
    }

    reset() {
        this.activeNode = null;
        this.refresh();
    }
}

# Creating a CYOA Game: Full Tutorial

This tutorial walks through creating a Choose Your Own Adventure (CYOA) game like the one in `full_demo.json`. We'll cover the structure, features, and how to build your own branching narrative game.

## File Structure Overview

A CYOA game file consists of these main sections:

```json
{
  "version": "1.0",
  "metadata": { ... },
  "gameState": { ... },
  "nodes": { ... }
}
```

## 1. Metadata

The metadata section contains basic information about your game:

```json
"metadata": {
  "title": "Your Game Title",
  "author": "Your Name",
  "created": "2024-01-15T00:00:00.000Z",
  "lastModified": "2024-01-15T00:00:00.000Z"
}
```

## 2. Game State

The gameState section defines initial conditions and tracked variables:

```json
"gameState": {
  "currentNode": "intro",  // Starting node
  "inventory": [],         // Player's items
  "variables": {          // Custom game variables
    "hasMap": false,
    "questComplete": false
  },
  "stats": {              // Player statistics
    "health": 100,
    "attack": 10,
    "defense": 5,
    "magic": 0,
    "gold": 0
  },
  "history": []           // Tracks visited nodes
}
```

## 3. Nodes

Nodes are the building blocks of your game. Each node represents a scene or situation.

### Basic Node Structure

```json
"nodeName": {
  "type": "story",           // Node type (story, battle, ending)
  "content": "Scene text",   // Main content text
  "choices": [ ... ],        // Available choices
  "modules": { ... }         // Visual and functional modules
}
```

### Types of Nodes

1. **Story Nodes**: Basic narrative scenes
2. **Battle Nodes**: Combat encounters
3. **Ending Nodes**: Game conclusion scenes

### Creating Choices

Choices determine branching paths:

```json
"choices": [
  {
    "text": "Option text",        // What player sees
    "nextNode": "target_node",    // Where this leads
    "conditions": [               // Optional requirements
      {
        "type": "stat",
        "stat": "gold",
        "value": 50,
        "comparison": ">="
      }
    ],
    "effects": [                  // What happens on choice
      {
        "type": "stat",
        "stat": "gold",
        "value": -50
      },
      {
        "type": "item",
        "itemId": "potion",
        "quantity": 1
      }
    ]
  }
]
```

### Modules

Modules enhance nodes with additional features:

```json
"modules": {
  "story": {
    "type": "story",
    "content": "Scene description"
  },
  "graphics": {
    "background": "SVG or image URL",
    "animation": "effectName",
    "characters": [
      {
        "image": "character SVG/URL",
        "position": "center",
        "animation": "slideIn"
      }
    ]
  },
  "battle": {
    "enemy": {
      "name": "Enemy Name",
      "health": 100,
      "attack": 15,
      "defense": 10,
      "image": "enemy SVG/URL"
    },
    "rewards": {
      "experience": 100,
      "gold": 50,
      "items": [
        {
          "id": "item_id",
          "chance": 0.5
        }
      ]
    }
  }
}
```

## Step-by-Step Guide

1. **Start with Metadata**
   - Set your game's title and author
   - Include creation date

2. **Define Initial Game State**
   - Set starting node
   - Define initial stats
   - Create necessary variables

3. **Create the Intro Node**
   ```json
   "intro": {
     "type": "story",
     "content": "Welcome message",
     "choices": [
       {
         "text": "Start journey",
         "nextNode": "first_scene"
       }
     ]
   }
   ```

4. **Build Your Story**
   - Create connected nodes
   - Add choices with conditions
   - Include effects for actions

5. **Add Visual Elements**
   - Include backgrounds
   - Add animations
   - Insert character graphics

6. **Implement Game Systems**
   - Add inventory items
   - Create battle encounters
   - Include stat checks

## Advanced Features

### Conditions
Use conditions to gate choices based on:
- Stats
- Variables
- Inventory items

```json
"conditions": [
  {
    "type": "stat",
    "stat": "magic",
    "value": 10,
    "comparison": ">="
  },
  {
    "type": "variable",
    "name": "hasMap",
    "value": true
  }
]
```

### Effects
Effects can:
- Modify stats
- Change variables
- Add/remove items
- Trigger events

```json
"effects": [
  {
    "type": "stat",
    "stat": "gold",
    "value": -50
  },
  {
    "type": "variable",
    "name": "questComplete",
    "value": true
  }
]
```

### Battle System
Create engaging combat:
```json
"battle": {
  "enemy": {
    "name": "Enemy Name",
    "health": 100,
    "attack": 15,
    "defense": 10
  },
  "rewards": {
    "experience": 100,
    "gold": 50
  }
}
```

## Best Practices

1. **Plan Your Story**
   - Map out branches
   - Consider consequences
   - Balance choices

2. **Balance Game Systems**
   - Test combat difficulty
   - Ensure fair resource distribution
   - Create meaningful choices

3. **Use Variables Wisely**
   - Track important decisions
   - Create persistent effects
   - Enable conditional content

4. **Enhance Immersion**
   - Add descriptive text
   - Include atmospheric graphics
   - Use animations appropriately

5. **Test Thoroughly**
   - Check all paths
   - Verify conditions
   - Balance difficulty

## Example: Mini Quest

Here's a small example combining various features:

```json
{
  "forest_entrance": {
    "type": "story",
    "content": "You stand at the forest entrance. A mysterious path lies ahead.",
    "choices": [
      {
        "text": "Enter the forest",
        "nextNode": "forest_battle",
        "conditions": [
          {
            "type": "stat",
            "stat": "health",
            "value": 50,
            "comparison": ">="
          }
        ]
      },
      {
        "text": "Return to town",
        "nextNode": "town"
      }
    ],
    "modules": {
      "graphics": {
        "background": "forest_bg.svg",
        "animation": "fadeIn"
      }
    }
  }
}
```

## Conclusion

Creating a CYOA game involves combining narrative elements with game mechanics. Use this guide as a reference while building your own adventure. Remember to:

- Start small and expand
- Test frequently
- Balance gameplay
- Create meaningful choices
- Use graphics and effects to enhance the experience

For more examples, check the full_demo.json file in the demo directory.

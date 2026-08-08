export class DOMRenderer {
    constructor(root = document) {
        this.root = root;
        this.cache = new Map();
    }

    get(id) {
        const cached = this.cache.get(id);
        if (cached?.isConnected) return cached;
        const element = this.root.getElementById(id);
        if (element) this.cache.set(id, element);
        return element;
    }

    getBackgroundElement() {
        return this.get('background');
    }

    appendToGame(element) {
        const container = this.get('game-container');
        if (!container) throw new Error('No existe #game-container');
        container.appendChild(element);
        return element;
    }

    removeAll(selector) {
        this.root.querySelectorAll(selector).forEach((element) => element.remove());
    }
}

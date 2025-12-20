/* SILENOS 3/programmer-graph.js */

class ProgrammerGraph {
    constructor(containerId, windowId) {
        this.windowId = windowId;
        this.container = document.getElementById(containerId);
        this.nodes = [];
        this.connections = [];
        this.nodeCounter = 0;
        this.onChange = null;
        this.onLog = null;

        this.initDOM();
        this.ui = new ProgUIManager(this.container, this);
        this.connSystem = new ProgConnectionSystem(this.svgLayer, this);
        this.runtime = new ProgRuntime(this);
        
        this.setupEvents();
    }

    get scale() { return this.ui.scale; }
    get panX() { return this.ui.panX; }
    get panY() { return this.ui.panY; }

    initDOM() {
        this.container.innerHTML = '<div class="prog-world"></div>';
        this.world = this.container.querySelector('.prog-world');
        this.svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svgLayer.classList.add('prog-connections-layer');
        this.svgLayer.innerHTML = `
            <defs>
                <marker id="arrow-${this.windowId}" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L9,3 z" fill="#888" />
                </marker>
            </defs>`;
        this.world.appendChild(this.svgLayer);
    }

    setupEvents() {
        this.ui.setupEvents();
    }

    addNode(type, x, y, triggerSave = true, customData = null) {
        const def = NODE_REGISTRY[type] || { title: type.toUpperCase(), color: "#444" };
        const id = `node-${this.windowId}-${this.nodeCounter++}`;
        const el = document.createElement('div');
        el.className = 'prog-node';
        el.style.transform = `translate(${x}px, ${y}px)`;
        el.dataset.id = id;
        el.dataset.type = type;

        // --- RENDERIZADO DE PUERTOS (Lógica Actualizada) ---
        let portsHTML = ``;

        // 1. Caso Especial: Módulo Personalizado (o definición con arrays explícitos)
        if (def.inputs || def.outputs) {
            let ins = (def.inputs || []).map(p => 
                `<div class="flex items-center gap-1"><div class="prog-port prog-port-in" data-port="${p}" title="${p}"></div><span class="text-[9px] text-gray-400 uppercase">${p}</span></div>`
            ).join('');
            
            let outs = (def.outputs || []).map(p => 
                `<div class="flex items-center gap-1 justify-end"><span class="text-[9px] text-gray-400 uppercase">${p}</span><div class="prog-port prog-port-out" data-port="${p}" title="${p}"></div></div>`
            ).join('');

            portsHTML = `
                <div class="flex flex-col gap-1 px-1 pb-2">
                    <div class="flex flex-col gap-1 items-start">${ins}</div>
                    <div class="flex flex-col gap-1 items-end mt-1">${outs}</div>
                </div>`;
        } 
        // 2. Casos Hardcodeados antiguos
        else if (type === 'book-export') {
            portsHTML = `
                <div class="p-1 text-[8px] text-gray-500 flex flex-col gap-1">
                    <div class="flex items-center gap-1"><div class="prog-port prog-port-in" data-port="in-name"></div> NAME</div>
                    <div class="flex items-center gap-1"><div class="prog-port prog-port-in" data-port="in-chapter"></div> CHAP</div>
                    <div class="flex items-center gap-1"><div class="prog-port prog-port-in" data-port="in-paragraph"></div> PARA</div>
                </div>`;
        } else if (type === 'logic-gate') {
            portsHTML = `<div class="prog-ports"><div class="flex flex-col gap-2"><div class="prog-port prog-port-in" data-port="in1"></div><div class="prog-port prog-port-in" data-port="in2"></div></div><div class="prog-port prog-port-out" data-port="out"></div></div>`;
        } else if (def.customPorts) {
             portsHTML = `
                <div class="prog-ports flex-col gap-1 items-end">
                    <div class="flex items-center justify-between w-full"><div class="prog-port prog-port-in" data-port="in"></div><span></span></div>
                    <div class="flex items-center gap-2"><span class="text-green-500 font-bold text-[9px]">TRUE</span><div class="prog-port prog-port-out" data-port="true" style="background:#22c55e"></div></div>
                    <div class="flex items-center gap-2"><span class="text-red-500 font-bold text-[9px]">FALSE</span><div class="prog-port prog-port-out" data-port="false" style="background:#ef4444"></div></div>
                </div>`;
        } else {
            // Default
            portsHTML = `
                <div class="prog-ports">
                    ${def.hasIn !== false ? '<div class="prog-port prog-port-in" data-port="in"></div>' : '<div></div>'}
                    ${def.hasOut !== false ? '<div class="prog-port prog-port-out" data-port="out"></div>' : '<div></div>'}
                </div>`;
        }

        el.innerHTML = `
            <div class="prog-node-header" style="border-top:3px solid ${def.color}">
                <span class="flex-1 truncate">${def.title}</span>
                <button class="prog-node-close">×</button>
            </div>
            <div class="prog-node-body">${this.renderFields(def.fields)}</div>
            ${portsHTML}
        `;

        this.world.appendChild(el);
        const node = { id, type, x, y, element: el };
        this.nodes.push(node);
        this.bindNodeEvents(node);
        
        if (triggerSave) this.triggerChange();
        return node;
    }

    renderFields(fields) {
        if (!fields) return "";
        return fields.map(f => {
            if (f.type === 'select') return `<select name="${f.name}">${f.options.map(o => `<option>${o}</option>`).join('')}</select>`;
            if (f.type === 'textarea') return `<textarea name="${f.name}" placeholder="${f.placeholder}"></textarea>`;
            return `<input type="${f.type}" name="${f.name}" value="${f.value || ''}" placeholder="${f.placeholder || f.name}">`;
        }).join('');
    }

    bindNodeEvents(node) {
        const header = node.element.querySelector('.prog-node-header');
        const closeBtn = node.element.querySelector('.prog-node-close');

        // Drag del nodo
        header.onmousedown = (e) => {
            if (e.target === closeBtn) return;
            let lastX = e.clientX, lastY = e.clientY;
            const move = (me) => {
                node.x += (me.clientX - lastX) / this.ui.scale;
                node.y += (me.clientY - lastY) / this.ui.scale;
                node.element.style.transform = `translate(${node.x}px, ${node.y}px)`;
                lastX = me.clientX; lastY = me.clientY;
                this.connSystem.render();
            };
            const up = () => { window.removeEventListener('mousemove', move); this.triggerChange(); };
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', up);
        };

        // Eliminar nodo
        closeBtn.onclick = () => this.removeNode(node.id);

        // Eventos de puertos (Detectar cualquier .prog-port)
        node.element.querySelectorAll('.prog-port').forEach(p => {
            p.onmousedown = (e) => this.startConnDrag(e, node, p.dataset.port);
        });
    }

    removeNode(nodeId) {
        const index = this.nodes.findIndex(n => n.id === nodeId);
        if (index === -1) return;

        // Eliminar del DOM
        this.nodes[index].element.remove();
        // Eliminar conexiones asociadas
        this.connections = this.connections.filter(c => c.fromNode !== nodeId && c.toNode !== nodeId);
        // Eliminar del array
        this.nodes.splice(index, 1);
        
        this.connSystem.render();
        this.triggerChange();
    }

    startConnDrag(e, node, port) {
        e.stopPropagation();
        const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
        line.setAttribute("stroke", "#007acc"); 
        line.setAttribute("stroke-dasharray", "4");
        line.setAttribute("stroke-width", "3");
        line.setAttribute("fill", "none");
        this.svgLayer.appendChild(line);

        const move = (me) => {
            const p1 = this.getPortCenter(node.id, port);
            const rect = this.container.getBoundingClientRect();
            const p2 = { 
                x: (me.clientX - rect.left - this.ui.panX) / this.ui.scale, 
                y: (me.clientY - rect.top - this.ui.panY) / this.ui.scale 
            };
            line.setAttribute("d", this.connSystem.calculateBezier(p1.x, p1.y, p2.x, p2.y));
        };

        const up = (ue) => {
            window.removeEventListener('mousemove', move); 
            line.remove();
            
            const target = ue.target.closest('.prog-port');
            if (target) {
                const targetNode = this.nodes.find(n => n.element.contains(target));
                if (targetNode && targetNode.id !== node.id) {
                    this.addConnection(node.id, port, targetNode.id, target.dataset.port);
                }
            }
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up, { once: true });
    }

    addConnection(f, fp, t, tp) {
        // Evitar duplicados
        const exists = this.connections.some(c => c.fromNode === f && c.fromPort === fp && c.toNode === t && c.toPort === tp);
        if (exists) return;

        this.connections.push({ fromNode: f, fromPort: fp, toNode: t, toPort: tp });
        this.connSystem.render();
        this.triggerChange();
    }

    removeConnection(c) {
        this.connections = this.connections.filter(conn => conn !== c);
        this.connSystem.render();
        this.triggerChange();
    }

    getPortCenter(nodeId, portName) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return null;
        const port = node.element.querySelector(`.prog-port[data-port="${portName}"]`);
        if (!port) return { x: node.x, y: node.y };
        
        // Cálculo preciso relativo al nodo utilizando rects
        const nodeRect = node.element.getBoundingClientRect();
        const portRect = port.getBoundingClientRect();
        
        return {
            x: node.x + (portRect.left - nodeRect.left) / this.ui.scale + (portRect.width / 2) / this.ui.scale,
            y: node.y + (portRect.top - nodeRect.top) / this.ui.scale + (portRect.height / 2) / this.ui.scale
        };
    }

    load(data) {
        this.nodes.forEach(n => n.element.remove());
        this.nodes = []; this.connections = [];
        if (!data || !data.nodes || data.nodes.length === 0) return this.addNode('start', 50, 50);
        
        this.ui.panX = data.panX || 0; 
        this.ui.panY = data.panY || 0; 
        this.ui.scale = data.scale || 1;
        this.ui.updateTransform();

        data.nodes.forEach(n => {
            const newNode = this.addNode(n.type, n.x, n.y, false);
            newNode.id = n.id; 
            newNode.element.dataset.id = n.id;
            if (n.values) {
                Object.entries(n.values).forEach(([key, val]) => {
                    const input = newNode.element.querySelector(`[name="${key}"]`);
                    if (input) input.value = val;
                });
            }
        });
        this.connections = data.connections || [];
        this.connSystem.render();
    }

    serialize() {
        return {
            nodes: this.nodes.map(n => ({ 
                id: n.id, type: n.type, x: n.x, y: n.y, 
                values: this.extractNodeValues(n) 
            })),
            connections: this.connections,
            panX: this.ui.panX, panY: this.ui.panY, scale: this.ui.scale
        };
    }

    extractNodeValues(node) {
        const vals = {};
        node.element.querySelectorAll('input, select, textarea').forEach(i => vals[i.name] = i.value);
        return vals;
    }

    run() { this.runtime.run(); }
    log(m) { this.onLog?.(m); }
    triggerChange() { this.onChange?.(this.serialize()); }
}
/* SILENOS 3/prog-runtime.js */

class ProgRuntime {
    constructor(graph) {
        this.graph = graph;
        this.vars = {};
        this.buffers = {};
        this.gateInputs = {};
        this.isRunning = false;
    }

    async run() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.vars = {}; this.buffers = {}; this.gateInputs = {};
        
        const startNode = this.graph.nodes.find(n => n.type === 'start');
        if (!startNode) return alert("Falta nodo de Inicio");

        this.graph.log("▶ Ejecución iniciada");
        try {
            await this.executeNode(startNode);
            this.graph.log("✅ Completado");
        } catch (e) { this.graph.log(`❌ Error: ${e.message}`); }
        this.isRunning = false;
    }

    async executeNode(node, inputData = null, incomingPort = 'in') {
        node.element.classList.add('executing');
        const def = NODE_REGISTRY[node.type];
        let outputData = inputData;
        let selectedBranch = null;

        if (node.type === 'logic-gate') {
            if (!this.gateInputs[node.id]) this.gateInputs[node.id] = {};
            this.gateInputs[node.id][incomingPort] = (inputData !== null && inputData !== "");
        }

        const ctx = {
            input: inputData,
            port: incomingPort,
            nodeId: node.id,
            fields: this.graph.extractNodeValues(node),
            log: (m) => this.graph.log(m),
            setBranch: (b) => selectedBranch = b,
            runtime: this,
            graph: this.graph
        };

        if (def && def.execute) {
            outputData = await def.execute(ctx);
            if (outputData === null && node.type !== 'start') {
                node.element.classList.remove('executing');
                return;
            }
        }

        // Caso especial Book Export (Mantenemos tu lógica original)
        if (node.type === 'book-export') {
            this.handleBookExport(node, inputData, incomingPort);
        }

        await new Promise(r => setTimeout(r, 50));
        node.element.classList.remove('executing');

        let outConns = this.graph.connections.filter(c => c.fromNode === node.id);
        if (selectedBranch) outConns = outConns.filter(c => c.fromPort === selectedBranch);
        if (node.type === 'buffer' && incomingPort === 'add') return;

        await Promise.all(outConns.map(c => {
            const next = this.graph.nodes.find(n => n.id === c.toNode);
            return this.executeNode(next, outputData, c.toPort);
        }));
    }

    handleBookExport(node, data, port) {
        if (!node.bookInstanceId) {
            const book = FileSystem.createBook("Libro Programado", 'desktop');
            node.bookInstanceId = book.id;
        }
        const book = FileSystem.getItem(node.bookInstanceId);
        if (!book) return;

        if (port === 'in-name') book.title = String(data);
        else if (port === 'in-chapter') book.content.chapters.push({ title: "Capítulo", paragraphs: [String(data)] });
        else if (port === 'in-paragraph') {
            if (book.content.chapters.length === 0) book.content.chapters.push({ title: "Capítulo 1", paragraphs: [] });
            book.content.chapters[book.content.chapters.length-1].paragraphs.push(String(data));
        }
        FileSystem.save();
    }
}
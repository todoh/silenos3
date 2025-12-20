/* SILENOS 3/prog-definitions.js */

const NODE_REGISTRY = {
    "start": {
        title: "🏁 INICIO", color: "#2ea043", hasIn: false,
        execute: async (ctx) => ctx.input
    },
    "log": {
        title: "📝 LOG", color: "#007acc",
        fields: [{ name: "msg", type: "text", placeholder: "Mensaje..." }],
        execute: async (ctx) => {
            const val = ctx.fields.msg || "";
            const output = ctx.input ? `${val} ${ctx.input}` : val;
            ctx.log(`Log: ${output}`);
            return output;
        }
    },
    "alert": {
        title: "⚠️ ALERTA", color: "#eab308",
        fields: [{ name: "msg", type: "text", placeholder: "Mensaje..." }],
        execute: async (ctx) => {
            const val = ctx.fields.msg || "";
            alert(ctx.input ? `${val}\n${ctx.input}` : val);
            return ctx.input;
        }
    },
    "wait": {
        title: "⏳ ESPERAR", color: "#6a00ff",
        fields: [{ name: "sec", type: "number", value: 1 }],
        execute: async (ctx) => {
            const s = parseFloat(ctx.fields.sec) || 0;
            ctx.log(`Esperando ${s}s...`);
            await new Promise(r => setTimeout(r, s * 1000));
            return ctx.input;
        }
    },
    "if-logic": {
        title: "🔀 SI / IF", color: "#f59e0b", hasOut: false, customPorts: true,
        fields: [
            { name: "op", type: "select", options: ["==", "!=", "contains", ">"] },
            { name: "comp", type: "text", placeholder: "Valor ref." }
        ],
        execute: async (ctx) => {
            const { op, comp } = ctx.fields;
            const valA = ctx.input;
            let isTrue = false;
            
            if (op === '==') isTrue = (String(valA) == String(comp));
            else if (op === '!=') isTrue = (String(valA) != String(comp));
            else if (op === 'contains') isTrue = String(valA).includes(comp);
            else if (op === '>') isTrue = (parseFloat(valA) > parseFloat(comp));

            ctx.log(`IF: ${isTrue ? 'SI' : 'NO'}`);
            ctx.setBranch(isTrue ? 'true' : 'false');
            return valA;
        }
    },
    "logic-gate": {
        title: "⚖️ COMPUERTA", color: "#f59e0b", hasIn: false,
        fields: [{ name: "op", type: "select", options: ["AND", "OR", "XOR", "NONE"] }],
        execute: async (ctx) => {
            const op = ctx.fields.op;
            const inputs = ctx.runtime.gateInputs[ctx.nodeId] || {};
            const connectedPorts = ctx.graph.connections.filter(c => c.toNode === ctx.nodeId).map(c => c.toPort);
            const activeCount = Object.values(inputs).filter(v => v === true).length;
            
            let trigger = false;
            if (op === 'AND') trigger = (activeCount === connectedPorts.length && connectedPorts.length > 0);
            else if (op === 'OR') trigger = (activeCount > 0);
            else if (op === 'XOR') trigger = (activeCount === 1);
            else if (op === 'NONE') trigger = (activeCount === 0);

            if (!trigger) return null; // Detiene el flujo
            return ctx.input;
        }
    },
    "set-var": {
        title: "💾 SET VAR", color: "#06b6d4",
        fields: [{ name: "varName", type: "text", placeholder: "nombre" }],
        execute: async (ctx) => {
            ctx.runtime.vars[ctx.fields.varName] = ctx.input;
            return ctx.input;
        }
    },
    "get-var": {
        title: "📂 GET VAR", color: "#06b6d4",
        fields: [{ name: "varName", type: "text", placeholder: "nombre" }],
        execute: async (ctx) => ctx.runtime.vars[ctx.fields.varName]
    },
    "ai-query": {
        title: "🧠 CONSULTA IA", color: "#3b82f6",
        fields: [{ name: "query", type: "textarea", placeholder: "Pregunta..." }],
        execute: async (ctx) => {
            const response = await AIService.callAI("Asistente SILENOS", `${ctx.fields.query} ${ctx.input || ""}`);
            return response;
        }
    },
    "buffer": {
        title: "📦 BUFFER", color: "#db2777", hasIn: false, hasOut: false,
        fields: [{ name: "name", type: "text", value: "main" }],
        execute: async (ctx) => {
            const name = ctx.fields.name;
            if (ctx.port === 'add') {
                ctx.runtime.buffers[name] = (ctx.runtime.buffers[name] || "") + ctx.input + "\n\n";
                return null; // Detiene flujo
            } else if (ctx.port === 'release') {
                return ctx.runtime.buffers[name];
            }
        }
    },
    "book-export": {
        title: "📕 EXPORTAR LIBRO", color: "#e11d48", hasIn: false, hasOut: false,
        execute: async (ctx) => {
            // Lógica de FileSystem integrada en el runtime para manejar in-name, in-chapter, etc.
        }
    }
};
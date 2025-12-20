/* SILENOS 3/import-manager.js */

const ImportManager = {
    renderInWindow(windowId) {
        const winContent = document.querySelector(`#window-${windowId} .content-area`);
        if (!winContent) return;

        // Estructura de la UI
        winContent.innerHTML = `
            <div class="flex flex-col h-full bg-[#f3f4f6] p-6 gap-6">
                
                <div class="flex items-center gap-3 border-b border-gray-300 pb-4">
                    <div class="p-3 bg-indigo-100 rounded-xl text-indigo-600 shadow-sm">
                        <i data-lucide="hard-drive" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-700">Almacenamiento</h3>
                        <p class="text-xs text-gray-500">Gestión de copias de seguridad (JSON)</p>
                    </div>
                </div>

                <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
                    <div class="flex items-center gap-2 mb-1">
                        <i data-lucide="save" class="w-4 h-4 text-indigo-500"></i>
                        <label class="text-xs font-bold text-gray-500 uppercase">Guardar Sesión Actual</label>
                    </div>
                    
                    <div class="flex items-center justify-between gap-4">
                        <p class="text-[11px] text-gray-400 leading-tight">
                            Descarga un archivo <code>.json</code> que contiene todo tu escritorio, ventanas, libros y configuración actual.
                        </p>
                        <button onclick="ImportManager.downloadBackup('${windowId}')" 
                            class="neumorph-btn px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-transform flex items-center gap-2 shrink-0">
                            <i data-lucide="download" class="w-4 h-4"></i> DESCARGAR
                        </button>
                    </div>
                </div>

                <div class="flex-1 flex flex-col gap-2 min-h-0 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div class="flex items-center gap-2 mb-1">
                        <i data-lucide="upload-cloud" class="w-4 h-4 text-green-500"></i>
                        <label class="text-xs font-bold text-gray-500 uppercase">Restaurar / Importar</label>
                    </div>

                    <div id="import-zone-${windowId}" class="flex-1 relative group bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-400 transition-colors">
                        <textarea id="import-text-${windowId}" 
                            class="w-full h-full bg-transparent p-4 text-xs font-mono text-gray-600 outline-none resize-none placeholder-gray-400"
                            placeholder='Arrastra tu archivo backup.json aquí o pega el código...'></textarea>
                        
                        <div id="import-overlay-${windowId}" class="absolute inset-0 bg-blue-50/90 flex flex-col items-center justify-center rounded-lg opacity-0 pointer-events-none transition-opacity z-10">
                            <i data-lucide="file-json" class="w-10 h-10 text-blue-500 mb-2"></i>
                            <span class="text-sm font-bold text-blue-600">Soltar para cargar</span>
                        </div>
                    </div>

                    <div class="flex justify-between items-center mt-2">
                        <div class="flex gap-2">
                            <input type="file" id="import-file-${windowId}" accept=".json" class="hidden" onchange="ImportManager.handleFileSelect(this, '${windowId}')">
                            <button onclick="document.getElementById('import-file-${windowId}').click()" 
                                class="text-xs font-bold text-gray-500 hover:text-blue-600 flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded">
                                <i data-lucide="folder-open" class="w-3 h-3"></i> Examinar...
                            </button>
                        </div>

                        <button onclick="ImportManager.executeImport('${windowId}')" 
                            class="neumorph-btn px-6 py-2 text-xs font-bold text-green-600 hover:text-green-700 active:scale-95 transition-transform flex items-center gap-2">
                            <i data-lucide="refresh-cw" class="w-4 h-4"></i> RESTAURAR
                        </button>
                    </div>
                </div>

                <div id="import-status-${windowId}" class="text-[10px] text-center text-gray-400 font-mono h-4"></div>
            </div>
        `;

        this.setupEvents(windowId);
        if (window.lucide) lucide.createIcons();
    },

    setupEvents(windowId) {
        const zone = document.getElementById(`import-zone-${windowId}`);
        const textarea = document.getElementById(`import-text-${windowId}`);
        const overlay = document.getElementById(`import-overlay-${windowId}`);

        // Drag & Drop
        textarea.addEventListener('dragover', (e) => {
            e.preventDefault(); e.stopPropagation();
            overlay.style.opacity = '1';
        });

        textarea.addEventListener('dragleave', (e) => {
            e.preventDefault(); e.stopPropagation();
            overlay.style.opacity = '0';
        });

        textarea.addEventListener('drop', (e) => {
            e.preventDefault(); e.stopPropagation();
            overlay.style.opacity = '0';

            // 1. Drop Interno (Iconos del SO)
            if (typeof dragState !== 'undefined' && dragState.isDragging && dragState.type === 'icon') {
                this.handleInternalDrop(dragState.multiDragIds, textarea, windowId);
                return;
            }
            // 2. Drop Externo (Archivos reales)
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                this.readFile(e.dataTransfer.files[0], textarea, windowId);
            }
        });
    },

    handleInternalDrop(ids, textarea, windowId) {
        const items = [];
        ids.forEach(id => {
            const item = FileSystem.getItem(id);
            if (item) items.push(item);
        });
        if (items.length > 0) {
            const output = items.length === 1 ? items[0] : items;
            textarea.value = JSON.stringify(output, null, 2);
            this.setStatus(windowId, `Obtenido(s) ${items.length} elemento(s). Pulsa Restaurar para duplicar.`, "text-blue-500");
        }
    },

    handleFileSelect(input, windowId) {
        if (input.files && input.files[0]) {
            const textarea = document.getElementById(`import-text-${windowId}`);
            this.readFile(input.files[0], textarea, windowId);
        }
    },

    readFile(file, textarea, windowId) {
        const reader = new FileReader();
        reader.onload = (e) => {
            textarea.value = e.target.result;
            this.setStatus(windowId, `Archivo "${file.name}" cargado.`, "text-green-600");
        };
        reader.readAsText(file);
    },

    setStatus(windowId, msg, colorClass = "text-gray-500") {
        const el = document.getElementById(`import-status-${windowId}`);
        if (el) {
            el.innerHTML = msg;
            el.className = `text-[10px] text-center font-mono h-4 ${colorClass}`;
        }
    },

    // --- LÓGICA DE DESCARGA (EXPORTAR) ---
    downloadBackup(windowId) {
        try {
            // Obtenemos todos los datos del sistema de archivos
            const data = JSON.stringify(FileSystem.data, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `silenos_full_backup_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.setStatus(windowId, "Copia de seguridad descargada correctamente.", "text-indigo-600 font-bold");
        } catch (e) {
            this.setStatus(windowId, "Error al generar backup: " + e.message, "text-red-500");
        }
    },

    // --- LÓGICA DE IMPORTACIÓN ---
    executeImport(windowId) {
        const raw = document.getElementById(`import-text-${windowId}`).value;
        if (!raw.trim()) return this.setStatus(windowId, "Nada que importar.", "text-red-500");

        try {
            const data = JSON.parse(raw);
            let count = 0;
            // Soporta importar un solo objeto o un array de objetos (backup completo)
            const itemsToImport = Array.isArray(data) ? data : [data];

            itemsToImport.forEach(item => {
                if (this.processItem(item)) count++;
            });

            this.setStatus(windowId, `¡Proceso terminado! ${count} elementos restaurados.`, "text-green-600 font-bold");
            
            if (typeof refreshSystemViews === 'function') refreshSystemViews();
            
        } catch (e) {
            this.setStatus(windowId, "Error JSON: " + e.message, "text-red-600");
        }
    },

    processItem(item) {
        if (!item || !item.type) return false;

        // Detección de módulos personalizados (Programmer)
        if (item.type === 'custom-module') {
            return this.importCustomModule(item);
        }

        // Para evitar colisiones de ID si restauramos sobre la misma sesión, regeneramos IDs
        // Si quisieras una restauración destructiva (borrar todo antes), podrías limpiar FileSystem.data primero.
        // Aquí hacemos restauración aditiva (duplicar si ya existe o añadir si no).
        
        const newX = (item.x || 100) + 20; // Ligero offset visual
        const newY = (item.y || 100) + 20;

        let newItem = null;

        switch (item.type) {
            case 'book':
                newItem = FileSystem.createBook(item.title, 'desktop', newX, newY);
                newItem.content = item.content; 
                break;
            case 'program':
                newItem = FileSystem.createProgram(item.title, 'desktop', newX, newY);
                newItem.content = item.content;
                break;
            case 'narrative':
                newItem = FileSystem.createNarrative(item.title, 'desktop', newX, newY);
                newItem.content = item.content;
                break;
            case 'folder':
                newItem = FileSystem.createFolder(item.title, 'desktop', newX, newY);
                break;
            default: // data, file
                newItem = FileSystem.createData(item.title || "Dato Importado", item.content, 'desktop', newX, newY);
                break;
        }

        if (newItem) {
            if (item.icon) newItem.icon = item.icon;
            if (item.color) newItem.color = item.color;
            FileSystem.save();
            return true;
        }
        return false;
    },

    importCustomModule(moduleData) {
        try {
            if (typeof ProgrammerManager !== 'undefined' && ProgrammerManager.customModules) {
                // Añadir a la lista de módulos del programador
                ProgrammerManager.customModules.push(moduleData);
                ProgrammerManager.saveModules();
                return true;
            }
            return false;
        } catch (e) { return false; }
    }
};
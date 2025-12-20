/* SILENOS 3/context-menu.js */
// --- MENÚ CONTEXTUAL ---

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    
    // Detectar si el click fue sobre un archivo/carpeta
    const itemEl = e.target.closest('[data-id]');
    const itemId = itemEl ? itemEl.dataset.id : null;
    let itemTitle = null;

    if (itemId) {
        if (typeof SelectionManager !== 'undefined') {
            if (!SelectionManager.isSelected(itemId)) {
                SelectionManager.clearSelection();
                SelectionManager.addId(itemId);
            }
        }
        const item = FileSystem.getItem(itemId);
        if (item) itemTitle = item.title;
    } else {
        if (typeof SelectionManager !== 'undefined') {
             SelectionManager.clearSelection();
        }
    }

    const folderContent = e.target.closest('.folder-window-content');
    const parentId = folderContent ? folderContent.dataset.folderId : 'desktop';

    createContextMenu(e.clientX, e.clientY, itemId, itemTitle, parentId);
});

document.addEventListener('click', () => {
    removeContextMenu();
});

function createContextMenu(x, y, itemId = null, itemTitle = null, parentId = 'desktop') {
    removeContextMenu();

    const menu = document.createElement('div');
    menu.id = 'context-menu';
    menu.className = 'fixed z-[9999] bg-[#e0e5ec] p-2 rounded-xl flex flex-col gap-1 w-52 shadow-xl border border-white/50 pop-in';
    
    let finalX = x;
    let finalY = y;
    if (finalX + 208 > window.innerWidth) finalX = finalX - 208;
    if (finalY + 180 > window.innerHeight) finalY = finalY - 180;
    
    menu.style.left = `${finalX}px`;
    menu.style.top = `${finalY}px`;

    const options = [];
    let selectedCount = 0;
    if (typeof SelectionManager !== 'undefined') {
        selectedCount = SelectionManager.getSelectedIds().length;
    }

    if (itemId || selectedCount > 0) {
        let deleteLabel = 'Eliminar';
        if (selectedCount > 1) {
            deleteLabel = `Eliminar (${selectedCount})`;
        }
        options.push({
            label: deleteLabel,
            icon: 'trash-2',
            color: 'text-red-500',
            action: () => {
                showDeleteConfirm(finalX, finalY, itemId, itemTitle, selectedCount);
            }
        });
    } else {
        // --- OPCIONES DE CREACIÓN ---
        options.push(
            {
                label: 'Crear Carpeta',
                icon: 'folder-plus',
                action: () => {
                    FileSystem.createFolder('Nueva Carpeta', parentId, x - 40, y - 40);
                    refreshAllViews();
                }
            },
            {
                label: 'Crear Programa',  // [NUEVO]
                icon: 'cpu',
                color: 'text-purple-600',
                action: () => {
                    FileSystem.createProgram('Nuevo Programa', parentId, x - 40, y - 40);
                    refreshAllViews();
                }
            },
            {
                label: 'Crear Libro',  
                icon: 'book-plus',
                color: 'text-indigo-600',
                action: () => {
                    FileSystem.createBook('Nuevo Libro', parentId, x - 40, y - 40);
                    refreshAllViews();
                }
            },
            {
                label: 'Crear Dato Narrativo', 
                icon: 'sticky-note',
                color: 'text-orange-500',
                action: () => {
                    FileSystem.createNarrative('Dato Narrativo', parentId, x - 40, y - 40);
                    refreshAllViews();
                }
            },
            {
                label: 'Crear Dato (JSON)',
                icon: 'file-plus',
                color: 'text-green-600',
                action: () => {
                    FileSystem.createData('Dato_' + Math.floor(Math.random()*100), { info: "Test" }, parentId, x - 40, y - 40);
                    refreshAllViews();
                }
            }
        );
    }

    options.forEach(opt => {
        const btn = document.createElement('button');
        const textColor = opt.color || 'text-gray-700';
        
        btn.className = `flex items-center gap-3 px-3 py-2 hover:bg-black/5 rounded-lg ${textColor} text-sm font-medium transition-colors text-left`;
        btn.innerHTML = `<i data-lucide="${opt.icon}" class="w-4 h-4"></i> ${opt.label}`;
        btn.onclick = (e) => {
            e.stopPropagation();
            removeContextMenu(); 
            opt.action();
        };
        menu.appendChild(btn);
    });

    document.body.appendChild(menu);
    if (window.lucide) lucide.createIcons();
}

function removeContextMenu() {
    const existing = document.getElementById('context-menu');
    if (existing) existing.remove();
}

function showDeleteConfirm(x, y, singleId, singleName, count) {
    const existing = document.getElementById('delete-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'delete-modal';
    modal.className = 'fixed z-[10000] bg-[#e0e5ec]/90 backdrop-blur border border-white/50 shadow-2xl rounded-xl p-4 flex flex-col items-center gap-3 pop-in';
    
    const modalW = 200; 
    let finalX = x;
    let finalY = y;

    if (finalX + modalW > window.innerWidth) finalX = window.innerWidth - modalW - 20;
    if (finalY + 120 > window.innerHeight) finalY = window.innerHeight - 120;

    modal.style.left = `${finalX}px`;
    modal.style.top = `${finalY}px`;
    modal.style.width = `${modalW}px`;

    let msg = singleName;
    if (count > 1) msg = `${count} elementos`;

    modal.innerHTML = `
        <div class="text-center">
            <p class="text-sm font-bold text-gray-700 break-words line-clamp-2">${msg}</p>
            <p class="text-xs text-gray-500 mt-1">¿Borrar definitivamente?</p>
        </div>
        <div class="flex gap-3 w-full justify-center">
            <button id="del-yes" class="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg shadow transition-transform active:scale-95">
                Si
            </button>
            <button id="del-no" class="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg shadow transition-transform active:scale-95">
                No
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();

    document.getElementById('del-yes').onclick = () => {
        if (count > 1 && typeof SelectionManager !== 'undefined') {
            const ids = SelectionManager.getSelectedIds();
            ids.forEach(id => FileSystem.deleteItem(id));
            SelectionManager.clearSelection();
        } else if (singleId) {
            FileSystem.deleteItem(singleId);
        }
        
        if (window.refreshSystemViews) window.refreshSystemViews();
        close();
    };

    document.getElementById('del-no').onclick = close;

    setTimeout(() => {
        document.addEventListener('click', function onClickOutside(ev) {
            if (!modal.contains(ev.target)) {
                modal.remove();
                document.removeEventListener('click', onClickOutside);
            }
        }, { once: true });
    }, 100);
}
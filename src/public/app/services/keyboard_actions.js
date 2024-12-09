import server from "./server.js";
import appContext from "../components/app_context.js";
import shortcutService from "./shortcuts.js";
import geminiService from "./gemini.js";


const keyboardActionRepo = {};

const keyboardActionsLoaded = server.get('keyboard-actions').then(actions => {
	actions = actions.filter(a => !!a.actionName); // filter out separators

	for (const action of actions) {
		action.effectiveShortcuts = action.effectiveShortcuts.filter(shortcut => !shortcut.startsWith("global:"));

		keyboardActionRepo[action.actionName] = action;
	}

	return actions;
});

async function getActions() {
	return await keyboardActionsLoaded;
}

async function getActionsForScope(scope) {
	const actions = await keyboardActionsLoaded;

	return actions.filter(action => action.scope === scope);
}

async function setupActionsForElement(scope, $el, component) {
	const actions = await getActionsForScope(scope);

	for (const action of actions) {
		for (const shortcut of action.effectiveShortcuts) {
			shortcutService.bindElShortcut($el, shortcut, () => component.triggerCommand(action.actionName, {ntxId: appContext.tabManager.activeNtxId}));
		}
	}
}

(async () => {
    const actions = await getActionsForScope("window");

    $(document).on('keydown', async (e) => {
        if (e.metaKey || e.ctrlKey) {
            switch (e.key.toLowerCase()) {
                case 's': // CMD/CTRL + S
                case 'n': // CMD/CTRL + N
                    e.preventDefault();
                    return false;
                case 'l': // CMD/CTRL + L
                    const activeContext = appContext.tabManager.getActiveContext();
                    if (activeContext) {
                        await activeContext.getTextEditor(async editor => {
                            const selection = editor.model.document.selection;
                            const range = selection.getFirstRange();
                            const user_command = prompt("Edit selection with AI: ");
                            
                            if (!user_command) {
                                return;
                            }

                            let model_command = user_command;
                            
                            if (!selection.isCollapsed) {
                                const selectedText = Array.from(range.getItems())
                                    .map(item => item.data || '')
                                    .join('');
                                
                                model_command += ": " + selectedText;
                            }

                            const stream = await geminiService.streamGenerateContent(model_command);
                            const reader = stream.getReader();
                            
                            // Store the complete response before updating editor
                            let completeResponse = '';
            
                            try {
                                while (true) {
                                    const {done, value} = await reader.read();
                                    if (done) break;
                                    
                                    const chunk = new TextDecoder().decode(value);
                                    const cleanChunk = chunk
                                        .replace(/^-+$/gm, '')     
                                        .replace(/^\[/, '')        
                                        .replace(/\]$/, '')        
                                        .replace(/^,\s*/, '');    
                                    const chunkJSON = JSON.parse(cleanChunk);
									console.log(chunkJSON);
                                    const chunkText = chunkJSON.candidates?.[0]?.content?.parts?.[0]?.text;
                                    
                                    if (chunkText) {
                                        completeResponse += chunkText;
                                        // After streaming is complete, update editor once
                                        editor.model.change(writer => {
                                            if (!selection.isCollapsed) {
                                                // If there's a selection, remove it first
                                                writer.remove(range);
                                            }
                                            
                                            // Split text by newlines and insert with line breaks
                                            const position = selection.getFirstPosition();
                                            const lines = completeResponse.split(/\r?\n/);
                                            
                                            for (let i = 0; i < lines.length; i++) {
                                                const insertPosition = writer.createPositionAt(position);
                                                writer.insertText(lines[i], insertPosition);
                                                if (i < lines.length - 1) {
                                                    writer.insertElement('softBreak', insertPosition);
                                                }
                                                position.offset += lines[i].length + (i < lines.length - 1 ? 1 : 0);
                                            }
                                        });
                                    }
                                }
                            } catch (error) {
                                console.error('Streaming error:', error);
                            }
                        });
                    }
                    e.preventDefault();
                    return false;
            }
        }
    });

    for (const action of actions) {
        for (const shortcut of action.effectiveShortcuts) {
            shortcutService.bindGlobalShortcut(shortcut, () => appContext.triggerCommand(action.actionName, {ntxId: appContext.tabManager.activeNtxId}));
        }
    }
})();

async function getAction(actionName, silent = false) {
	await keyboardActionsLoaded;

	const action = keyboardActionRepo[actionName];

	if (!action) {
		if (silent) {
			console.debug(`Cannot find action '${actionName}'`);
		}
		else {
			throw new Error(`Cannot find action '${actionName}'`);
		}
	}

	return action;
}

function updateDisplayedShortcuts($container) {
	$container.find('kbd[data-command]').each(async (i, el) => {
		const actionName = $(el).attr('data-command');
		const action = await getAction(actionName, true);

		if (action) {
			const keyboardActions = action.effectiveShortcuts.join(', ');

			if (keyboardActions || $(el).text() !== "not set") {
				$(el).text(keyboardActions);
			}
		}
	});

	$container.find('[data-trigger-command]').each(async (i, el) => {
		const actionName = $(el).attr('data-trigger-command');
		const action = await getAction(actionName, true);

		if (action) {
			const title = $(el).attr('title');
			const shortcuts = action.effectiveShortcuts.join(', ');

			if (title?.includes(shortcuts)) {
				return;
			}

			const newTitle = !title?.trim() ? shortcuts : `${title} (${shortcuts})`;

			$(el).attr('title', newTitle);
		}
	});
}

export default {
	updateDisplayedShortcuts,
	setupActionsForElement,
	getActions,
	getActionsForScope
};

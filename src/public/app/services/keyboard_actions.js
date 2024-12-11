import server from "./server.js";
import appContext from "../components/app_context.js";
import shortcutService from "./shortcuts.js";
import ChatPopup from "../components/chat_popup.js";
import geminiService from "./llm/gemini.js";
import { getEditSelectedTextPrompt, getInsertTextPrompt, NOTE_EDITOR_SYSTEM_PROMPT } from "./llm/prompts.js";




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
                    e.preventDefault(); // Prevent default browser behavior first
                    e.stopPropagation(); // Stop event from bubbling up
                    const context = appContext.tabManager.getActiveContext();
                    if (context) {
                        const chatPopup = new ChatPopup();
                        const editor = await context.getTextEditor();
                        let selectedText = '';
                        if (editor) {
							let user_prompt = await chatPopup.show(`Edit with AI: ${selectedText ? `\n\nSelected Text: ${selectedText}` : ''}`);
							const note_title = context.note.title;
							const note_content = await context.note.getContent();
							console.log(note_title);
							console.log(note_content);
                            const selection = editor.model.document.selection;
							if (!selection.isCollapsed) {
								selectedText = editor.model.document.getSelectedText();
								user_prompt = getEditSelectedTextPrompt(selectedText, user_prompt, note_title, note_content);
							} else {
								user_prompt = getInsertTextPrompt(user_prompt, note_title, note_content)
							}

							// Create and iterate over the stream.
							const stream = await geminiService.streamGenerateContent(NOTE_EDITOR_SYSTEM_PROMPT + user_prompt);
							const reader = stream.getReader();
							// let noteText = '';
							while (true) {
								const {done, value} = await reader.read();
								if (done) break;
								// Parse and clean gemini outputs.
								const chunk = new TextDecoder().decode(value);
								const cleanChunk = chunk.replace(/^-+$/gm, '')     
														.replace(/^\[/, '')
														.replace(/\]$/, '')        
														.replace(/^,\s*/, '');    
								const chunkJSON = JSON.parse(cleanChunk);
								const streamText = chunkJSON.candidates?.[0]?.content?.parts?.[0]?.text;
								// noteText = noteText + chunkJSON.candidates?.[0]?.content?.parts?.[0]?.text;
								for (const char of streamText) {
									editor.model.change(writer => {
										const position = editor.model.document.selection.getFirstPosition();
										if (char === '\n') {
											writer.insertElement('softBreak', position);
										} else {
											writer.insertText(char, position);
										}
									});
								}
							}
						}
                    }
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

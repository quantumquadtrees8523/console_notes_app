export const getEditSelectedTextPrompt = (selectedText, user_instruction, note_title, note_content) => {
    return `
    Selected Text:
    ${selectedText}
    --------
    User Instruction:
    ${getInsertTextPrompt(user_instruction, note_title, note_content)}
    `
}

export const getInsertTextPrompt = (user_instruction, note_title, note_content) => {
    return `
    ${user_instruction}
    `  
}
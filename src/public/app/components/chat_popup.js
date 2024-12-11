import utils from "../services/utils.js";

const TPL = `
<div class="chat-popup modal" tabindex="-1" data-bs-backdrop="false">
    <div class="modal-dialog" style="opacity: 1; margin-top: 0; max-width: 700px;">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" style="font-size: 0.8rem;"></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" style="font-size: 0.8rem;"></button>
            </div>
            <div class="modal-body" style="padding: 10px;">
                <h6 class="modal-subtitle" style="font-size: 0.9rem;"></h6>
                <div class="selected-text-display" style="margin-bottom: 5px; font-size: 0.8rem;"></div>
                <textarea class="form-control" style="height: 100px; overflow-y: auto; font-size: 0.8rem;"></textarea>
                <h6>Enter to submit and Esc to quit</h6>
            </div>
        </div>
    </div>
</div>`;

export default class ChatPopup {
    constructor() {
        this.$widget = $(TPL);
        this.$title = this.$widget.find('.modal-title');
        this.$subtitle = this.$widget.find('.modal-subtitle');
        this.$textarea = this.$widget.find('textarea');
        this.$selectedTextDisplay = this.$widget.find('.selected-text-display');
        
        this.resolve = null;
        this.storageKey = null;
        
        this.$textarea.on('keypress', (e) => {
            if (e.which === 13 && !e.shiftKey) { // Enter key pressed without Shift
                e.preventDefault(); // Prevent default behavior of Enter key
                const value = this.$textarea.val();
                if (this.storageKey) {
                    sessionStorage.setItem(this.storageKey, value);
                }
                this.resolve?.(value);
                this.hide();
            }
        });
        
        this.$widget.on('shown.bs.modal', () => {
            this.$textarea.trigger('focus');
        });

        this.$widget.on('hidden.bs.modal', () => {
            if (this.resolve) {
                this.resolve(null);
            }
        });

        $(document).on('keydown', (e) => {
            if (e.key === 'Escape') { // Escape key pressed
                this.hide();
            }
        });

        $('body').append(this.$widget);
    }

    show(title, storageKey = null, selectedText = '') {
        this.$title.text(title);
        this.$subtitle.text(selectedText); // Display selectedText in the subtitle
        this.storageKey = storageKey;
        
        if (storageKey) {
            const savedText = sessionStorage.getItem(storageKey);
            if (savedText) {
                this.$textarea.val(savedText);
            }
        }

        this.$selectedTextDisplay.text(selectedText);

        return new Promise(resolve => {
            this.resolve = resolve;
            this.$widget.modal('show');
            
            // Focus the textarea after modal is shown
            this.$widget.one('shown.bs.modal', () => {
                this.$textarea.trigger('focus');
            });
        });
    }

    hide() {
        this.$widget.modal('hide');
        this.$textarea.val('');
        this.$selectedTextDisplay.text('');
        this.resolve = null;
        this.storageKey = null;
    }
}

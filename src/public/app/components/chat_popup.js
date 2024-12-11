import utils from "../services/utils.js";

const TPL = `
<div class="chat-popup modal" tabindex="-1" data-bs-backdrop="false">
    <div class="modal-dialog" style="opacity: 1; margin-top: 0;">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <textarea class="form-control" rows="3"></textarea>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary btn-submit">Submit</button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            </div>
        </div>
    </div>
</div>`;

export default class ChatPopup {
    constructor() {
        this.$widget = $(TPL);
        this.$title = this.$widget.find('.modal-title');
        this.$textarea = this.$widget.find('textarea');
        this.$submitButton = this.$widget.find('.btn-submit');
        
        this.resolve = null;
        this.storageKey = null;
        
        this.$submitButton.on('click', () => {
            const value = this.$textarea.val();
            if (this.storageKey) {
                sessionStorage.setItem(this.storageKey, value);
            }
            this.resolve?.(value);
            this.hide();
        });
        
        this.$widget.on('shown.bs.modal', () => {
            this.$textarea.trigger('focus');
        });

        this.$widget.on('hidden.bs.modal', () => {
            if (this.resolve) {
                this.resolve(null);
            }
        });

        $('body').append(this.$widget);
    }

    show(title, storageKey = null) {
        this.$title.text(title);
        this.storageKey = storageKey;
        
        if (storageKey) {
            const savedText = sessionStorage.getItem(storageKey);
            if (savedText) {
                this.$textarea.val(savedText);
            }
        }

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
        this.resolve = null;
        this.storageKey = null;
    }
}

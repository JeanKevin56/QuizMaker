/**
 * Layout components for the Quiz Platform
 * Provides reusable UI components for consistent layout
 */

/**
 * Create a card component
 * @param {Object} options - Card options
 * @param {string} options.title - Card title
 * @param {string} options.content - Card content
 * @param {string} options.className - Additional CSS classes
 * @returns {HTMLElement} Card element
 */
export function createCard({ title, content, className = '' }) {
    const card = document.createElement('div');
    card.className = `card ${className}`;
    
    const cardHTML = `
        ${title ? `<div class="card-header"><h3 class="card-title">${title}</h3></div>` : ''}
        <div class="card-content">${content}</div>
    `;
    
    card.innerHTML = cardHTML;
    return card;
}

/**
 * Create a button component
 * @param {Object} options - Button options
 * @param {string} options.text - Button text
 * @param {string} options.type - Button type (primary, secondary, success, warning, error)
 * @param {Function} options.onClick - Click handler
 * @param {string} options.className - Additional CSS classes
 * @param {boolean} options.disabled - Whether button is disabled
 * @returns {HTMLElement} Button element
 */
export function createButton({ text, type = 'secondary', onClick, className = '', disabled = false }) {
    const button = document.createElement('button');
    button.className = `btn btn-${type} ${className}`;
    button.textContent = text;
    button.disabled = disabled;
    
    if (onClick) {
        button.addEventListener('click', onClick);
    }
    
    return button;
}

/**
 * Create a form group component
 * @param {Object} options - Form group options
 * @param {string} options.label - Label text
 * @param {string} options.type - Input type
 * @param {string} options.id - Input ID
 * @param {string} options.placeholder - Input placeholder
 * @param {boolean} options.required - Whether field is required
 * @param {string} options.value - Initial value
 * @returns {HTMLElement} Form group element
 */
export function createFormGroup({ label, type = 'text', id, placeholder = '', required = false, value = '' }) {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    
    const formGroupHTML = `
        <label for="${id}" class="form-label">${label}${required ? ' *' : ''}</label>
        <input 
            type="${type}" 
            id="${id}" 
            name="${id}"
            class="form-input" 
            placeholder="${placeholder}"
            value="${value}"
            ${required ? 'required' : ''}
        />
    `;
    
    formGroup.innerHTML = formGroupHTML;
    return formGroup;
}

/**
 * Create a modal component
 * @param {Object} options - Modal options
 * @param {string} options.title - Modal title
 * @param {string} options.content - Modal content
 * @param {Array} options.buttons - Array of button configurations
 * @param {Function} options.onClose - Close handler
 * @returns {HTMLElement} Modal element
 */
export function createModal({ title, content, buttons = [], onClose }) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    const buttonsHTML = buttons.map(btn => 
        `<button class="btn btn-${btn.type || 'secondary'}" data-action="${btn.action}">${btn.text}</button>`
    ).join('');
    
    const modalHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button class="modal-close" aria-label="Close">&times;</button>
            </div>
            <div class="modal-content">${content}</div>
            ${buttons.length > 0 ? `<div class="modal-footer">${buttonsHTML}</div>` : ''}
        </div>
    `;
    
    modal.innerHTML = modalHTML;
    
    // Add event listeners
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (onClose) onClose();
            modal.remove();
        });
    }
    
    // Handle button clicks
    buttons.forEach(btn => {
        const buttonEl = modal.querySelector(`[data-action="${btn.action}"]`);
        if (buttonEl && btn.onClick) {
            buttonEl.addEventListener('click', btn.onClick);
        }
    });
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            if (onClose) onClose();
            modal.remove();
        }
    });
    
    return modal;
}

/**
 * Create a loading spinner component
 * @param {Object} options - Spinner options
 * @param {string} options.text - Loading text
 * @param {string} options.size - Spinner size (small, medium, large)
 * @returns {HTMLElement} Loading spinner element
 */
export function createLoadingSpinner({ text = 'Loading...', size = 'medium' }) {
    const spinner = document.createElement('div');
    spinner.className = `loading-spinner-container loading-${size}`;
    
    const spinnerHTML = `
        <div class="loading-spinner"></div>
        <p class="loading-text">${text}</p>
    `;
    
    spinner.innerHTML = spinnerHTML;
    return spinner;
}

/**
 * Create an alert component
 * @param {Object} options - Alert options
 * @param {string} options.message - Alert message
 * @param {string} options.type - Alert type (info, success, warning, error)
 * @param {boolean} options.dismissible - Whether alert can be dismissed
 * @returns {HTMLElement} Alert element
 */
export function createAlert({ message, type = 'info', dismissible = true }) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    const alertHTML = `
        <div class="alert-content">${message}</div>
        ${dismissible ? '<button class="alert-close" aria-label="Close">&times;</button>' : ''}
    `;
    
    alert.innerHTML = alertHTML;
    
    if (dismissible) {
        const closeBtn = alert.querySelector('.alert-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                alert.remove();
            });
        }
    }
    
    return alert;
}
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PartToolSidebarForm, type SidebarFormState } from './PartToolSidebarForm';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
    i18n: { language: 'en' },
  }),
}));

let lastTextInputModalProps: Record<string, unknown> | null = null;

vi.mock('@monta-vis/viewer-core', () => ({
  ConfirmDeleteDialog: ({ open, onConfirm, onClose }: { open: boolean; onConfirm: () => void; onClose: () => void }) => (
    open ? (
      <div data-testid="confirm-delete-dialog">
        <button data-testid="confirm-delete-confirm" onClick={() => { onConfirm(); onClose(); }}>Delete</button>
        <button data-testid="confirm-delete-cancel" onClick={onClose}>Cancel</button>
      </div>
    ) : null
  ),
  TextInputModal: ({ label, value, onConfirm, onCancel, inputType }: {
    label: string; value: string; onConfirm: (v: string) => void; onCancel: () => void; inputType?: string;
  }) => {
    lastTextInputModalProps = { label, value, inputType };
    return (
      <div data-testid="text-input-modal">
        <span data-testid="text-input-modal-label">{label}</span>
        <input data-testid="text-input-modal-input" defaultValue={value} />
        <button data-testid="text-input-modal-confirm" onClick={() => onConfirm('new-value')}>Confirm</button>
        <button data-testid="text-input-modal-cancel" onClick={onCancel}>Cancel</button>
      </div>
    );
  },
  IconButton: ({ icon, 'aria-label': ariaLabel, onClick, ...rest }: Record<string, unknown>) => (
    <button aria-label={ariaLabel as string} onClick={onClick as () => void} data-testid={rest['data-testid'] as string}>{icon as React.ReactNode}</button>
  ),
  Button: ({ children, disabled, onClick, ...rest }: Record<string, unknown>) => (
    <button disabled={disabled as boolean} onClick={onClick as () => void} data-testid={rest['data-testid'] as string}>{children as React.ReactNode}</button>
  ),
}));

afterEach(() => {
  cleanup();
  lastTextInputModalProps = null;
});

const EMPTY_FORM: SidebarFormState = {
  type: 'Part',
  name: '',
  label: '',
  partNumber: '',
  amount: 1,
  unit: '',
  material: '',
  dimension: '',
  description: '',
};

const FILLED_FORM: SidebarFormState = {
  type: 'Part',
  name: 'Bolt M6',
  label: 'B6',
  partNumber: 'PN-001',
  amount: 3,
  unit: 'pcs',
  material: 'Steel',
  dimension: '6x20mm',
  description: 'Hex bolt',
};

function renderForm(overrides: Partial<Parameters<typeof PartToolSidebarForm>[0]> = {}) {
  const defaults = {
    values: EMPTY_FORM,
    onChange: vi.fn(),
    canAdd: false,
    canUpdate: false,
    onAdd: vi.fn(),
    onUpdate: vi.fn(),
    ...overrides,
  };
  return { ...render(<PartToolSidebarForm {...defaults} />), props: defaults };
}

describe('PartToolSidebarForm', () => {
  describe('BoxedField rendering', () => {
    it('renders all field labels', () => {
      renderForm({ values: FILLED_FORM });
      expect(screen.getByText('Name *')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Label')).toBeInTheDocument();
      expect(screen.getByText('Part #')).toBeInTheDocument();
      expect(screen.getByText('Unit')).toBeInTheDocument();
      expect(screen.getByText('Material')).toBeInTheDocument();
      expect(screen.getByText('Dimension')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('renders field values in BoxedField buttons', () => {
      renderForm({ values: FILLED_FORM });
      expect(screen.getByTestId('sidebar-form-name')).toHaveTextContent('Bolt M6');
      expect(screen.getByTestId('sidebar-form-amount')).toHaveTextContent('3');
      expect(screen.getByTestId('sidebar-form-label')).toHaveTextContent('B6');
      expect(screen.getByTestId('sidebar-form-partNumber')).toHaveTextContent('PN-001');
      expect(screen.getByTestId('sidebar-form-unit')).toHaveTextContent('pcs');
      expect(screen.getByTestId('sidebar-form-material')).toHaveTextContent('Steel');
      expect(screen.getByTestId('sidebar-form-dimension')).toHaveTextContent('6x20mm');
      expect(screen.getByTestId('sidebar-form-description')).toHaveTextContent('Hex bolt');
    });

    it('shows non-breaking space when value is empty', () => {
      renderForm({ values: EMPTY_FORM });
      const nameField = screen.getByTestId('sidebar-form-name');
      expect(nameField.querySelector('[data-testid="boxed-field-value"]')?.textContent).toBe('\u00A0');
    });
  });

  describe('TextInputModal integration', () => {
    it('clicking a BoxedField opens TextInputModal with correct label/value', async () => {
      const user = userEvent.setup();
      renderForm({ values: FILLED_FORM });

      expect(screen.queryByTestId('text-input-modal')).not.toBeInTheDocument();
      await user.click(screen.getByTestId('sidebar-form-name'));
      expect(screen.getByTestId('text-input-modal')).toBeInTheDocument();
      expect(screen.getByTestId('text-input-modal-label')).toHaveTextContent('Name');
    });

    it('confirming TextInputModal updates form state', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderForm({ values: FILLED_FORM, onChange });

      await user.click(screen.getByTestId('sidebar-form-name'));
      await user.click(screen.getByTestId('text-input-modal-confirm'));
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'new-value' }));
    });

    it('cancelling TextInputModal closes without changes', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderForm({ values: FILLED_FORM, onChange });

      await user.click(screen.getByTestId('sidebar-form-name'));
      await user.click(screen.getByTestId('text-input-modal-cancel'));
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.queryByTestId('text-input-modal')).not.toBeInTheDocument();
    });

    it('type toggle does NOT open TextInputModal', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderForm({ values: FILLED_FORM, onChange });

      await user.click(screen.getByTestId('sidebar-form-type-toggle'));
      expect(screen.queryByTestId('text-input-modal')).not.toBeInTheDocument();
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: 'Tool' }));
    });

    it('amount field opens TextInputModal with inputType number', async () => {
      const user = userEvent.setup();
      renderForm({ values: FILLED_FORM });

      await user.click(screen.getByTestId('sidebar-form-amount'));
      expect(screen.getByTestId('text-input-modal')).toBeInTheDocument();
      expect(lastTextInputModalProps?.inputType).toBe('number');
    });

    it('description field opens TextInputModal with inputType textarea', async () => {
      const user = userEvent.setup();
      renderForm({ values: FILLED_FORM });

      await user.click(screen.getByTestId('sidebar-form-description'));
      expect(screen.getByTestId('text-input-modal')).toBeInTheDocument();
      expect(lastTextInputModalProps?.inputType).toBe('textarea');
    });
  });

  describe('layout structure', () => {
    it('Name field appears before Type field in DOM order', () => {
      const { container } = renderForm({ values: FILLED_FORM });
      const fields = container.querySelectorAll('[data-testid^="sidebar-form-"]');
      const fieldIds = Array.from(fields).map((f) => f.getAttribute('data-testid'));
      const nameIdx = fieldIds.indexOf('sidebar-form-name');
      const typeIdx = fieldIds.indexOf('sidebar-form-type-toggle');
      expect(nameIdx).toBeLessThan(typeIdx);
    });

    it('Amount field appears in the first row with Name', () => {
      renderForm({ values: FILLED_FORM });
      const nameField = screen.getByTestId('sidebar-form-name');
      const amountField = screen.getByTestId('sidebar-form-amount');
      // Both should share the same parent row
      expect(nameField.parentElement).toBe(amountField.parentElement);
    });

    it('Delete button is in the top-right area', () => {
      renderForm({ values: FILLED_FORM, onDelete: vi.fn() });
      const deleteBtn = screen.getByTestId('sidebar-form-delete-btn');
      expect(deleteBtn).toBeInTheDocument();
    });

    it('Deselect button is next to Delete in top-right', () => {
      renderForm({ values: FILLED_FORM, onDelete: vi.fn(), onDeselect: vi.fn() });
      const deleteBtn = screen.getByTestId('sidebar-form-delete-btn');
      const deselectBtn = screen.getByTestId('sidebar-form-deselect-btn');
      expect(deleteBtn.parentElement).toBe(deselectBtn.parentElement);
    });
  });

  describe('action buttons', () => {
    it('Add button disabled when canAdd is false', () => {
      renderForm({ canAdd: false });
      expect(screen.getByTestId('sidebar-form-add-btn')).toBeDisabled();
    });

    it('Add button enabled when canAdd is true', () => {
      renderForm({ canAdd: true });
      expect(screen.getByTestId('sidebar-form-add-btn')).toBeEnabled();
    });

    it('Update button disabled when canUpdate is false', () => {
      renderForm({ canUpdate: false });
      expect(screen.getByTestId('sidebar-form-update-btn')).toBeDisabled();
    });

    it('Update button enabled when canUpdate is true', () => {
      renderForm({ canUpdate: true });
      expect(screen.getByTestId('sidebar-form-update-btn')).toBeEnabled();
    });

    it('calls onAdd when Add button clicked', async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn();
      renderForm({ canAdd: true, onAdd });
      await user.click(screen.getByTestId('sidebar-form-add-btn'));
      expect(onAdd).toHaveBeenCalledOnce();
    });

    it('calls onUpdate when Update button clicked', async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();
      renderForm({ canUpdate: true, onUpdate });
      await user.click(screen.getByTestId('sidebar-form-update-btn'));
      expect(onUpdate).toHaveBeenCalledOnce();
    });
  });

  describe('delete flow', () => {
    it('hides Delete button when onDelete not provided', () => {
      renderForm();
      expect(screen.queryByTestId('sidebar-form-delete-btn')).not.toBeInTheDocument();
    });

    it('shows Delete button when onDelete provided', () => {
      renderForm({ onDelete: vi.fn() });
      expect(screen.getByTestId('sidebar-form-delete-btn')).toBeInTheDocument();
    });

    it('clicking delete button opens confirmation dialog', async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      renderForm({ onDelete });
      await user.click(screen.getByTestId('sidebar-form-delete-btn'));
      expect(screen.getByTestId('confirm-delete-dialog')).toBeInTheDocument();
      expect(onDelete).not.toHaveBeenCalled();
    });

    it('confirming delete dialog calls onDelete', async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      renderForm({ onDelete });
      await user.click(screen.getByTestId('sidebar-form-delete-btn'));
      await user.click(screen.getByTestId('confirm-delete-confirm'));
      expect(onDelete).toHaveBeenCalledOnce();
    });

    it('canceling delete dialog does NOT call onDelete', async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      renderForm({ onDelete });
      await user.click(screen.getByTestId('sidebar-form-delete-btn'));
      await user.click(screen.getByTestId('confirm-delete-cancel'));
      expect(onDelete).not.toHaveBeenCalled();
    });
  });

  describe('deselect button', () => {
    it('hides Deselect button when onDeselect not provided', () => {
      renderForm();
      expect(screen.queryByTestId('sidebar-form-deselect-btn')).not.toBeInTheDocument();
    });

    it('shows Deselect button when onDeselect provided', () => {
      renderForm({ onDeselect: vi.fn() });
      expect(screen.getByTestId('sidebar-form-deselect-btn')).toBeInTheDocument();
    });
  });
});

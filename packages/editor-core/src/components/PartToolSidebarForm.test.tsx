import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PartToolSidebarForm, type SidebarFormState } from './PartToolSidebarForm';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
    i18n: { language: 'en' },
  }),
}));

afterEach(cleanup);

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
  it('renders all form fields', () => {
    renderForm({ values: FILLED_FORM });
    expect(screen.getByTestId('sidebar-form-type-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-form-name')).toHaveValue('Bolt M6');
    expect(screen.getByTestId('sidebar-form-label')).toHaveValue('B6');
    expect(screen.getByTestId('sidebar-form-partNumber')).toHaveValue('PN-001');
    expect(screen.getByTestId('sidebar-form-amount')).toHaveValue(3);
    expect(screen.getByTestId('sidebar-form-unit')).toHaveValue('pcs');
    expect(screen.getByTestId('sidebar-form-material')).toHaveValue('Steel');
    expect(screen.getByTestId('sidebar-form-dimension')).toHaveValue('6x20mm');
    expect(screen.getByTestId('sidebar-form-description')).toHaveValue('Hex bolt');
  });

  it('calls onChange when a field is edited', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderForm({ values: EMPTY_FORM, onChange });

    await user.type(screen.getByTestId('sidebar-form-name'), 'A');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'A' }));
  });

  it('toggles type between Part and Tool', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderForm({ values: { ...EMPTY_FORM, type: 'Part' }, onChange });

    await user.click(screen.getByTestId('sidebar-form-type-toggle'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: 'Tool' }));
  });

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

  it('hides Delete button when onDelete not provided', () => {
    renderForm();
    expect(screen.queryByTestId('sidebar-form-delete-btn')).not.toBeInTheDocument();
  });

  it('shows Delete button when onDelete provided', () => {
    renderForm({ onDelete: vi.fn() });
    expect(screen.getByTestId('sidebar-form-delete-btn')).toBeInTheDocument();
  });

  it('calls onDelete when Delete button clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderForm({ onDelete });

    await user.click(screen.getByTestId('sidebar-form-delete-btn'));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('hides Deselect button when onDeselect not provided', () => {
    renderForm();
    expect(screen.queryByTestId('sidebar-form-deselect-btn')).not.toBeInTheDocument();
  });

  it('shows Deselect button when onDeselect provided', () => {
    renderForm({ onDeselect: vi.fn() });
    expect(screen.getByTestId('sidebar-form-deselect-btn')).toBeInTheDocument();
  });

  it('renders visible labels for all fields', () => {
    renderForm({ values: FILLED_FORM });

    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Name *')).toBeInTheDocument();
    expect(screen.getByText('Label')).toBeInTheDocument();
    expect(screen.getByText('Part #')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Unit')).toBeInTheDocument();
    expect(screen.getByText('Material')).toBeInTheDocument();
    expect(screen.getByText('Dimension')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });
});

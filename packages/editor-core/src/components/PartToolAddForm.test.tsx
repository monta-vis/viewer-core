import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PartToolAddForm, type PartToolAddFormValues } from './PartToolAddForm';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock('react-image-crop', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="react-crop">{children}</div>
  ),
}));
vi.mock('react-image-crop/dist/ReactCrop.css', () => ({}));

afterEach(() => {
  cleanup();
});

const defaultValues: PartToolAddFormValues = {
  name: '',
  type: 'Part',
  amount: 1,
  partNumber: '',
};

describe('PartToolAddForm', () => {
  it('renders form fields', () => {
    render(
      <PartToolAddForm
        values={defaultValues}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        canSubmit={false}
      />,
    );
    expect(screen.getByTestId('add-form-name')).toBeInTheDocument();
    expect(screen.getByTestId('add-form-type')).toBeInTheDocument();
    expect(screen.getByTestId('add-form-amount')).toBeInTheDocument();
    expect(screen.getByTestId('add-form-partNumber')).toBeInTheDocument();
    expect(screen.getByTestId('add-form-submit')).toBeInTheDocument();
  });

  it('shows icon preview when previewUrl provided', () => {
    render(
      <PartToolAddForm
        values={defaultValues}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        canSubmit={false}
        previewUrl="http://example.com/icon.png"
      />,
    );
    const img = screen.getByTestId('add-form-preview');
    expect(img).toHaveAttribute('src', 'http://example.com/icon.png');
  });

  it('submit button disabled when canSubmit is false', () => {
    render(
      <PartToolAddForm
        values={defaultValues}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        canSubmit={false}
      />,
    );
    expect(screen.getByTestId('add-form-submit')).toBeDisabled();
  });

  it('submit button enabled when canSubmit is true', () => {
    render(
      <PartToolAddForm
        values={{ ...defaultValues, name: 'Bolt' }}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        canSubmit={true}
      />,
    );
    expect(screen.getByTestId('add-form-submit')).not.toBeDisabled();
  });

  it('calls onSubmit when submit clicked', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <PartToolAddForm
        values={{ ...defaultValues, name: 'Bolt' }}
        onChange={vi.fn()}
        onSubmit={onSubmit}
        canSubmit={true}
      />,
    );

    await user.click(screen.getByTestId('add-form-submit'));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('calls onChange when name is typed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PartToolAddForm
        values={defaultValues}
        onChange={onChange}
        onSubmit={vi.fn()}
        canSubmit={false}
      />,
    );

    const nameInput = screen.getByTestId('add-form-name');
    await user.type(nameInput, 'B');
    expect(onChange).toHaveBeenCalled();
  });
});

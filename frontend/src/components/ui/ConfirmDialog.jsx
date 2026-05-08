import Button from './Button';

export default function ConfirmDialog({ isOpen, onConfirm, onCancel, message, title = 'Konfirmasi' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>Batal</Button>
          <Button variant="danger" onClick={onConfirm}>Ya, Lanjutkan</Button>
        </div>
      </div>
    </div>
  );
}

import { useRef, useState } from 'react';
import { usersApi } from '../../api/users';
import { resizeImageToSquareDataUrl } from '../../lib/resizeImage';
import { Avatar } from './Avatar';
import { Button } from './Button';

/**
 * Profile photo picker.
 *
 * The file is resized and cropped in the browser before it is sent, so a multi-megabyte camera
 * photo becomes a ~25 KB square. The preview swaps in immediately on success rather than waiting
 * for a page refresh, because an upload that appears to do nothing reads as a failure.
 */
export function AvatarUpload({ user, onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    // Reset the input so picking the same file twice still fires a change event.
    event.target.value = '';
    if (!file) return;

    setError(null);
    setBusy(true);
    try {
      const dataUrl = await resizeImageToSquareDataUrl(file);
      const { user: updated } = await usersApi.uploadPhoto(dataUrl);
      onChange(updated);
    } catch (cause) {
      setError(cause.message ?? 'That photo could not be uploaded');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setBusy(true);
    try {
      const { user: updated } = await usersApi.removePhoto();
      onChange(updated);
    } catch (cause) {
      setError(cause.message ?? 'That photo could not be removed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="block pl-1 text-[13px] font-semibold text-label-secondary">
        Profile photo
      </span>

      <div className="mt-2 flex flex-wrap items-center gap-4">
        <Avatar name={user?.name} id={user?.id} photoUrl={user?.photoUrl} size="md" />

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
          className="sr-only"
          aria-label="Choose a profile photo"
        />

        <Button variant="secondary" loading={busy} onClick={() => inputRef.current?.click()}>
          {user?.photoUrl ? 'Change photo' : 'Upload photo'}
        </Button>

        {user?.photoUrl && (
          <Button variant="plain" size="sm" disabled={busy} onClick={handleRemove}>
            Remove
          </Button>
        )}
      </div>

      {error ? (
        <p className="mt-2 pl-1 text-[13px] font-medium text-danger-text">{error}</p>
      ) : (
        <p className="mt-2 pl-1 text-[13px] text-label-secondary">
          Square crop, resized in your browser before upload. JPEG, PNG or WebP.
        </p>
      )}
    </div>
  );
}

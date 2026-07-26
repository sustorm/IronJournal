import { useEffect } from 'react';

// Pure CSS (touch-action/overscroll-behavior) isn't reliably enough on iOS
// Safari to stop a scroll gesture over a modal's backdrop from falling
// through to the page behind it. Pinning the body via position:fixed while
// preserving its scroll offset is the standard, actually-reliable fix.
// Reference-counted (via module-level state) so multiple modals mounted at
// once can each call this without stepping on each other's lock/unlock.
let lockCount = 0;
let savedScrollY = 0;

function lockBody() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
  }
  lockCount++;
}

function unlockBody() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    window.scrollTo(0, savedScrollY);
  }
}

export function useBodyScrollLock(isOpen) {
  useEffect(() => {
    if (!isOpen) return;
    lockBody();
    return unlockBody;
  }, [isOpen]);
}

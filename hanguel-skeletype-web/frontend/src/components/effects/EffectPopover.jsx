import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function EffectPopover({ children, onClose }) {
  const anchorRef = useRef(null);
  const popoverRef = useRef(null);
  const [pos, setPos] = useState(null);

  // Position the popover above the parent button using a portal
  useEffect(() => {
    const anchor = anchorRef.current;
    const parent = anchor?.closest('[data-fx-button]') || anchor?.parentElement;
    if (!parent) return;

    function updatePos() {
      const rect = parent.getBoundingClientRect();
      setPos({
        bottom: window.innerHeight - rect.top + 12,
        left: rect.left + rect.width / 2,
      });
    }

    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, []);

  // Click outside to close (check both anchor parent and portal content)
  useEffect(() => {
    function handleClick(e) {
      const inPopover = popoverRef.current?.contains(e.target);
      const inAnchorParent = anchorRef.current?.parentElement?.contains(e.target);
      if (!inPopover && !inAnchorParent) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <>
      <span ref={anchorRef} className="absolute w-0 h-0 overflow-hidden" />
      {pos && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            bottom: pos.bottom,
            left: pos.left,
            transform: 'translateX(-50%)',
            zIndex: 9999,
          }}
          className="bg-gray-800/95 backdrop-blur-md rounded-2xl px-5 py-4 shadow-xl min-w-[280px] pointer-events-auto"
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
}

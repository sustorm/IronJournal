import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

const Toast = forwardRef(function Toast(_, ref) {
  const [msg, setMsg] = useState('');
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    show(message) {
      clearTimeout(timerRef.current);
      setMsg(message);
      setVisible(true);
      timerRef.current = setTimeout(() => setVisible(false), 2500);
    },
  }));

  return (
    <div className={`toast${visible ? ' show' : ''}`}>{msg}</div>
  );
});

export default Toast;

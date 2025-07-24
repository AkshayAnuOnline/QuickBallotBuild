import React, { useState, useRef, useEffect } from 'react';

interface VoterIdInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}

const VoterIdInput: React.FC<VoterIdInputProps> = ({
  value,
  onChange,
  disabled = false,
  className = "",
  autoFocus = false
}) => {
  const [fields, setFields] = useState(['', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize fields from value prop
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      setFields([
        parts[0] || '',
        parts[1] || '',
        parts[2] || ''
      ]);
    } else {
      setFields(['', '', '']);
    }
  }, [value]);

  // Auto-focus first field if autoFocus is true
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      // Use a small delay to ensure the component is fully rendered
      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // Also focus when component mounts if autoFocus is true
  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleFieldChange = (index: number, newValue: string) => {
    // Validate input based on field type
    let validatedValue = newValue;
    if (index < 2) {
      // First two fields: only letters, uppercase
      validatedValue = newValue.replace(/[^A-Za-z]/g, '').toUpperCase();
    } else {
      // Third field: only numbers
      validatedValue = newValue.replace(/[^0-9]/g, '');
    }

    // Limit to 4 characters
    if (validatedValue.length > 4) {
      validatedValue = validatedValue.substring(0, 4);
    }

    const newFields = [...fields];
    newFields[index] = validatedValue;
    setFields(newFields);

    // Combine into full voter ID
    const fullVoterId = newFields.join('-');
    onChange(fullVoterId);

    // Auto-advance to next field if current field is filled
    if (validatedValue.length === 4 && index < 2 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace to go to previous field
    if (e.key === 'Backspace' && fields[index] === '' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }
    
    // Handle arrow keys for navigation
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 2) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').replace(/[^A-Za-z0-9-]/g, '');
    const parts = pastedText.split('-');
    
    if (parts.length === 3) {
      const newFields = [
        parts[0].substring(0, 4).toUpperCase(),
        parts[1].substring(0, 4).toUpperCase(),
        parts[2].substring(0, 4)
      ];
      setFields(newFields);
      onChange(newFields.join('-'));
      
      // Focus the appropriate field
      const totalLength = newFields.join('').length;
      if (totalLength <= 4) {
        inputRefs.current[0]?.focus();
      } else if (totalLength <= 8) {
        inputRefs.current[1]?.focus();
      } else {
        inputRefs.current[2]?.focus();
      }
    }
  };

  return (
    <div className={`voter-id-input ${className}`} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <input
        ref={(el) => { inputRefs.current[0] = el; }}
        type="text"
        value={fields[0]}
        onChange={(e) => handleFieldChange(0, e.target.value)}
        onKeyDown={(e) => handleKeyDown(0, e)}
        onPaste={handlePaste}
        placeholder="XXXX"
        disabled={disabled}
        maxLength={4}
        style={{
          width: '80px',
          height: '48px',
          textAlign: 'center',
          fontSize: '18px',
          fontWeight: '600',
          border: '2px solid #31334a',
          borderRadius: '10px',
          background: '#232427',
          color: '#fff',
          padding: '0 12px',
          fontFamily: 'monospace',
          letterSpacing: '1px'
        }}
      />
      <span style={{ color: '#fff', fontSize: '18px', fontWeight: '600' }}>-</span>
      <input
        ref={(el) => { inputRefs.current[1] = el; }}
        type="text"
        value={fields[1]}
        onChange={(e) => handleFieldChange(1, e.target.value)}
        onKeyDown={(e) => handleKeyDown(1, e)}
        onPaste={handlePaste}
        placeholder="XXXX"
        disabled={disabled}
        maxLength={4}
        style={{
          width: '80px',
          height: '48px',
          textAlign: 'center',
          fontSize: '18px',
          fontWeight: '600',
          border: '2px solid #31334a',
          borderRadius: '10px',
          background: '#232427',
          color: '#fff',
          padding: '0 12px',
          fontFamily: 'monospace',
          letterSpacing: '1px'
        }}
      />
      <span style={{ color: '#fff', fontSize: '18px', fontWeight: '600' }}>-</span>
      <input
        ref={(el) => { inputRefs.current[2] = el; }}
        type="text"
        value={fields[2]}
        onChange={(e) => handleFieldChange(2, e.target.value)}
        onKeyDown={(e) => handleKeyDown(2, e)}
        onPaste={handlePaste}
        placeholder="XXXX"
        disabled={disabled}
        maxLength={4}
        style={{
          width: '80px',
          height: '48px',
          textAlign: 'center',
          fontSize: '18px',
          fontWeight: '600',
          border: '2px solid #31334a',
          borderRadius: '10px',
          background: '#232427',
          color: '#fff',
          padding: '0 12px',
          fontFamily: 'monospace',
          letterSpacing: '1px'
        }}
      />
    </div>
  );
};

export default VoterIdInput; 
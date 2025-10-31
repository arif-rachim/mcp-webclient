/**
 * Elicitation Prompt Component
 * Dynamic form for MCP server elicitation requests
 * Supports string, number, integer, boolean, and enum fields with real-time validation
 */

'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { ElicitationRequest, ElicitationResponse, ElicitationFieldSchema } from '@/lib/mcp/types';

interface ElicitationPromptProps {
  request: ElicitationRequest;
  onResponse: (response: ElicitationResponse) => void;
}

export function ElicitationPrompt({ request, onResponse }: ElicitationPromptProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Validate a single field
  const validateField = useCallback((name: string, value: any, schema: ElicitationFieldSchema): string | null => {
    // Check required fields
    if (request.schema.required?.includes(name)) {
      if (value === undefined || value === null || value === '') {
        return 'This field is required';
      }
    }

    // Type-specific validation
    if (schema.type === 'string') {
      const stringValue = String(value || '');

      if (schema.minLength && stringValue.length < schema.minLength) {
        return `Minimum length is ${schema.minLength}`;
      }

      if (schema.maxLength && stringValue.length > schema.maxLength) {
        return `Maximum length is ${schema.maxLength}`;
      }

      if (schema.format) {
        switch (schema.format) {
          case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (stringValue && !emailRegex.test(stringValue)) {
              return 'Invalid email format';
            }
            break;
          case 'uri':
            try {
              if (stringValue) new URL(stringValue);
            } catch {
              return 'Invalid URL format';
            }
            break;
        }
      }
    }

    if (schema.type === 'number' || schema.type === 'integer') {
      const numValue = Number(value);

      if (value !== '' && isNaN(numValue)) {
        return 'Must be a valid number';
      }

      if (schema.type === 'integer' && value !== '' && !Number.isInteger(numValue)) {
        return 'Must be an integer';
      }

      if (schema.minimum !== undefined && numValue < schema.minimum) {
        return `Minimum value is ${schema.minimum}`;
      }

      if (schema.maximum !== undefined && numValue > schema.maximum) {
        return `Maximum value is ${schema.maximum}`;
      }
    }

    return null;
  }, [request.schema.required]);

  // Handle field change with real-time validation
  const handleFieldChange = useCallback((name: string, value: any, schema: ElicitationFieldSchema) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));

    // Real-time validation
    const error = validateField(name, value, schema);
    setErrors((prev) => ({
      ...prev,
      [name]: error || '',
    }));
  }, [validateField]);

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    Object.entries(request.schema.properties).forEach(([name, schema]) => {
      const error = validateField(name, formData[name], schema);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [formData, request.schema.properties, validateField]);

  // Handle accept
  const handleAccept = useCallback(() => {
    if (validateAll()) {
      onResponse({
        action: 'accept',
        content: formData,
      });
    } else {
      // Mark all fields as touched to show errors
      const allTouched: Record<string, boolean> = {};
      Object.keys(request.schema.properties).forEach((name) => {
        allTouched[name] = true;
      });
      setTouched(allTouched);
    }
  }, [formData, onResponse, request.schema.properties, validateAll]);

  // Handle decline/cancel
  const handleDecline = useCallback(() => {
    onResponse({ action: 'decline' });
  }, [onResponse]);

  const handleCancel = useCallback(() => {
    onResponse({ action: 'cancel' });
  }, [onResponse]);

  // Render field based on schema type
  const renderField = (name: string, schema: ElicitationFieldSchema) => {
    const value = formData[name];
    const error = touched[name] ? errors[name] : '';
    const isRequired = request.schema.required?.includes(name);

    // Enum field (dropdown)
    if ('enum' in schema && schema.enum) {
      return (
        <div key={name} className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            {schema.title || name}
            {isRequired && <span className="ml-1" style={{ color: '#DC2626' }}>*</span>}
          </label>
          {schema.description && (
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{schema.description}</p>
          )}
          <select
            value={value || ''}
            onChange={(e) => handleFieldChange(name, e.target.value, schema)}
            className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:outline-none"
            style={{
              backgroundColor: 'var(--card-background)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: error ? '#DC2626' : 'var(--border-color)',
              color: 'var(--foreground)',
            }}
          >
            <option value="">Select an option</option>
            {schema.enum.map((option, index) => (
              <option key={option} value={option}>
                {schema.enumNames?.[index] || option}
              </option>
            ))}
          </select>
          {error && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{error}</p>}
        </div>
      );
    }

    // Boolean field (checkbox)
    if (schema.type === 'boolean') {
      return (
        <div key={name} className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleFieldChange(name, e.target.checked, schema)}
              className="w-4 h-4 rounded focus:ring-2"
              style={{ accentColor: 'var(--accent-orange)' }}
            />
            <span className="ml-2 text-sm font-medium" style={{ color: 'var(--foreground)' }}>
              {schema.title || name}
              {isRequired && <span className="ml-1" style={{ color: '#DC2626' }}>*</span>}
            </span>
          </label>
          {schema.description && (
            <p className="text-xs ml-6 mt-1" style={{ color: 'var(--text-secondary)' }}>{schema.description}</p>
          )}
          {error && <p className="text-xs ml-6 mt-1" style={{ color: '#DC2626' }}>{error}</p>}
        </div>
      );
    }

    // Number/Integer field
    if (schema.type === 'number' || schema.type === 'integer') {
      return (
        <div key={name} className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            {schema.title || name}
            {isRequired && <span className="ml-1" style={{ color: '#DC2626' }}>*</span>}
          </label>
          {schema.description && (
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{schema.description}</p>
          )}
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => handleFieldChange(name, e.target.value, schema)}
            min={schema.minimum}
            max={schema.maximum}
            step={schema.type === 'integer' ? 1 : 'any'}
            className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:outline-none"
            style={{
              backgroundColor: 'var(--card-background)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: error ? '#DC2626' : 'var(--border-color)',
              color: 'var(--foreground)',
            }}
            placeholder={schema.description}
          />
          {error && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{error}</p>}
        </div>
      );
    }

    // String field (text input)
    return (
      <div key={name} className="mb-4">
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
          {schema.title || name}
          {isRequired && <span className="ml-1" style={{ color: '#DC2626' }}>*</span>}
        </label>
        {schema.description && (
          <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{schema.description}</p>
        )}
        <input
          type={schema.format === 'email' ? 'email' : schema.format === 'uri' ? 'url' : 'text'}
          value={value || ''}
          onChange={(e) => handleFieldChange(name, e.target.value, schema)}
          minLength={schema.minLength}
          maxLength={schema.maxLength}
          className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:outline-none"
          style={{
            backgroundColor: 'var(--card-background)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: error ? '#DC2626' : 'var(--border-color)',
            color: 'var(--foreground)',
          }}
          placeholder={schema.description}
        />
        {error && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{error}</p>}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg p-4 my-3"
      style={{ backgroundColor: 'var(--code-background)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border-color)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🔔</span>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Server Requesting Input</h3>
      </div>

      {/* Message */}
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{request.message}</p>

      {/* Dynamic form fields */}
      <div className="space-y-3">
        {Object.entries(request.schema.properties).map(([name, schema]) =>
          renderField(name, schema)
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleAccept}
          className="flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium text-sm"
          style={{ backgroundColor: 'var(--accent-orange)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-orange-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-orange)'}
        >
          Accept
        </button>
        <button
          onClick={handleDecline}
          className="px-4 py-2 rounded-lg transition-colors font-medium text-sm"
          style={{ backgroundColor: 'transparent', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--code-background)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          Decline
        </button>
        <button
          onClick={handleCancel}
          className="px-4 py-2 rounded-lg transition-colors font-medium text-sm"
          style={{ backgroundColor: 'transparent', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--code-background)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

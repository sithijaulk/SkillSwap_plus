import React from 'react';

const Input = ({ label, name, type = 'text', value, onChange, ...props }) => {
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium mb-1">
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
        {...props}
      />
    </div>
  );
};

export default Input;

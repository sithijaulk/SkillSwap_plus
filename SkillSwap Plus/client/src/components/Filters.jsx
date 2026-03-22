import React from 'react';

const Filters = ({ categories = [], levels = [], onChange, values }) => {
  return (
    <div className="flex flex-col md:flex-row gap-2 md:items-center">
      <input
        type="text"
        placeholder="Search skills or mentor"
        value={values.search || ''}
        onChange={(e) => onChange({ ...values, search: e.target.value })}
        className="px-3 py-2 border rounded w-full md:w-1/2"
      />

      <select
        value={values.category || ''}
        onChange={(e) => onChange({ ...values, category: e.target.value })}
        className="px-3 py-2 border rounded"
      >
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <select
        value={values.level || ''}
        onChange={(e) => onChange({ ...values, level: e.target.value })}
        className="px-3 py-2 border rounded"
      >
        <option value="">All Levels</option>
        {levels.map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>
    </div>
  );
};

export default Filters;

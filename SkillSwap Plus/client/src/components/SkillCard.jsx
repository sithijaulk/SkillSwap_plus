import React from 'react';

const SkillCard = ({ skill }) => {
  return (
    <div className="bg-white border rounded p-4 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">{skill.name}</h3>
          <div className="text-sm text-gray-500">{skill.category} • {skill.level}</div>
        </div>
        <div className="text-sm text-gray-400">{skill.hourlyRate ? `$${skill.hourlyRate}/hr` : ''}</div>
      </div>

      <p className="text-sm text-gray-700 mt-2 line-clamp-2">{skill.description}</p>

      <div className="flex flex-wrap gap-2 mt-3">
        {(skill.tags || []).slice(0, 5).map((t) => (
          <span key={t} className="text-xs bg-gray-100 px-2 py-1 rounded">{t}</span>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">{(skill.mentor.name || 'M').charAt(0)}</div>
          <div>
            <div className="text-sm font-medium">{skill.mentor.name}</div>
            <div className="text-xs text-gray-500">{skill.mentor.ratingAvg || 0} ★ • {skill.mentor.totalReviews || 0} reviews</div>
          </div>
        </div>

        <div>
          <button onClick={() => onViewMentor && onViewMentor(skill.mentor)} className="px-3 py-1 bg-blue-600 text-white rounded">View Mentor</button>
        </div>
      </div>
    </div>
  );
};

export default SkillCard;

import React from 'react';

const MentorModal = ({ mentor, onClose }) => {
  if (!mentor) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
      <div className="bg-white rounded shadow p-4 w-full max-w-md">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xl">{(mentor.name || 'M').charAt(0)}</div>
          <div>
            <h3 className="text-lg font-semibold">{mentor.name}</h3>
            <div className="text-sm text-gray-600">{mentor.ratingAvg || 0} ★ • {mentor.totalReviews || 0} reviews</div>
          </div>
        </div>

        {mentor.profileImage && <img src={mentor.profileImage} alt="profile" className="w-24 h-24 object-cover rounded mt-3" />}

        <div className="mt-3">
          <p className="text-sm text-gray-700">More details about the mentor can go here.</p>
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-3 py-2 border rounded">Close</button>
        </div>
      </div>
    </div>
  );
};

export default MentorModal;

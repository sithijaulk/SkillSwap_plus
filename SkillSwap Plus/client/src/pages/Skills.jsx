import React, { useEffect, useState } from 'react';
import SkillCard from '../components/SkillCard';
import MentorModal from '../components/MentorModal';
import Filters from '../components/Filters';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { fetchPublicSkills } from '../services/skillsApi';

const SkillsPage = () => {
  const [filters, setFilters] = useState({ search: '', category: '', level: '' });
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);

  const categories = ['Web Development', 'Programming', 'Data Science', 'Design', 'General'];
  const levels = ['Beginner', 'Intermediate', 'Advanced'];



  useEffect(() => {
    const t = setTimeout(() => {
      (async () => {
        setLoading(true);
        try {
          const res = await fetchPublicSkills({ search: filters.search, category: filters.category, level: filters.level });
          setSkills(res.data.data || []);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      })();
    }, 300);
    return () => clearTimeout(t);
  }, [filters]);

  const [selectedMentor, setSelectedMentor] = useState(null);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Skills</h1>

      <Filters categories={categories} levels={levels} values={filters} onChange={setFilters} />

      <div className="mt-6">
        {loading ? (
          <LoadingSkeleton rows={6} />
        ) : skills.length === 0 ? (
          <div className="text-center text-gray-500 py-12">No skills found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map((s) => (
              <SkillCard key={s.skillId} skill={s} onViewMentor={(m) => setSelectedMentor(m)} />
            ))}
          </div>
        )}
      </div>

      {selectedMentor && <MentorModal mentor={selectedMentor} onClose={() => setSelectedMentor(null)} />}
    </div>
  );
};

export default SkillsPage;

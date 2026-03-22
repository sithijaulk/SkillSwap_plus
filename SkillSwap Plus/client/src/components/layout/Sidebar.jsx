import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const Sidebar = ({ menuItems }) => {
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const activeTab = searchParams.get('tab');

    return (
        <aside className="w-72 fixed left-0 top-0 bottom-0 pt-32 pb-10 px-6 border-r border-white/5 z-40 hidden lg:block">
            <div className="flex flex-col h-full">
                <div className="space-y-2 flex-grow">
                    {menuItems.map((item, idx) => {
                        const isTabActive = item.tab ? activeTab === item.tab : (!activeTab && location.pathname === item.path);
                        
                        return (
                            <NavLink
                                key={idx}
                                to={item.tab ? `${item.path}?tab=${item.tab}` : item.path}
                                className={`flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${isTabActive
                                    ? 'premium-gradient text-white shadow-lg shadow-indigo-500/20 font-bold'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
                                }`}
                            >
                                <div className="transition-transform group-hover:scale-110">
                                    {item.icon}
                                </div>
                                <span className="text-sm">{item.label}</span>
                            </NavLink>
                        );
                    })}
                </div>

                <div className="mt-auto pt-6 border-t border-white/5">
                    <div className="glass-morphism rounded-3xl p-4">
                        <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 rounded-full premium-gradient opacity-20 flex items-center justify-center text-indigo-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Support Hub</p>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium mb-3">Found an issue? Report it to the admin team immediately.</p>
                        <button className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all text-white">
                            Open Support Ticket
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;

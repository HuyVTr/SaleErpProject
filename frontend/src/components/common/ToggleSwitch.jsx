import React from 'react';

const ToggleSwitch = ({ isOn, onChange, label, disabled = false }) => {
  return (
    <label className={`flex items-center gap-3 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer group'}`}>
      <div
        onClick={() => !disabled && onChange(!isOn)}
        className={`relative w-11 h-6 rounded-full transition-all duration-300 ease-in-out ${
          isOn ? 'bg-[#00288E]' : 'bg-slate-200'
        } outline-none focus-visible:ring-2 focus-visible:ring-[#00288E] focus-visible:ring-offset-2`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ease-in-out transform ${
            isOn ? 'translate-x-5' : 'translate-x-0'
          } group-active:scale-90`}
        />
      </div>
      {label && <span className="text-xs font-semibold text-slate-700 tracking-wide">{label}</span>}
    </label>
  );
};

export default ToggleSwitch;

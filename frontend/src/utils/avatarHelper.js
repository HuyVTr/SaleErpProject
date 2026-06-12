export const getInitials = (firstName, lastName) => {
  const f = firstName ? firstName.trim().charAt(0) : '';
  const l = lastName ? lastName.trim().charAt(0) : '';
  return `${l}${f}`.toUpperCase() || 'U';
};

export const getAvatarGradient = (firstName, lastName) => {
  const fullName = `${lastName || ''} ${firstName || ''}`.trim();
  if (!fullName) return 'from-slate-500 to-slate-600 text-white';
  
  let hash = 0;
  for (let i = 0; i < fullName.length; i++) {
    hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % 7;
  
  const gradients = [
    'from-indigo-500 to-blue-600 text-white',
    'from-emerald-500 to-teal-600 text-white',
    'from-rose-500 to-red-600 text-white',
    'from-amber-500 to-orange-600 text-white',
    'from-purple-500 to-pink-600 text-white',
    'from-violet-500 to-fuchsia-600 text-white',
    'from-cyan-500 to-blue-600 text-white'
  ];
  
  return gradients[index];
};

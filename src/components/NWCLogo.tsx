import React from 'react';

interface NWCLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const NWCLogo: React.FC<NWCLogoProps> = ({ className = '', size = 'md' }) => {
  const dimensions = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  };

  return (
    <div 
      id="nwc-app-logo-vector" 
      className={`${dimensions[size]} relative flex items-center justify-center bg-transparent ${className}`}
    >
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
      >
        {/* Background Sphere Circle */}
        <circle cx="60" cy="50" r="45" fill="url(#nwcGlow)" opacity="0.15" />

        {/* Outer Circular/Spherical Boundary of the NWC Crescent Moon Ring */}
        <path
          d="M 60,5 A 45,45 0 0,1 105,50 A 45,45 0 0,1 60,95 A 45,45 0 0,1 15,50 A 45,45 0 0,1 60,5 Z"
          fill="url(#skyBlueGrad)"
        />

        {/* White core that creates the negative space curved crescent */}
        <path
          d="M 72,12 A 38,38 0 0,1 102,50 A 38,38 0 0,1 64,88 C 88,86 100,70 98,50 C 96,30 84,16 72,12 Z"
          fill="#FFFFFF"
        />

        {/* Elegant Deep Ocean Blue Crescent Sweep */}
        <path
          d="M 28,24 C 18,36 14,54 22,70 C 28,82 40,90 54,92 C 40,84 32,70 34,52 C 36,36 46,26 58,22 C 46,18 36,18 28,24 Z"
          fill="url(#deepOceanGrad)"
        />

        {/* Teal Wave Transition Ribbon */}
        <path
          d="M 38,30 C 32,40 30,52 35,64 C 39,72 48,78 58,78 C 48,72 42,62 43,48 C 44,36 50,30 58,26 C 50,24 43,25 38,30 Z"
          fill="url(#tealGrad)"
          opacity="0.9"
        />

        {/* Central Pure White light reflection */}
        <ellipse cx="68" cy="40" rx="8" ry="12" fill="#FFFFFF" opacity="0.25" transform="rotate(-15 68 40)" />

        {/* Stylized "nwc" custom text paths at the bottom */}
        <g transform="translate(15, 96)" className="fill-blue-700">
          {/* n */}
          <path d="M 12,12 L 12,4 C 12,2.5 13,1.5 14.5,1.5 C 16,1.5 17,2.5 17,4 L 17,12 L 19.5,12 L 19.5,4 C 19.5,1.2 17.5,-0.5 14.5,-0.5 C 12.5,-0.5 11,0.5 10,2 C 9.5,0.8 8.2,-0.5 6,-0.5 C 3.5,-0.5 1.5,1.2 1.5,4 L 1.5,12 L 4,12 L 4,4 C 4,2.5 5,1.5 6.5,1.5 C 8,1.5 9,2.5 9,4 L 9,12 L 12,12 Z" fill="#0070CD" />
          {/* w */}
          <path d="M 23,0 L 25.5,0 L 27.5,8 L 29.5,0 L 32,0 L 34,8 L 36,0 L 38.5,0 L 35,12 L 32.5,12 L 30.7,5 L 29,12 L 26.5,12 L 23,0 Z" fill="#0070CD" />
          {/* c */}
          <path d="M 49,2 C 47.5,0.4 45.5,-0.5 43,-0.5 C 39,-0.5 36.5,2.5 36.5,6 C 36.5,9.5 39,12.5 43,12.5 C 46,12.5 47.8,11.2 49,10 L 47.2,8.5 C 46.2,9.3 45,10.2 43,10.2 C 40.5,10.2 39.2,8.2 39.2,6 C 39.2,3.8 40.5,1.8 43,1.8 C 45,1.8 46.2,2.7 47.2,3.5 L 49,2 Z" fill="#0070CD" />
          
          {/* Custom Arabic stylized water ripple accent dot */}
          <circle cx="58" cy="6" r="2.5" fill="#0EA5E9" />
          <path d="M 64,12 C 67,12 69,10 69,7 L 69,3 C 69,1 67.5,-0.5 65,-0.5 C 62.5,-0.5 61,1 61,3 L 61,7 C 61,10 63,12 64,12 Z M 63.5,3 C 63.5,2 64,1.5 64.8,1.5 C 65.6,1.5 66.2,2 66.2,3 L 66.2,7 C 66.2,8 65.6,9.2 64.8,9.2 C 64,9.2 63.5,8 63.5,7 L 63.5,3 Z" fill="#0070CD" />
          <path d="M 73,12 C 76,12 78,10 78,7 L 78,1 L 80.5,1 L 80.5,7 C 80.5,11.5 77,13.5 73,13.5 C 69.5,13.5 67,11.5 67,8 L 69.5,8 C 69.5,10.2 71,11.8 73,11.8 Z" fill="#0EA5E9" />
        </g>

        {/* Radial and Linear Gradients to matches the brand's premium identity */}
        <defs>
          <radialGradient id="nwcGlow" cx="60" cy="50" r="45" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="skyBlueGrad" x1="15" y1="50" x2="105" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E0F2FE" />
            <stop offset="40%" stopColor="#BAE6FD" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
          <linearGradient id="deepOceanGrad" x1="15" y1="20" x2="60" y2="92" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0284C7" />
            <stop offset="40%" stopColor="#0369A1" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>
          <linearGradient id="tealGrad" x1="30" y1="20" x2="60" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2DD4BF" />
            <stop offset="50%" stopColor="#0D9488" />
            <stop offset="100%" stopColor="#0F766E" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

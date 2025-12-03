import React from 'react';
import { CompanyId } from '../types';

interface CompanyLogoProps {
  companyId: CompanyId;
  className?: string;
}

const CompanyLogo: React.FC<CompanyLogoProps> = ({ companyId, className = "w-6 h-6" }) => {
  const props = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    xmlns: "http://www.w3.org/2000/svg"
  };

  switch (companyId) {
    case CompanyId.HuangShan: // HuangShan Paper - Mountains
      return (
        <svg {...props}>
          <path d="M8 3l4 8 5-5 5 15H2L8 3z" />
          <path d="M12 11l2 3" />
          <path d="M4.5 13.5l2-2" />
        </svg>
      );
    case CompanyId.BlueSky: // BlueSky Textile - Stylized Cloud/Fabric
      return (
        <svg {...props}>
          <path d="M17.5 19c0-1.7-1.3-3-3-3h-11a3 3 0 0 1 0-6h.5A5.5 5.5 0 0 1 14 5.5a6 6 0 0 1 5 4.5" />
          <path d="M4 14h15" />
          <path d="M7 19h10" />
        </svg>
      );
    case CompanyId.ChaoYang: // ChaoYang Hardware - Gear with Rising Sun
      return (
        <svg {...props}>
           <path d="M12 2v2" />
           <path d="M12 20v2" />
           <path d="M4.93 4.93l1.41 1.41" />
           <path d="M17.66 17.66l1.41 1.41" />
           <path d="M2 12h2" />
           <path d="M20 12h2" />
           <path d="M4.93 19.07l1.41-1.41" />
           <path d="M17.66 6.34l1.41-1.41" />
           <circle cx="12" cy="12" r="4" />
           <circle cx="12" cy="12" r="1.5" strokeWidth="3" />
        </svg>
      );
    case CompanyId.RedFlag: // RedFlag Shipbuilding - Anchor
      return (
        <svg {...props}>
          <circle cx="12" cy="5" r="3" />
          <line x1="12" y1="22" x2="12" y2="8" />
          <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
        </svg>
      );
    case CompanyId.ZiJin: // ZiJin Instruments - Precision Gauge
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 12l4-3" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
          <path d="M12 3v2" />
          <path d="M12 19v2" />
          <path d="M3 12h2" />
          <path d="M19 12h2" />
        </svg>
      );
    case CompanyId.Nuclear: // Nuclear Heavy Industries - Turbine/Atom
      return (
        <svg {...props}>
          <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
          <path d="M12 2v4" />
          <path d="M12 18v4" />
          <path d="M4.93 4.93l2.83 2.83" />
          <path d="M16.24 16.24l2.83 2.83" />
          <path d="M2 12h4" />
          <path d="M18 12h4" />
          <path d="M4.93 19.07l2.83-2.83" />
          <path d="M16.24 7.76l2.83-2.83" />
        </svg>
      );
    case CompanyId.Oak: // Oak Daily Chemicals - Flask
       return (
        <svg {...props}>
          <path d="M10 2v7.31" />
          <path d="M14 2v7.31" />
          <path d="M8.5 2h7" />
          <path d="M14 9.3a6.5 6.5 0 1 1-4 0" />
          <path d="M11 14h2" />
          <path d="M12 14v3" />
        </svg>
      );
    default:
      return null;
  }
}

export default CompanyLogo;
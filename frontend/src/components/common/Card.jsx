import React from "react";

export default function Card({
  children,
  className = "",
  hoverable = false,
  padding = "md",
  onClick,
}) {
  const paddingStyles = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-2xl border border-slate-200/80 shadow-sm
        ${hoverable ? "hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer" : ""}
        ${paddingStyles[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

import React, { useState } from 'react'

export default function ToggleSwitch({
  customclassName,
  checked,
  onChange,
  defaultValue = false,
  onToggle
}) {
  const [enabled, setEnabled] = useState(defaultValue)

  const handleToggle = () => {
    const newState = !enabled
    setEnabled(newState)
    if (onToggle) onToggle(newState)
  }

  return (
    <div className="flex items-center space-x-4">
      <div
        onClick={handleToggle}
        className={`relative w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer 
                   transition-colors duration-300 ease-in-out
                   ${enabled ? '' : 'bg-[#E5E5E5]'} 
                   ${customclassName}`}
        style={enabled ? {
          backgroundColor: 'var(--brand-primary-color-light, rgba(1, 126, 189, 0.2))'
        } : {}}>
        <div
          style={enabled ? {
            backgroundColor: 'var(--brand-primary-color, #017ebd)'
          } : {}}
          className={`${
            enabled ? '' : 'bg-[#979797]'
          } w-3.5 h-3.5 rounded-full shadow-md transform duration-300 ease-in-out ${
            enabled ? 'ltr:translate-x-5 rtl:-translate-x-5' : ''
          }`}></div>
      </div>
    </div>
  )
}

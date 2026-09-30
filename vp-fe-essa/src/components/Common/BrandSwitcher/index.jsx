/**
 * BrandSwitcher Component
 * 
 * Optional component that provides a UI for switching between brands.
 * This is useful for testing and demonstration purposes.
 * 
 * Usage:
 * import BrandSwitcher from 'components/Common/BrandSwitcher';
 * 
 * <BrandSwitcher />
 */

import React, { useState } from 'react';
import { useBrand } from '../../../contexts/BrandContext';
import { getAvailableBrands } from '../../../config/brandConfig';
import './style.scss';

const BrandSwitcher = ({ className = '' }) => {
  const { brandId, changeBrand } = useBrand();
  const [isOpen, setIsOpen] = useState(false);
  const availableBrands = getAvailableBrands();

  const handleBrandChange = (newBrandId) => {
    changeBrand(newBrandId);
    setIsOpen(false);
  };

  return (
    <div className={`brand-switcher ${className}`}>
      <button 
        className="brand-switcher-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Switch Brand"
      >
        <span className="brand-switcher-label">Brand: {brandId}</span>
        <span className={`brand-switcher-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>
      
      {isOpen && (
        <div className="brand-switcher-dropdown">
          {availableBrands.map((brand) => (
            <button
              key={brand}
              className={`brand-switcher-option ${brand === brandId ? 'active' : ''}`}
              onClick={() => handleBrandChange(brand)}
            >
              {brand.charAt(0).toUpperCase() + brand.slice(1)}
              {brand === brandId && <span className="checkmark">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrandSwitcher;

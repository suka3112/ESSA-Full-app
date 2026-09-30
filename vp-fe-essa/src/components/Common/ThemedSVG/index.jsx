import React from 'react';
import { useBrand } from '../../../contexts/BrandContext';
import PropTypes from 'prop-types';

/**
 * ThemedSVG Component
 * 
 * A wrapper component that applies brand theme colors to SVG icons.
 * Automatically uses the current brand's primary color from BrandContext.
 * 
 * @param {React.Component|string} src - SVG React component or path string
 * @param {string} fill - Override fill color (defaults to brand primary)
 * @param {string} stroke - Override stroke color (defaults to brand primary)
 * @param {string} className - Additional CSS classes
 * @param {object} style - Additional inline styles
 * @param {string} colorType - Which theme color to use: 'primary', 'secondary', 'accent' (default: 'primary')
 * @param {boolean} useThemeColor - Whether to apply theme color (default: true)
 * @param {object} ...props - Other props passed to the SVG component
 */
const ThemedSVG = ({
  src,
  fill,
  stroke,
  className = '',
  style = {},
  colorType = 'primary',
  useThemeColor = true,
  ...props
}) => {
  const { brandConfig } = useBrand();
  
  // Get theme color based on colorType
  const getThemeColor = () => {
    if (!useThemeColor || !brandConfig?.theme) {
      return null;
    }
    
    switch (colorType) {
      case 'secondary':
        return brandConfig.theme.secondary;
      case 'accent':
        return brandConfig.theme.accent;
      case 'primary':
      default:
        return brandConfig.theme.primary;
    }
  };

  const themeColor = getThemeColor();
  const finalFill = fill || (useThemeColor && themeColor ? themeColor : undefined);
  const finalStroke = stroke || (useThemeColor && themeColor ? themeColor : undefined);

  // If src is a React component (from SVGR import)
  if (typeof src === 'function' || (src && src.$$typeof)) {
    const SvgComponent = src;
    // Extract width and height from props and style (props take precedence)
    const { width: propWidth, height: propHeight, ...restProps } = props;
    const { width: styleWidth, height: styleHeight, ...restStyle } = style;
    
    // Use prop width/height first, then style, then undefined (let CSS handle it)
    const width = propWidth ?? (styleWidth ? (typeof styleWidth === 'string' && styleWidth.endsWith('px') 
      ? parseFloat(styleWidth) 
      : styleWidth) : undefined);
    const height = propHeight ?? (styleHeight ? (typeof styleHeight === 'string' && styleHeight.endsWith('px') 
      ? parseFloat(styleHeight) 
      : styleHeight) : undefined);
    
    return (
      <SvgComponent
        className={className}
        width={width}
        height={height}
        style={{
          color: finalFill || finalStroke || undefined,
          ...restStyle,
        }}
        // fill={finalFill || 'currentColor'}
        // stroke={finalStroke || 'currentColor'}
        {...restProps}
      />
    );
  }

  // If src is a string (path to SVG file), we need to load it as a React component
  // This requires importing with ?react suffix: import Icon from './icon.svg?react'
  if (typeof src === 'string') {
    // For string paths, we'll need to use a different approach
    // This would require the SVG to be imported with ?react suffix
    console.warn('ThemedSVG: String paths require importing with ?react suffix. Use: import Icon from "./icon.svg?react"');
    return null;
  }

  // If src is already a rendered element or component
  if (React.isValidElement(src)) {
    return React.cloneElement(src, {
      className: `${className} ${src.props.className || ''}`.trim(),
      style: {
        ...src.props.style,
        color: finalFill || finalStroke || undefined,
        ...style,
      },
      fill: finalFill || src.props.fill,
      stroke: finalStroke || src.props.stroke,
      ...props,
    });
  }

  return null;
};

ThemedSVG.propTypes = {
  src: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.element,
    PropTypes.string,
  ]).isRequired,
  fill: PropTypes.string,
  stroke: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
  colorType: PropTypes.oneOf(['primary', 'secondary', 'accent']),
  useThemeColor: PropTypes.bool,
};

export default ThemedSVG;

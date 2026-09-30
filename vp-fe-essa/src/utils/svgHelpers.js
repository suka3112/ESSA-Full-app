/**
 * SVG Helper Utilities
 * 
 * Utility functions for working with SVG files and dynamic theming
 */

/**
 * Processes SVG string content to replace hardcoded colors with currentColor
 * This allows CSS to control the SVG color
 * 
 * @param {string} svgString - Raw SVG string content
 * @param {string} colorToReplace - Color to replace (e.g., '#2D2C2C')
 * @returns {string} - Modified SVG string
 */
export const replaceSvgColor = (svgString, colorToReplace) => {
  if (!svgString || typeof svgString !== 'string') {
    return svgString;
  }

  // Replace fill colors
  const fillRegex = new RegExp(`fill="${colorToReplace}"`, 'gi');
  const fillRegex2 = new RegExp(`fill='${colorToReplace}'`, 'gi');
  
  // Replace stroke colors
  const strokeRegex = new RegExp(`stroke="${colorToReplace}"`, 'gi');
  const strokeRegex2 = new RegExp(`stroke='${colorToReplace}'`, 'gi');

  let modified = svgString
    .replace(fillRegex, 'fill="currentColor"')
    .replace(fillRegex2, "fill='currentColor'")
    .replace(strokeRegex, 'stroke="currentColor"')
    .replace(strokeRegex2, "stroke='currentColor'");

  return modified;
};

/**
 * Extracts fill and stroke colors from SVG string
 * 
 * @param {string} svgString - Raw SVG string content
 * @returns {object} - Object with fill and stroke colors found
 */
export const extractSvgColors = (svgString) => {
  if (!svgString || typeof svgString !== 'string') {
    return { fill: null, stroke: null };
  }

  const fillMatch = svgString.match(/fill=["']([^"']+)["']/i);
  const strokeMatch = svgString.match(/stroke=["']([^"']+)["']/i);

  return {
    fill: fillMatch ? fillMatch[1] : null,
    stroke: strokeMatch ? strokeMatch[1] : null,
  };
};

/**
 * Checks if SVG uses currentColor (making it themeable)
 * 
 * @param {string} svgString - Raw SVG string content
 * @returns {boolean} - True if SVG uses currentColor
 */
export const isSvgThemeable = (svgString) => {
  if (!svgString || typeof svgString !== 'string') {
    return false;
  }

  const hasCurrentColor = /fill=["']currentColor["']|stroke=["']currentColor["']/i.test(svgString);
  const hasNoFill = !/fill=["'][^"']+["']/i.test(svgString);
  const hasNoStroke = !/stroke=["'][^"']+["']/i.test(svgString);

  return hasCurrentColor || (hasNoFill && hasNoStroke);
};
